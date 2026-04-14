import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate auth
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

    // Fetch assessment details (with memo)
    const { data: assessment, error: aErr } = await supabase
      .from("assessments")
      .select("*")
      .eq("id", assessment_id)
      .single();

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

    // Fetch submission
    const { data: submission, error: sErr } = await supabase
      .from("assessment_submissions")
      .select("*, students(full_name, admission_number)")
      .eq("id", submission_id)
      .single();

    if (sErr || !submission) {
      return new Response(JSON.stringify({ error: "Submission not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build AI prompt
    const maxMarks = assessment.max_marks || 100;
    const systemPrompt = `You are an expert teacher and examiner. Your task is to mark a student's submitted work based on a marking guide/memorandum provided by the teacher.

IMPORTANT RULES:
1. Mark STRICTLY according to the memo/marking guide provided.
2. Award marks fairly based on the memo criteria.
3. Provide specific feedback referencing which questions/sections were correct or incorrect.
4. The total marks available is ${maxMarks}.
5. Be encouraging but honest in your feedback.
6. If the student's work is unclear or illegible, note that and mark what you can.

You MUST respond using the suggest_marks tool with:
- marks_obtained: the total marks the student earned (number)
- percentage: the percentage score (number)
- grade: ZIMSEC-style grade (A*, A, B, C, D, E, U)
- feedback: detailed feedback explaining the marking (string, 2-4 paragraphs)`;

    const userPrompt = `## Assessment Details
- Title: ${assessment.title}
- Type: ${assessment.assessment_type}
- Max Marks: ${maxMarks}
- Instructions: ${assessment.instructions || "None provided"}

## Marking Guide / Memorandum
The memo/answer key is available at this URL: ${assessment.memo_url}
Please download and review it to understand the expected answers and mark allocation.

## Question Paper
${assessment.file_url ? `The question paper is available at: ${assessment.file_url}` : "No separate question paper uploaded."}

## Student's Submitted Work
- Student: ${submission.students?.full_name || "Unknown"}
${submission.file_url ? `- Submitted work URL: ${submission.file_url}` : "- No file submitted"}
${submission.comments ? `- Student's comments: ${submission.comments}` : ""}

Please mark this student's work according to the memo and provide detailed feedback.`;

    // Call AI with tool calling for structured output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
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
                  marks_obtained: { type: "number", description: "Total marks awarded" },
                  percentage: { type: "number", description: "Percentage score" },
                  grade: { type: "string", description: "ZIMSEC grade: A*, A, B, C, D, E, or U" },
                  feedback: { type: "string", description: "Detailed feedback explaining the marking" },
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
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      return new Response(JSON.stringify({ error: "AI marking failed. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      // Fallback: try to parse from content
      return new Response(JSON.stringify({ error: "AI did not return structured marks. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Clamp marks
    const marksObtained = Math.min(Math.max(0, result.marks_obtained), maxMarks);
    const percentage = (marksObtained / maxMarks) * 100;

    // Determine ZIMSEC grade
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
