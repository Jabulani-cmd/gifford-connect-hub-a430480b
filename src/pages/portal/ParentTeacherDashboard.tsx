import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, BarChart3, BookOpen, Bell, LogOut } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const existingMarks = [
  { student: "Tafadzwa Moyo", subject: "Mathematics", mark: 85, term: "Term 1" },
  { student: "Rudo Ncube", subject: "Mathematics", mark: 72, term: "Term 1" },
  { student: "Blessing Dube", subject: "Mathematics", mark: 91, term: "Term 1" },
];

const existingHomework = [
  { className: "Form 4B", subject: "Mathematics", title: "Chapter 7 Exercises", due: "Mar 7, 2026" },
  { className: "Form 3A", subject: "Mathematics", title: "Algebra Worksheet", due: "Mar 4, 2026" },
];

export default function ParentTeacherDashboard() {
  const { toast } = useToast();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [marksSubmitted, setMarksSubmitted] = useState(false);
  const [hwSubmitted, setHwSubmitted] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const displayName = user?.user_metadata?.full_name || "User";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={schoolLogo} alt="Gifford High School crest" className="h-8 w-8 object-contain" />
            <span className="font-heading text-lg font-bold text-primary">Parent / Teacher Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{displayName}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="mr-1 h-4 w-4" /> Logout</Button>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 font-heading text-2xl font-bold text-primary">
          Dashboard
        </motion.h1>

        <Tabs defaultValue="upload-marks" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="upload-marks"><Upload className="mr-1 h-4 w-4" /> Upload Marks</TabsTrigger>
            <TabsTrigger value="upload-hw"><BookOpen className="mr-1 h-4 w-4" /> Upload Homework</TabsTrigger>
            <TabsTrigger value="view-marks"><BarChart3 className="mr-1 h-4 w-4" /> View Marks</TabsTrigger>
            <TabsTrigger value="view-hw"><BookOpen className="mr-1 h-4 w-4" /> View Homework</TabsTrigger>
            <TabsTrigger value="announcements"><Bell className="mr-1 h-4 w-4" /> Announcements</TabsTrigger>
          </TabsList>

          <TabsContent value="upload-marks">
            <Card className="max-w-lg">
              <CardHeader><CardTitle className="font-heading">Upload Student Marks</CardTitle></CardHeader>
              <CardContent>
                {marksSubmitted ? (
                  <div className="py-8 text-center">
                    <p className="font-semibold text-primary">Marks uploaded successfully!</p>
                    <Button variant="outline" className="mt-4" onClick={() => setMarksSubmitted(false)}>Upload More</Button>
                  </div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); setMarksSubmitted(true); toast({ title: "Marks saved!" }); }} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Student</Label>
                      <Select required><SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tafadzwa">Tafadzwa Moyo</SelectItem>
                          <SelectItem value="rudo">Rudo Ncube</SelectItem>
                          <SelectItem value="blessing">Blessing Dube</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Select required><SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="math">Mathematics</SelectItem>
                          <SelectItem value="english">English</SelectItem>
                          <SelectItem value="physics">Physics</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Mark (%)</Label><Input type="number" min="0" max="100" required /></div>
                    <div className="space-y-2"><Label>Comments</Label><Textarea rows={2} /></div>
                    <Button type="submit" className="w-full">Submit Marks</Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload-hw">
            <Card className="max-w-lg">
              <CardHeader><CardTitle className="font-heading">Upload Homework</CardTitle></CardHeader>
              <CardContent>
                {hwSubmitted ? (
                  <div className="py-8 text-center">
                    <p className="font-semibold text-primary">Homework uploaded!</p>
                    <Button variant="outline" className="mt-4" onClick={() => setHwSubmitted(false)}>Upload More</Button>
                  </div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); setHwSubmitted(true); toast({ title: "Homework posted!" }); }} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Class</Label>
                      <Select required><SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="f4b">Form 4B</SelectItem>
                          <SelectItem value="f3a">Form 3A</SelectItem>
                          <SelectItem value="f2c">Form 2C</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Select required><SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="math">Mathematics</SelectItem>
                          <SelectItem value="english">English</SelectItem>
                          <SelectItem value="physics">Physics</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Assignment Title</Label><Input required /></div>
                    <div className="space-y-2"><Label>Due Date</Label><Input type="date" required /></div>
                    <div className="space-y-2"><Label>Details</Label><Textarea rows={3} /></div>
                    <Button type="submit" className="w-full">Post Homework</Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="view-marks">
            <Card>
              <CardHeader><CardTitle className="font-heading">Student Marks</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left">Student</th>
                      <th className="px-4 py-2">Subject</th><th className="px-4 py-2">Mark</th>
                      <th className="px-4 py-2">Term</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existingMarks.map((m, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2">{m.student}</td>
                        <td className="px-4 py-2 text-center">{m.subject}</td>
                        <td className="px-4 py-2 text-center font-bold text-primary">{m.mark}%</td>
                        <td className="px-4 py-2 text-center">{m.term}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="view-hw">
            <div className="space-y-3">
              {existingHomework.map((hw, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-accent">{hw.className} · {hw.subject}</p>
                    <h3 className="font-semibold">{hw.title}</h3>
                    <p className="text-sm text-muted-foreground">Due: {hw.due}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="announcements">
            <Card>
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-accent">Feb 28</span>
                <h3 className="font-heading font-semibold">Staff Meeting — Friday 3 PM</h3>
                <p className="mt-1 text-sm text-muted-foreground">All teaching staff to attend the end-of-month review meeting in the staff room.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
