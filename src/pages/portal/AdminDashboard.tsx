import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Bell, Image, Users, Calendar, LogOut, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const initialAnnouncements = [
  { id: 1, title: "Term 1 Results Published", date: "Feb 28, 2026", text: "Results are now on the portal." },
  { id: 2, title: "Athletics Day — Mar 15", date: "Feb 25, 2026", text: "All students report at 7 AM." },
];

const classes = ["Form 1A", "Form 1B", "Form 2A", "Form 2B", "Form 3A", "Form 3B", "Form 4A", "Form 4B"];

export default function AdminDashboard() {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [newTitle, setNewTitle] = useState("");
  const [newText, setNewText] = useState("");

  const addAnnouncement = () => {
    if (!newTitle) return;
    setAnnouncements([{ id: Date.now(), title: newTitle, date: new Date().toLocaleDateString(), text: newText }, ...announcements]);
    setNewTitle(""); setNewText("");
    toast({ title: "Announcement posted!" });
  };

  const deleteAnnouncement = (id: number) => {
    setAnnouncements(announcements.filter(a => a.id !== id));
    toast({ title: "Announcement deleted" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-heading text-lg font-bold text-primary">Admin Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Admin</span>
            <Link to="/login">
              <Button variant="ghost" size="sm"><LogOut className="mr-1 h-4 w-4" /> Logout</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 font-heading text-2xl font-bold text-primary">
          Admin Dashboard
        </motion.h1>

        {/* Quick stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          {[
            { label: "Students", value: "2,048", icon: Users },
            { label: "Announcements", value: String(announcements.length), icon: Bell },
            { label: "Classes", value: "24", icon: Calendar },
            { label: "Gallery Photos", value: "156", icon: Image },
          ].map((s, i) => (
            <Card key={i} className="border-none shadow-maroon">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-maroon-light">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="announcements" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="announcements"><Bell className="mr-1 h-4 w-4" /> Announcements</TabsTrigger>
            <TabsTrigger value="gallery"><Image className="mr-1 h-4 w-4" /> Gallery</TabsTrigger>
            <TabsTrigger value="register"><Users className="mr-1 h-4 w-4" /> Register Students</TabsTrigger>
            <TabsTrigger value="timetable"><Calendar className="mr-1 h-4 w-4" /> Timetables</TabsTrigger>
          </TabsList>

          <TabsContent value="announcements">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="font-heading">New Announcement</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><Label>Title</Label><Input value={newTitle} onChange={e => setNewTitle(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Content</Label><Textarea value={newText} onChange={e => setNewText(e.target.value)} rows={3} /></div>
                  <Button onClick={addAnnouncement} disabled={!newTitle}><Plus className="mr-1 h-4 w-4" /> Post Announcement</Button>
                </CardContent>
              </Card>
              <div className="space-y-3">
                {announcements.map(a => (
                  <Card key={a.id}>
                    <CardContent className="flex items-start justify-between p-4">
                      <div>
                        <span className="text-xs font-semibold text-accent">{a.date}</span>
                        <h3 className="font-semibold">{a.title}</h3>
                        <p className="text-sm text-muted-foreground">{a.text}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteAnnouncement(a.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="gallery">
            <Card>
              <CardHeader><CardTitle className="font-heading">Upload Gallery Images</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-12 text-center">
                  <Image className="mb-3 h-12 w-12 text-muted-foreground" />
                  <p className="font-semibold">Drag & drop images here</p>
                  <p className="text-sm text-muted-foreground">or click to browse files</p>
                  <Button variant="outline" className="mt-4">Browse Files</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card className="max-w-lg">
              <CardHeader><CardTitle className="font-heading">Register Student to Class</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={e => { e.preventDefault(); toast({ title: "Student registered!" }); }} className="space-y-4">
                  <div className="space-y-2"><Label>Student Name</Label><Input required /></div>
                  <div className="space-y-2">
                    <Label>Assign to Class</Label>
                    <Select required><SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>{classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">Register Student</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timetable">
            <Card>
              <CardHeader><CardTitle className="font-heading">Manage Timetable</CardTitle></CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center gap-4">
                  <Label>Class:</Label>
                  <Select><SelectTrigger className="w-40"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => toast({ title: "Timetable saved!" })}>Save Timetable</Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2">Time</th>
                        {["Mon","Tue","Wed","Thu","Fri"].map(d => <th key={d} className="px-3 py-2">{d}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {["07:30","08:30","10:00","11:00","13:00"].map(time => (
                        <tr key={time} className="border-t">
                          <td className="px-3 py-2 font-medium">{time}</td>
                          {[1,2,3,4,5].map(d => (
                            <td key={d} className="px-1 py-1">
                              <Input className="h-8 text-xs text-center" placeholder="Subject" />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
