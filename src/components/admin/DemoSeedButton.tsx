import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Database, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function DemoSeedButton() {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const runSeed = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("seed-demo-data", { body: {} });
      if (error) throw error;
      toast({
        title: "Demo data seeded",
        description: `Students: ${data?.summary?.students ?? "?"}, Staff: ${data?.summary?.staff ?? "?"}, Classes: ${data?.summary?.classes ?? "?"}`,
      });
      setTimeout(() => window.location.reload(), 1200);
    } catch (e: any) {
      toast({ title: "Seed failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="hidden md:flex border-amber-500 text-amber-700 hover:bg-amber-50">
          <Database className="mr-1 h-4 w-4" /> Reset Demo Data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset and re-seed demo data?</AlertDialogTitle>
          <AlertDialogDescription>
            This will <b>delete</b> all students, staff, classes, marks, attendance, fees, payments, lesson plans,
            announcements, events, exams and timetable entries, then re-create a fresh demo dataset
            (~180 students across Form 1A–6A, 25 staff, full Term 2 marks &amp; attendance, fees, exam timetable, and 12 demo login accounts).
            <br /><br />
            <b>Use only on demo environments.</b> Real data will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={runSeed} disabled={busy}>
            {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Seeding…</> : "Reset & Seed"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
