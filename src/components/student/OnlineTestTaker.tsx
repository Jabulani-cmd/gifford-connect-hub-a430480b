// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, AlertCircle, Send, Play, Lock } from "lucide-react";
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
  studentId: string;
  onBack: () => void;
  onComplete: () => void;
}

export default function OnlineTestTaker({ assessment, studentId, onBack, onComplete }: Props) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [existingAttempt, setExistingAttempt] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const [now, setNow] = useState(new Date());

  const scheduledStart = assessment.scheduled_start ? new Date(assessment.scheduled_start) : null;
  const scheduledEnd = assessment.scheduled_end ? new Date(assessment.scheduled_end) : null;
  const isBeforeWindow = scheduledStart && now < scheduledStart;
  const isAfterWindow = scheduledEnd && now > scheduledEnd;
  const isWithinWindow = !isBeforeWindow && !isAfterWindow;

  // Clock tick for schedule checking
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchData();
  }, [assessment.id]);

  // Timer - only starts when student clicks Start
  useEffect(() => {
    if (!started || !assessment.time_limit_minutes || submitted || existingAttempt) return;
    const totalSeconds = assessment.time_limit_minutes * 60;
    setTimeLeft(totalSeconds);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [started, assessment.time_limit_minutes, submitted, existingAttempt]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: qs }, { data: existing }] = await Promise.all([
      supabase
        .from("assessment_questions")
        .select("id, question_text, option_a, option_b, option_c, option_d, marks, display_order")
        .eq("assessment_id", assessment.id)
        .order("display_order"),
      supabase
        .from("assessment_attempts")
        .select("*")
        .eq("assessment_id", assessment.id)
        .eq("student_id", studentId)
        .eq("is_submitted", true)
        .maybeSingle(),
    ]);
    setQuestions(qs || []);
    if (existing) {
      setExistingAttempt(existing);
      setSubmitted(true);
      setResult(existing);
      setAnswers(existing.answers || {});
    }
    setLoading(false);
  };

  const selectAnswer = (questionId: string, answer: string) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setShowConfirm(false);

    // Fetch correct answers for grading
    const { data: fullQs } = await supabase
      .from("assessment_questions")
      .select("id, correct_answer, marks, explanation")
      .eq("assessment_id", assessment.id);

    let score = 0;
    let totalMarks = 0;
    const qMap = {};
    (fullQs || []).forEach(q => {
      totalMarks += (q.marks || 1);
      qMap[q.id] = q;
      if (answers[q.id] === q.correct_answer) {
        score += (q.marks || 1);
      }
    });

    const pct = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
    const grade = zimGrade(pct);

    const { data: attempt, error } = await supabase
      .from("assessment_attempts")
      .insert({
        assessment_id: assessment.id,
        student_id: studentId,
        answers,
        score,
        total_marks: totalMarks,
        percentage: pct,
        grade,
        submitted_at: new Date().toISOString(),
        is_submitted: true,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error submitting test", description: error.message, variant: "destructive" });
    } else {
      // Use secure server-side function to sync marks across all portals
      if (assessment.subject_id && assessment.teacher_id) {
        await supabase.rpc("sync_online_test_marks", {
          p_student_id: studentId,
          p_assessment_id: assessment.id,
          p_subject_id: assessment.subject_id,
          p_teacher_id: assessment.teacher_id,
          p_score: score,
          p_total_marks: totalMarks,
          p_percentage: pct,
          p_grade: grade,
          p_title: assessment.title,
        });
      }

      setResult({ ...attempt, _correctMap: qMap });
      setSubmitted(true);
      toast({ title: `Test submitted! Score: ${score}/${totalMarks} (${grade})` });
    }
    setSubmitting(false);
  };

  const getCurrentTerm = () => {
    const month = new Date().getMonth() + 1;
    if (month >= 1 && month <= 4) return "Term 1";
    if (month >= 5 && month <= 8) return "Term 2";
    return "Term 3";
  };

  const answeredCount = Object.keys(answers).length;
  const currentQ = questions[currentIdx];

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (questions.length === 0) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}><ChevronLeft className="mr-1 h-4 w-4" /> Back</Button>
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">This online test has no questions yet.</CardContent></Card>
      </div>
    );
  }

  // Results view
  if (submitted && result) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { onComplete(); onBack(); }}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back to Assessments
        </Button>

        <Card className="border-primary/30">
          <CardContent className="py-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600 mb-3" />
            <p className="text-3xl font-bold text-primary">{result.grade}</p>
            <p className="text-lg font-medium mt-1">{result.score} / {result.total_marks}</p>
            <p className="text-sm text-muted-foreground">{(result.percentage || 0).toFixed(0)}%</p>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {questions.map((q, i) => {
            const studentAnswer = answers[q.id];
            const correctAnswer = result._correctMap?.[q.id]?.correct_answer;
            const isCorrect = studentAnswer === correctAnswer;
            const explanation = result._correctMap?.[q.id]?.explanation;

            return (
              <Card key={q.id} className={isCorrect ? "border-green-300" : "border-red-300"}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium">Q{i + 1}. {q.question_text}</p>
                    <Badge variant={isCorrect ? "default" : "destructive"} className="shrink-0 ml-2">
                      {isCorrect ? "✓" : "✗"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {["A", "B", "C", "D"].map(opt => {
                      const val = q[`option_${opt.toLowerCase()}`];
                      if (!val) return null;
                      const isStudent = studentAnswer === opt;
                      const isRight = correctAnswer === opt;
                      return (
                        <div key={opt} className={`text-xs rounded-md px-2 py-1.5 border ${
                          isRight ? "bg-green-100 border-green-400 dark:bg-green-950/30 dark:border-green-700" :
                          isStudent ? "bg-red-100 border-red-400 dark:bg-red-950/30 dark:border-red-700" :
                          "bg-muted"
                        }`}>
                          <span className="font-bold mr-1">{opt}.</span> {val}
                        </div>
                      );
                    })}
                  </div>
                  {explanation && (
                    <p className="text-xs text-muted-foreground italic">💡 {explanation}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Start screen - shown before student begins the test
  if (!started && !submitted) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>

        <Card className="border-primary/30">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{assessment.title}</CardTitle>
            <CardDescription>Online Test</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-2xl font-bold text-primary">{questions.length}</p>
                <p className="text-xs text-muted-foreground">Questions</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-2xl font-bold text-primary">{assessment.time_limit_minutes || "∞"}</p>
                <p className="text-xs text-muted-foreground">{assessment.time_limit_minutes ? "Minutes" : "No Time Limit"}</p>
              </div>
            </div>

            {assessment.instructions && (
              <div className="rounded-lg border p-3">
                <p className="text-xs font-medium mb-1">Instructions:</p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{assessment.instructions}</p>
              </div>
            )}

            {scheduledStart && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>📅 Available from: <strong>{format(scheduledStart, "MMM d, yyyy 'at' h:mm a")}</strong></p>
                {scheduledEnd && <p>📅 Available until: <strong>{format(scheduledEnd, "MMM d, yyyy 'at' h:mm a")}</strong></p>}
              </div>
            )}

            {isBeforeWindow && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 text-center">
                <Lock className="mx-auto h-8 w-8 text-amber-600 mb-2" />
                <p className="text-sm font-medium text-amber-800 dark:text-amber-400">Test Not Yet Available</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Opens in: <strong>{formatCountdown(scheduledStart.getTime() - now.getTime())}</strong>
                </p>
              </div>
            )}

            {isAfterWindow && (
              <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/20 p-3 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-red-600 mb-2" />
                <p className="text-sm font-medium text-red-800 dark:text-red-400">Test Window Has Closed</p>
                <p className="text-xs text-muted-foreground mt-1">This test is no longer available.</p>
              </div>
            )}

            {isWithinWindow && (
              <div className="space-y-2">
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-400">
                  <AlertCircle className="inline h-3.5 w-3.5 mr-1" />
                  Once you start, {assessment.time_limit_minutes ? `you will have ${assessment.time_limit_minutes} minutes to complete the test.` : "you can take as long as needed."} You cannot pause.
                </div>
                <Button onClick={() => setStarted(true)} className="w-full bg-green-600 hover:bg-green-700 text-lg py-6">
                  <Play className="mr-2 h-5 w-5" /> Start Test
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Exit
        </Button>
        <div className="flex items-center gap-3">
          {timeLeft !== null && (
            <Badge variant={timeLeft < 60 ? "destructive" : "outline"} className="text-sm">
              <Clock className="mr-1 h-3.5 w-3.5" /> {formatTime(timeLeft)}
            </Badge>
          )}
          <Badge variant="outline">{answeredCount}/{questions.length} answered</Badge>
        </div>
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Badge variant="outline">Question {currentIdx + 1} of {questions.length}</Badge>
            <span className="text-xs text-muted-foreground">{currentQ?.marks || 1} mark(s)</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm font-medium leading-relaxed">{currentQ?.question_text}</p>

          <div className="space-y-2">
            {["A", "B", "C", "D"].map(opt => {
              const val = currentQ?.[`option_${opt.toLowerCase()}`];
              if (!val) return null;
              const selected = answers[currentQ.id] === opt;
              return (
                <button
                  key={opt}
                  onClick={() => selectAnswer(currentQ.id, opt)}
                  className={`w-full text-left rounded-lg border p-3 text-sm transition-all ${
                    selected
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                      : "border-border hover:border-primary/40 hover:bg-muted"
                  }`}
                >
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 text-xs font-bold ${
                    selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>{opt}</span>
                  {val}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={currentIdx === 0} onClick={() => setCurrentIdx(prev => prev - 1)}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Previous
        </Button>

        {currentIdx < questions.length - 1 ? (
          <Button onClick={() => setCurrentIdx(prev => prev + 1)}>
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => setShowConfirm(true)} className="bg-green-600 hover:bg-green-700">
            <Send className="mr-1 h-4 w-4" /> Submit Test
          </Button>
        )}
      </div>

      {/* Question navigator dots */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setCurrentIdx(i)}
            className={`w-8 h-8 rounded-md text-xs font-medium transition-colors ${
              i === currentIdx ? "bg-primary text-primary-foreground" :
              answers[q.id] ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border border-green-300" :
              "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Confirm Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Submit Test?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You have answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions.
              {answeredCount < questions.length && (
                <span className="text-destructive block mt-1">
                  <AlertCircle className="inline h-3.5 w-3.5 mr-1" />
                  {questions.length - answeredCount} question(s) unanswered!
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">Once submitted, you cannot change your answers.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowConfirm(false)} className="flex-1">Go Back</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-green-600 hover:bg-green-700">
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0s";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
