// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, Save, Eye, ChevronLeft, Users, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

function zimGrade(pct: number): string {
  if (pct >= 90) return "A*";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  if (pct >= 40) return "E";
  return "U";
}

interface Props {
  assessment: any;
  onBack: () => void;
}

interface Question {
  id?: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  marks: number;
  explanation: string;
  display_order: number;
}

const emptyQuestion = (): Question => ({
  question_text: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_answer: "A",
  marks: 1,
  explanation: "",
  display_order: 0,
});

export default function OnlineTestBuilder({ assessment, onBack }: Props) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState<"questions" | "results">("questions");

  useEffect(() => {
    fetchData();
  }, [assessment.id]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: qs }, { data: atts }] = await Promise.all([
      supabase
        .from("assessment_questions")
        .select("*")
        .eq("assessment_id", assessment.id)
        .order("display_order"),
      supabase
        .from("assessment_attempts")
        .select("*, students(full_name, admission_number)")
        .eq("assessment_id", assessment.id)
        .eq("is_submitted", true)
        .order("submitted_at", { ascending: false }),
    ]);
    if (qs && qs.length > 0) {
      setQuestions(qs.map(q => ({
        id: q.id,
        question_text: q.question_text,
        option_a: q.option_a || "",
        option_b: q.option_b || "",
        option_c: q.option_c || "",
        option_d: q.option_d || "",
        correct_answer: q.correct_answer,
        marks: q.marks || 1,
        explanation: q.explanation || "",
        display_order: q.display_order || 0,
      })));
    } else {
      setQuestions([emptyQuestion()]);
    }
    setAttempts(atts || []);
    setLoading(false);
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, { ...emptyQuestion(), display_order: prev.length }]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const saveQuestions = async () => {
    const valid = questions.every(q => q.question_text && q.option_a && q.option_b && q.correct_answer);
    if (!valid) {
      toast({ title: "Each question needs text, at least options A & B, and a correct answer", variant: "destructive" });
      return;
    }
    setSaving(true);

    // Delete existing questions and re-insert
    await supabase.from("assessment_questions").delete().eq("assessment_id", assessment.id);

    const rows = questions.map((q, i) => ({
      assessment_id: assessment.id,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c || null,
      option_d: q.option_d || null,
      correct_answer: q.correct_answer,
      marks: q.marks || 1,
      explanation: q.explanation || null,
      display_order: i,
    }));

    const { error } = await supabase.from("assessment_questions").insert(rows);
    if (error) {
      toast({ title: "Error saving questions", description: error.message, variant: "destructive" });
    } else {
      // Mark assessment as online
      await supabase.from("assessments").update({ is_online: true }).eq("id", assessment.id);
      toast({ title: `${questions.length} questions saved!` });
      fetchData();
    }
    setSaving(false);
  };

  const totalMarks = questions.reduce((s, q) => s + (q.marks || 0), 0);

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant={viewTab === "questions" ? "default" : "outline"} size="sm" onClick={() => setViewTab("questions")}>
            Questions ({questions.length})
          </Button>
          <Button variant={viewTab === "results" ? "default" : "outline"} size="sm" onClick={() => setViewTab("results")}>
            <Users className="mr-1 h-4 w-4" /> Results ({attempts.length})
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-heading">{assessment.title}</CardTitle>
          <CardDescription>
            Online Test • {totalMarks} total marks • {questions.length} question(s)
            {assessment.time_limit_minutes && ` • ${assessment.time_limit_minutes} min time limit`}
          </CardDescription>
        </CardHeader>
      </Card>

      {viewTab === "questions" ? (
        <>
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <Card key={idx} className="relative">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="shrink-0">Q{idx + 1}</Badge>
                      <span className="text-xs text-muted-foreground">{q.marks} mark(s)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        className="w-16 h-7 text-xs"
                        value={q.marks}
                        onChange={e => updateQuestion(idx, "marks", parseInt(e.target.value) || 1)}
                        min={1}
                      />
                      {questions.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeQuestion(idx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <Textarea
                    placeholder="Enter question text..."
                    value={q.question_text}
                    onChange={e => updateQuestion(idx, "question_text", e.target.value)}
                    rows={2}
                    className="text-sm"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {["A", "B", "C", "D"].map(opt => (
                      <div key={opt} className={`flex items-center gap-2 rounded-lg border p-2 ${q.correct_answer === opt ? "border-green-500 bg-green-50 dark:bg-green-950/20" : ""}`}>
                        <button
                          className={`shrink-0 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                            q.correct_answer === opt
                              ? "bg-green-600 text-white"
                              : "bg-muted text-muted-foreground hover:bg-primary/10"
                          }`}
                          onClick={() => updateQuestion(idx, "correct_answer", opt)}
                          title="Click to mark as correct answer"
                        >
                          {opt}
                        </button>
                        <Input
                          className="h-8 text-xs flex-1"
                          placeholder={`Option ${opt}${opt === "C" || opt === "D" ? " (optional)" : ""}`}
                          value={q[`option_${opt.toLowerCase()}`]}
                          onChange={e => updateQuestion(idx, `option_${opt.toLowerCase()}`, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>

                  <Input
                    className="text-xs h-8"
                    placeholder="Explanation (shown after grading, optional)"
                    value={q.explanation}
                    onChange={e => updateQuestion(idx, "explanation", e.target.value)}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={addQuestion}>
              <Plus className="mr-1 h-4 w-4" /> Add Question
            </Button>
            <Button onClick={saveQuestions} disabled={saving}>
              <Save className="mr-1 h-4 w-4" /> {saving ? "Saving..." : `Save ${questions.length} Questions`}
            </Button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          {attempts.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No students have attempted this test yet.</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">Student</th>
                      <th className="px-3 py-2 text-center">Score</th>
                      <th className="px-3 py-2 text-center">%</th>
                      <th className="px-3 py-2 text-center">Grade</th>
                      <th className="px-3 py-2 text-center">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map(a => (
                      <tr key={a.id} className="border-b">
                        <td className="px-3 py-2">
                          <p className="font-medium">{a.students?.full_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{a.students?.admission_number}</p>
                        </td>
                        <td className="px-3 py-2 text-center font-medium">{a.score}/{a.total_marks}</td>
                        <td className="px-3 py-2 text-center">{(a.percentage || 0).toFixed(0)}%</td>
                        <td className="px-3 py-2 text-center"><Badge>{a.grade || "—"}</Badge></td>
                        <td className="px-3 py-2 text-center text-xs text-muted-foreground">
                          {a.submitted_at ? format(new Date(a.submitted_at), "MMM d, h:mm a") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
