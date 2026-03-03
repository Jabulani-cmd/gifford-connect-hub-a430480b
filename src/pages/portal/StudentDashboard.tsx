import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, BookOpen, BarChart3, Bell, LogOut } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import { useAuth } from "@/contexts/AuthContext";

const timetable = [
  { time: "07:30", mon: "Mathematics", tue: "English", wed: "Physics", thu: "Chemistry", fri: "Mathematics" },
  { time: "08:30", mon: "English", tue: "Shona", wed: "Mathematics", thu: "Biology", fri: "Geography" },
  { time: "09:30", mon: "Break", tue: "Break", wed: "Break", thu: "Break", fri: "Break" },
  { time: "10:00", mon: "Physics", tue: "Chemistry", wed: "Biology", thu: "English", fri: "History" },
  { time: "11:00", mon: "Geography", tue: "History", wed: "Shona", thu: "Mathematics", fri: "Physics" },
  { time: "12:00", mon: "Lunch", tue: "Lunch", wed: "Lunch", thu: "Lunch", fri: "Lunch" },
  { time: "13:00", mon: "Computer Sc", tue: "Art", wed: "PE", thu: "Computer Sc", fri: "PE" },
];

const homework = [
  { subject: "Mathematics", title: "Chapter 7 Exercises", due: "Mar 7", status: "Pending" },
  { subject: "English", title: "Essay: My Hero", due: "Mar 5", status: "Submitted" },
  { subject: "Physics", title: "Lab Report: Optics", due: "Mar 10", status: "Pending" },
];

const marks = [
  { subject: "Mathematics", test1: 85, test2: 92, exam: 88 },
  { subject: "English", test1: 78, test2: 82, exam: 80 },
  { subject: "Physics", test1: 90, test2: 88, exam: 91 },
  { subject: "Chemistry", test1: 76, test2: 80, exam: 79 },
];

const announcements = [
  { title: "Term 1 Results Published", date: "Feb 28", text: "Check your marks under the Marks tab." },
  { title: "Athletics Day — Mar 15", date: "Feb 25", text: "All Form 4 students to report at 7:00 AM." },
];

export default function StudentDashboard() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const displayName = user?.user_metadata?.full_name || "Student";

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
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
        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 font-heading text-2xl font-bold text-primary">
          Dashboard
        </motion.h1>

        <Tabs defaultValue="timetable" className="space-y-6">
          <TabsList>
            <TabsTrigger value="timetable"><Calendar className="mr-1 h-4 w-4" /> Timetable</TabsTrigger>
            <TabsTrigger value="homework"><BookOpen className="mr-1 h-4 w-4" /> Homework</TabsTrigger>
            <TabsTrigger value="marks"><BarChart3 className="mr-1 h-4 w-4" /> Marks</TabsTrigger>
            <TabsTrigger value="announcements"><Bell className="mr-1 h-4 w-4" /> Announcements</TabsTrigger>
          </TabsList>

          <TabsContent value="timetable">
            <Card>
              <CardHeader><CardTitle className="font-heading">Weekly Timetable</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">Time</th>
                      <th className="px-3 py-2">Mon</th><th className="px-3 py-2">Tue</th>
                      <th className="px-3 py-2">Wed</th><th className="px-3 py-2">Thu</th>
                      <th className="px-3 py-2">Fri</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timetable.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2 font-medium">{row.time}</td>
                        <td className="px-3 py-2 text-center">{row.mon}</td>
                        <td className="px-3 py-2 text-center">{row.tue}</td>
                        <td className="px-3 py-2 text-center">{row.wed}</td>
                        <td className="px-3 py-2 text-center">{row.thu}</td>
                        <td className="px-3 py-2 text-center">{row.fri}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="homework">
            <div className="space-y-3">
              {homework.map((hw, i) => (
                <Card key={i}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-accent">{hw.subject}</p>
                      <h3 className="font-semibold">{hw.title}</h3>
                      <p className="text-sm text-muted-foreground">Due: {hw.due}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${hw.status === "Submitted" ? "bg-green-100 text-green-700" : "bg-gold-light text-accent-foreground"}`}>
                      {hw.status}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="marks">
            <Card>
              <CardHeader><CardTitle className="font-heading">Term 1 Marks</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left">Subject</th>
                      <th className="px-4 py-2">Test 1</th><th className="px-4 py-2">Test 2</th>
                      <th className="px-4 py-2">Exam</th><th className="px-4 py-2">Average</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marks.map((m, i) => {
                      const avg = Math.round((m.test1 + m.test2 + m.exam) / 3);
                      return (
                        <tr key={i} className="border-t">
                          <td className="px-4 py-2 font-medium">{m.subject}</td>
                          <td className="px-4 py-2 text-center">{m.test1}</td>
                          <td className="px-4 py-2 text-center">{m.test2}</td>
                          <td className="px-4 py-2 text-center">{m.exam}</td>
                          <td className="px-4 py-2 text-center font-bold text-primary">{avg}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcements">
            <div className="space-y-3">
              {announcements.map((a, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <span className="text-xs font-semibold text-accent">{a.date}</span>
                    <h3 className="font-heading font-semibold">{a.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{a.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
