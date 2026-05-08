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

    if (!topic || typeof topic !== "string") {
      return new Response(JSON.stringify({ error: "Topic is required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowedTypes = ["multiple_choice", "short_answer", "structured", "essay", "true_false", "fill_in_blank", "matching"];
    const types = Array.isArray(questionTypes) && questionTypes.length > 0
      ? questionTypes.filter((t: string) => allowedTypes.includes(t))
      : ["multiple_choice", "short_answer", "structured"];

    const n = Math.max(1, Math.min(50, parseInt(String(numQuestions)) || 5));
    const total = Math.max(1, parseInt(String(maxMarks)) || 100);

    const systemPrompt = `You are a Zimbabwean secondary school teacher creating an assessment aligned to the ZIMSEC curriculum.
Generate exactly ${n} questions on the given topic.
- Allowed question types: ${types.join(", ")}.
- Total marks: ${total}. Distribute marks sensibly across questions (MCQ/True-False: 1-2, fill/short: 1-3, structured: 4-10, essay: 10-25).
- Difficulty: ${difficulty || "Medium"}.
${instructions ? `- Additional instructions: ${instructions}` : ""}

You MUST call the create_assessment tool with the questions array. Do not answer in plain text.`;

    const userPrompt = `Subject: ${subject || "General"}
Topic: ${topic}
Number of questions: ${n}
Difficulty: ${difficulty || "Medium"}
Question types: ${types.join(", ")}
Total marks: ${total}`;

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
              name: "create_assessment",
              description: "Return the generated assessment questions in structured form.",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_number: { type: "number" },
                        question_type: { type: "string", enum: allowedTypes },
                        question_text: { type: "string" },
                        marks: { type: "number" },
                        model_answer: { type: "string" },
                        explanation: { type: "string" },
                        option_a: { type: "string" },
                        option_b: { type: "string" },
                        option_c: { type: "string" },
                        option_d: { type: "string" },
                        correct_answer: { type: "string" },
                      },
                      required: ["question_number", "question_type", "question_text", "marks", "model_answer"],
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_assessment" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errText = await aiResponse.text().catch(() => "");
      console.error("AI gateway error:", status, errText);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact the administrator." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call:", JSON.stringify(aiData).slice(0, 600));
      return new Response(JSON.stringify({ error: "AI did not return structured questions. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      return new Response(JSON.stringify({ error: "Could not parse AI response." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const questions = (parsed.questions || []).map((q: any, i: number) => ({
      question_number: q.question_number ?? i + 1,
      question_type: q.question_type,
      question_text: q.question_text,
      marks: Number(q.marks) || 1,
      model_answer: q.model_answer || "",
      explanation: q.explanation || "",
      option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d,
      correct_answer: q.correct_answer,
    }));

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
