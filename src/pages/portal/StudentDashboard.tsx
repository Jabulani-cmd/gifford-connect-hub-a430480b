import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, BookOpen, BarChart3, Bell, LogOut, User, ClipboardList } from "lucide-react";
import PersonalTimetableEditor from "@/components/PersonalTimetableEditor";
import schoolLogo from "@/assets/school-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const timeSlots = ["07:30", "08:30", "10:00", "11:00", "13:00"];

export default function StudentDashboard() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [timetableData, setTimetableData] = useState<any[]>([]);
  const [homeworkData, setHomeworkData] = useState<any[]>([]);
  const [marksData, setMarksData] = useState<any[]>([]);
  const [announcementsData, setAnnouncementsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      setLoading(true);

      // Fetch profile
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(prof);

      // Fetch timetable based on student's class
      if (prof?.class_name) {
        // Find the class in classes table
        const { data: classRow } = await supabase.from("classes").select("id").eq("name", prof.class_name).single();
        if (classRow) {
          const { data: tt } = await supabase
            .from("timetable")
            .select("*, subjects(name)")
            .eq("class_id", classRow.id);
          if (tt) setTimetableData(tt);
        }
      }

      // Fetch homework for student's class
      if (prof?.class_name) {
        const { data: classRow } = await supabase.from("classes").select("id").eq("name", prof.class_name).single();
        if (classRow) {
          const { data: hw } = await supabase
            .from("homework")
            .select("*, subjects(name)")
            .eq("class_id", classRow.id)
            .order("due_date", { ascending: true });
          if (hw) setHomeworkData(hw);
        }
      }

      // Fetch marks
      const { data: marks } = await supabase
        .from("marks")
        .select("*, subjects(name)")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });
      if (marks) setMarksData(marks);

      // Fetch announcements
      const { data: ann } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(10);
      if (ann) setAnnouncementsData(ann);

      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "Student";

  // Build timetable grid from DB data
  const getTimetableCell = (timeSlot: string, dayIndex: number) => {
    const entry = timetableData.find(t => t.time_slot === timeSlot && t.day_of_week === dayIndex);
    return entry?.subjects?.name || "—";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={schoolLogo} alt="Gifford High School crest" className="h-8 w-8 object-contain" />
            <span className="font-heading text-lg font-bold text-primary">Student Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Welcome, {displayName}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="mr-1 h-4 w-4" /> Logout</Button>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Profile Card */}
        {profile && (
          <Card className="mb-6 border-none shadow-maroon">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-maroon-light">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold text-primary">{displayName}</h2>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  {profile.grade && <span>Grade: {profile.grade}</span>}
                  {profile.class_name && <span>Class: {profile.class_name}</span>}
                  {profile.email && <span>{profile.email}</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="timetable" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="timetable"><Calendar className="mr-1 h-4 w-4" /> Class Timetable</TabsTrigger>
            <TabsTrigger value="my-planner"><ClipboardList className="mr-1 h-4 w-4" /> My Planner</TabsTrigger>
            <TabsTrigger value="homework"><BookOpen className="mr-1 h-4 w-4" /> Homework</TabsTrigger>
            <TabsTrigger value="marks"><BarChart3 className="mr-1 h-4 w-4" /> Marks</TabsTrigger>
            <TabsTrigger value="announcements"><Bell className="mr-1 h-4 w-4" /> Announcements</TabsTrigger>
          </TabsList>

          {/* Personal Planner Tab */}
          <TabsContent value="my-planner">
            <PersonalTimetableEditor title="My Personal Planner" />
          </TabsContent>

          <TabsContent value="timetable">
            <Card>
              <CardHeader><CardTitle className="font-heading">My Weekly Timetable</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                {timetableData.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">Time</th>
                        {days.map(d => <th key={d} className="px-3 py-2">{d}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map(time => (
                        <tr key={time} className="border-t">
                          <td className="px-3 py-2 font-medium">{time}</td>
                          {[1, 2, 3, 4, 5].map(d => (
                            <td key={d} className="px-3 py-2 text-center">{getTimetableCell(time, d)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-center text-muted-foreground italic py-8">
                    {loading ? "Loading timetable..." : "No timetable has been set for your class yet."}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="homework">
            <div className="space-y-3">
              {homeworkData.length > 0 ? homeworkData.map((hw) => (
                <Card key={hw.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-accent">{hw.subjects?.name || "Subject"}</p>
                      <h3 className="font-semibold">{hw.title}</h3>
                      <p className="text-sm text-muted-foreground">Due: {new Date(hw.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                      {hw.description && <p className="mt-1 text-sm text-muted-foreground">{hw.description}</p>}
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <p className="text-center text-muted-foreground italic py-8">No homework assigned yet.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="marks">
            <Card>
              <CardHeader><CardTitle className="font-heading">My Marks</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                {marksData.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left">Subject</th>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2">Term</th>
                        <th className="px-4 py-2">Mark</th>
                        <th className="px-4 py-2 text-left">Comment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marksData.map(m => (
                        <tr key={m.id} className="border-t">
                          <td className="px-4 py-2 font-medium">{m.subjects?.name}</td>
                          <td className="px-4 py-2 text-center">{m.assessment_type}</td>
                          <td className="px-4 py-2 text-center">{m.term}</td>
                          <td className="px-4 py-2 text-center font-bold text-primary">{m.mark}%</td>
                          <td className="px-4 py-2 text-sm text-muted-foreground">{m.comment || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-center text-muted-foreground italic py-8">No marks recorded yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcements">
            <div className="space-y-3">
              {announcementsData.length > 0 ? announcementsData.map(a => (
                <Card key={a.id}>
                  <CardContent className="p-4">
                    <span className="text-xs font-semibold text-accent">{new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    <h3 className="font-heading font-semibold">{a.title}</h3>
                    {a.content && <p className="mt-1 text-sm text-muted-foreground">{a.content}</p>}
                  </CardContent>
                </Card>
              )) : (
                <p className="text-center text-muted-foreground italic py-8">No announcements.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
