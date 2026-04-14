import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { subject, topic, numQuestions, difficulty, questionTypes, maxMarks, instructions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const typesStr = (questionTypes && questionTypes.length > 0)
      ? questionTypes.join(", ")
      : "multiple_choice, short_answer, structured, essay";

    const systemPrompt = `You are an expert teacher creating assessment questions for a Zimbabwean secondary school curriculum.

Generate exactly ${numQuestions || 5} questions on the given topic.
Question types to include: ${typesStr}
Total marks for the assessment: ${maxMarks || 100}
Difficulty level: ${difficulty || "Medium"}
${instructions ? `Additional instructions: ${instructions}` : ""}

IMPORTANT: Return ONLY a valid JSON array, no markdown, no code fences.
Each object in the array must have these fields:
- question_number: number (1-based)
- question_type: "multiple_choice" | "short_answer" | "structured" | "essay" | "true_false" | "fill_in_blank" | "matching"
- question_text: string (the full question)
- marks: number (marks allocated to this question)
- model_answer: string (the expected answer or marking guide)
- explanation: string (why this answer is correct, for the teacher's reference)

For multiple_choice questions, also include:
- option_a: string
- option_b: string
- option_c: string
- option_d: string
- correct_answer: "A" | "B" | "C" | "D"

For structured questions, include sub-parts in the question_text using (a), (b), (c) etc., and provide corresponding model answers.

For true_false questions, include:
- correct_answer: "True" | "False"

Distribute marks appropriately across questions. Short answer: 1-3 marks, Structured: 4-10 marks, Essay: 10-25 marks, MCQ: 1-2 marks, True/False: 1 mark, Fill-in-blank: 1-2 marks.`;

    const userPrompt = `Subject: ${subject || "General"}
Topic: ${topic}
Number of questions: ${numQuestions || 5}
Difficulty: ${difficulty || "Medium"}
Question types: ${typesStr}
Total marks: ${maxMarks || 100}

Generate the assessment questions now.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const questions = JSON.parse(content);

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-assessment-questions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
