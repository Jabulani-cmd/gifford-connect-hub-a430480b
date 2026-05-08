import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Convert a remote file (image/pdf) to a base64 data URI so Gemini can ingest it
async function urlToDataUri(url: string): Promise<{ dataUri: string; mime: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("Could not fetch file", url, res.status);
      return null;
    }
    let mime = res.headers.get("content-type") || "application/octet-stream";
    // Sometimes supabase returns generic content-type, so try inferring from URL
    const lower = url.toLowerCase().split("?")[0];
    if (mime.includes("octet-stream") || mime.includes("binary")) {
      if (lower.endsWith(".pdf")) mime = "application/pdf";
      else if (lower.endsWith(".png")) mime = "image/png";
      else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) mime = "image/jpeg";
      else if (lower.endsWith(".webp")) mime = "image/webp";
      else if (lower.endsWith(".gif")) mime = "image/gif";
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    // Chunked base64 to avoid call-stack limits on large files
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < buf.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + chunkSize)));
    }
    const b64 = btoa(binary);
    return { dataUri: `data:${mime};base64,${b64}`, mime };
  } catch (e) {
    console.warn("urlToDataUri failed", e);
    return null;
  }
}

function buildContentParts(label: string, file: { dataUri: string; mime: string } | null, fallbackUrl?: string | null): any[] {
  const parts: any[] = [{ type: "text", text: `\n\n=== ${label} ===` }];
  if (file) {
    // Gemini via OpenAI-compat accepts images and PDFs via image_url with data URIs
    parts.push({ type: "image_url", image_url: { url: file.dataUri } });
  } else if (fallbackUrl) {
    parts.push({ type: "text", text: `(Could not load file. Reference URL: ${fallbackUrl})` });
  } else {
    parts.push({ type: "text", text: "(No file provided.)" });
  }
  return parts;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { submission_id, assessment_id } = await req.json();

    if (!submission_id || !assessment_id) {
      return new Response(JSON.stringify({ error: "submission_id and assessment_id are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: assessment, error: aErr } = await supabase
      .from("assessments").select("*").eq("id", assessment_id).single();
    if (aErr || !assessment) {
      return new Response(JSON.stringify({ error: "Assessment not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!assessment.memo_url) {
      return new Response(JSON.stringify({ error: "No marking guide/memo uploaded for this assessment. Please upload a memo first." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: submission, error: sErr } = await supabase
      .from("assessment_submissions")
      .select("*, students(full_name, admission_number)")
      .eq("id", submission_id).single();
    if (sErr || !submission) {
      return new Response(JSON.stringify({ error: "Submission not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!submission.file_url && !submission.comments) {
      return new Response(JSON.stringify({ error: "Student has not submitted any work to mark." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download memo, question paper, and submission so the model can actually see them
    const [memoFile, paperFile, subFile] = await Promise.all([
      urlToDataUri(assessment.memo_url),
      assessment.file_url ? urlToDataUri(assessment.file_url) : Promise.resolve(null),
      submission.file_url ? urlToDataUri(submission.file_url) : Promise.resolve(null),
    ]);

    const maxMarks = Number(assessment.max_marks) || 100;
    const systemPrompt = `You are an experienced ZIMSEC examiner marking a student's work strictly according to the teacher's memorandum/marking guide.

Rules:
1. Read the marking guide carefully. Use it as the source of truth for awarding marks.
2. Award partial credit where appropriate, following the memo's mark allocation.
3. Total marks available: ${maxMarks}. Never exceed this total.
4. Reference specific questions/sections in your feedback (e.g. "Q1 (a): correct, 2/2", "Q2 (b): missing working, 1/3").
5. Be encouraging but honest. Note any illegible or missing answers.
6. Use the suggest_marks tool to return your final marking.`;

    const userParts: any[] = [
      { type: "text", text: `## Assessment\nTitle: ${assessment.title}\nType: ${assessment.assessment_type}\nMax Marks: ${maxMarks}\nInstructions: ${assessment.instructions || "None provided"}\nStudent: ${submission.students?.full_name || "Unknown"}${submission.comments ? `\nStudent's notes: ${submission.comments}` : ""}` },
      ...buildContentParts("MARKING GUIDE / MEMO", memoFile, assessment.memo_url),
      ...buildContentParts("QUESTION PAPER", paperFile, assessment.file_url),
      ...buildContentParts("STUDENT'S SUBMITTED WORK", subFile, submission.file_url),
      { type: "text", text: "\nMark this submission strictly against the memo and call suggest_marks with marks_obtained, percentage, grade, and detailed feedback." },
    ];

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userParts },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_marks",
              description: "Submit the marking results for a student's work",
              parameters: {
                type: "object",
                properties: {
                  marks_obtained: { type: "number", description: "Total marks awarded (0..max)" },
                  percentage: { type: "number", description: "Percentage score 0-100" },
                  grade: { type: "string", description: "ZIMSEC grade: A*, A, B, C, D, E, or U" },
                  feedback: { type: "string", description: "Detailed marking feedback (2-4 paragraphs, reference specific questions)" },
                },
                required: ["marks_obtained", "percentage", "grade", "feedback"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_marks" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errText = await aiResponse.text().catch(() => "");
      console.error("AI error:", status, errText);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "AI service is busy. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact the administrator." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI marking failed. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call returned:", JSON.stringify(aiData).slice(0, 500));
      return new Response(JSON.stringify({ error: "AI did not return structured marks. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: any;
    try {
      result = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Tool args parse failed:", toolCall.function.arguments);
      return new Response(JSON.stringify({ error: "Could not parse AI response." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const marksObtained = Math.min(Math.max(0, Number(result.marks_obtained) || 0), maxMarks);
    const percentage = (marksObtained / maxMarks) * 100;
    let grade = result.grade;
    if (!["A*", "A", "B", "C", "D", "E", "U"].includes(grade)) {
      if (percentage >= 90) grade = "A*";
      else if (percentage >= 80) grade = "A";
      else if (percentage >= 70) grade = "B";
      else if (percentage >= 60) grade = "C";
      else if (percentage >= 50) grade = "D";
      else if (percentage >= 40) grade = "E";
      else grade = "U";
    }

    return new Response(JSON.stringify({
      marks_obtained: marksObtained,
      percentage: Math.round(percentage * 100) / 100,
      grade,
      feedback: result.feedback,
      ai_marked: true,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("ai-mark-submission error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
