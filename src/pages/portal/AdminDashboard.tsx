import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Image, Users, Calendar, LogOut, Plus, Trash2, Upload, Layers, GraduationCap, UserPlus } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const gradeOptions = ["Form 1", "Form 2", "Form 3", "Form 4", "Lower 6", "Upper 6"];
const classOptions = ["A", "B", "C", "D"];
const departmentOptions = ["Mathematics", "Sciences", "Languages", "Humanities", "Technical", "Arts", "Sports"];

export default function AdminDashboard() {
  const { toast } = useToast();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  // Announcements
  const [announcements, setAnnouncements] = useState<{ id: string; title: string; created_at: string; content: string | null }[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newText, setNewText] = useState("");

  // Carousel images
  const [carouselImages, setCarouselImages] = useState<{ id: string; image_url: string; display_order: number }[]>([]);
  const carouselFileRef = useRef<HTMLInputElement>(null);

  // Gallery images
  const [galleryImages, setGalleryImages] = useState<{ id: string; image_url: string; caption: string | null }[]>([]);
  const galleryFileRef = useRef<HTMLInputElement>(null);
  const [galleryCaption, setGalleryCaption] = useState("");

  const [uploading, setUploading] = useState(false);

  // Student registration
  const [studentForm, setStudentForm] = useState({ full_name: "", email: "", password: "", grade: "", class_name: "", phone: "" });
  const [regLoading, setRegLoading] = useState(false);

  // Teacher registration
  const [teacherForm, setTeacherForm] = useState({ full_name: "", email: "", password: "", department: "", phone: "" });

  useEffect(() => {
    fetchAnnouncements();
    fetchCarouselImages();
    fetchGalleryImages();
  }, []);

  const fetchAnnouncements = async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    if (data) setAnnouncements(data);
  };

  const fetchCarouselImages = async () => {
    const { data } = await supabase.from("carousel_images").select("*").order("display_order");
    if (data) setCarouselImages(data);
  };

  const fetchGalleryImages = async () => {
    const { data } = await supabase.from("gallery_images").select("*").order("created_at", { ascending: false });
    if (data) setGalleryImages(data);
  };

  const addAnnouncement = async () => {
    if (!newTitle) return;
    const { error } = await supabase.from("announcements").insert({ title: newTitle, content: newText, is_public: true, author_id: user?.id });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewTitle(""); setNewText("");
    toast({ title: "Announcement posted!" });
    fetchAnnouncements();
  };

  const deleteAnnouncement = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    toast({ title: "Announcement deleted" });
    fetchAnnouncements();
  };

  const uploadImage = async (file: File, folder: string) => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("school-media").upload(path, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("school-media").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleCarouselUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, "carousel");
      await supabase.from("carousel_images").insert({ image_url: url, display_order: carouselImages.length });
      toast({ title: "Carousel image added!" });
      fetchCarouselImages();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
    if (carouselFileRef.current) carouselFileRef.current.value = "";
  };

  const deleteCarouselImage = async (id: string) => {
    await supabase.from("carousel_images").delete().eq("id", id);
    toast({ title: "Carousel image removed" });
    fetchCarouselImages();
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, "gallery");
      await supabase.from("gallery_images").insert({ image_url: url, caption: galleryCaption || null });
      toast({ title: "Gallery image added!" });
      setGalleryCaption("");
      fetchGalleryImages();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
    if (galleryFileRef.current) galleryFileRef.current.value = "";
  };

  const deleteGalleryImage = async (id: string) => {
    await supabase.from("gallery_images").delete().eq("id", id);
    toast({ title: "Gallery image removed" });
    fetchGalleryImages();
  };

  const registerStudent = async () => {
    const { full_name, email, password, grade, class_name, phone } = studentForm;
    if (!full_name || !email || !password || !grade) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    setRegLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/manage-users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: "register-student", full_name, email, password, grade, class_name: `${grade}${class_name}`, phone }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({ title: "Student registered successfully!" });
      setStudentForm({ full_name: "", email: "", password: "", grade: "", class_name: "", phone: "" });
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    }
    setRegLoading(false);
  };

  const registerTeacher = async () => {
    const { full_name, email, password, department, phone } = teacherForm;
    if (!full_name || !email || !password) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    setRegLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/manage-users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: "register-teacher", full_name, email, password, department, phone }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({ title: "Teacher registered successfully!" });
      setTeacherForm({ full_name: "", email: "", password: "", department: "", phone: "" });
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    }
    setRegLoading(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={schoolLogo} alt="Gifford High School crest" className="h-8 w-8 object-contain" />
            <span className="font-heading text-lg font-bold text-primary">Admin Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Admin</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="mr-1 h-4 w-4" /> Logout</Button>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 font-heading text-2xl font-bold text-primary">
          Admin Dashboard
        </motion.h1>

        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          {[
            { label: "Announcements", value: String(announcements.length), icon: Bell },
            { label: "Carousel Slides", value: String(carouselImages.length), icon: Layers },
            { label: "Gallery Photos", value: String(galleryImages.length), icon: Image },
            { label: "Classes", value: "24", icon: Calendar },
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
            <TabsTrigger value="carousel"><Layers className="mr-1 h-4 w-4" /> Carousel</TabsTrigger>
            <TabsTrigger value="gallery"><Image className="mr-1 h-4 w-4" /> Gallery</TabsTrigger>
            <TabsTrigger value="register-student"><GraduationCap className="mr-1 h-4 w-4" /> Register Student</TabsTrigger>
            <TabsTrigger value="register-teacher"><UserPlus className="mr-1 h-4 w-4" /> Register Teacher</TabsTrigger>
            <TabsTrigger value="timetable"><Calendar className="mr-1 h-4 w-4" /> Timetables</TabsTrigger>
          </TabsList>

          {/* Announcements Tab */}
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
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {announcements.map(a => (
                  <Card key={a.id}>
                    <CardContent className="flex items-start justify-between p-4">
                      <div>
                        <span className="text-xs font-semibold text-accent">{new Date(a.created_at).toLocaleDateString()}</span>
                        <h3 className="font-semibold">{a.title}</h3>
                        <p className="text-sm text-muted-foreground">{a.content}</p>
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

          {/* Carousel Tab */}
          <TabsContent value="carousel">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="font-heading">Upload Carousel Image</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">Recommended: 1920×1080px.</p>
                  <input type="file" accept="image/*" ref={carouselFileRef} onChange={handleCarouselUpload} className="hidden" />
                  <Button onClick={() => carouselFileRef.current?.click()} disabled={uploading}>
                    <Upload className="mr-1 h-4 w-4" /> {uploading ? "Uploading…" : "Choose Image"}
                  </Button>
                </CardContent>
              </Card>
              <div className="space-y-3">
                <h3 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider">Current Slides ({carouselImages.length})</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {carouselImages.map((img) => (
                    <div key={img.id} className="group relative overflow-hidden rounded-lg border">
                      <img src={img.image_url} alt="Carousel slide" className="h-32 w-full object-cover" />
                      <Button variant="destructive" size="icon" className="absolute right-2 top-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteCarouselImage(img.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Gallery Tab */}
          <TabsContent value="gallery">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="font-heading">Upload Gallery Image</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Caption (optional)</Label>
                    <Input value={galleryCaption} onChange={e => setGalleryCaption(e.target.value)} placeholder="e.g. Inter-house Athletics 2026" />
                  </div>
                  <input type="file" accept="image/*" ref={galleryFileRef} onChange={handleGalleryUpload} className="hidden" />
                  <Button onClick={() => galleryFileRef.current?.click()} disabled={uploading}>
                    <Upload className="mr-1 h-4 w-4" /> {uploading ? "Uploading…" : "Choose Image"}
                  </Button>
                </CardContent>
              </Card>
              <div className="space-y-3">
                <h3 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider">Gallery ({galleryImages.length})</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  {galleryImages.map((img) => (
                    <div key={img.id} className="group relative overflow-hidden rounded-lg border">
                      <img src={img.image_url} alt={img.caption || "Gallery"} className="h-28 w-full object-cover" />
                      {img.caption && <p className="px-2 py-1 text-xs text-muted-foreground truncate">{img.caption}</p>}
                      <Button variant="destructive" size="icon" className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteGalleryImage(img.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Register Student Tab */}
          <TabsContent value="register-student">
            <Card className="max-w-lg">
              <CardHeader><CardTitle className="font-heading">Register New Student</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input value={studentForm.full_name} onChange={e => setStudentForm(p => ({ ...p, full_name: e.target.value }))} placeholder="e.g. Tafadzwa Moyo" />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={studentForm.email} onChange={e => setStudentForm(p => ({ ...p, email: e.target.value }))} placeholder="student@giffordhigh.ac.zw" />
                </div>
                <div className="space-y-2">
                  <Label>Password *</Label>
                  <Input type="password" value={studentForm.password} onChange={e => setStudentForm(p => ({ ...p, password: e.target.value }))} placeholder="Initial password" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Grade *</Label>
                    <Select value={studentForm.grade} onValueChange={v => setStudentForm(p => ({ ...p, grade: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                      <SelectContent>{gradeOptions.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select value={studentForm.class_name} onValueChange={v => setStudentForm(p => ({ ...p, class_name: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{classOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Phone (Parent/Guardian)</Label>
                  <Input value={studentForm.phone} onChange={e => setStudentForm(p => ({ ...p, phone: e.target.value }))} placeholder="+263 7X XXX XXXX" />
                </div>
                <Button onClick={registerStudent} disabled={regLoading} className="w-full">
                  <GraduationCap className="mr-2 h-4 w-4" />
                  {regLoading ? "Registering..." : "Register Student"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Register Teacher Tab */}
          <TabsContent value="register-teacher">
            <Card className="max-w-lg">
              <CardHeader><CardTitle className="font-heading">Register New Teacher</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input value={teacherForm.full_name} onChange={e => setTeacherForm(p => ({ ...p, full_name: e.target.value }))} placeholder="e.g. Mr. Sibanda" />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={teacherForm.email} onChange={e => setTeacherForm(p => ({ ...p, email: e.target.value }))} placeholder="teacher@giffordhigh.ac.zw" />
                </div>
                <div className="space-y-2">
                  <Label>Password *</Label>
                  <Input type="password" value={teacherForm.password} onChange={e => setTeacherForm(p => ({ ...p, password: e.target.value }))} placeholder="Initial password" />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={teacherForm.department} onValueChange={v => setTeacherForm(p => ({ ...p, department: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>{departmentOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={teacherForm.phone} onChange={e => setTeacherForm(p => ({ ...p, phone: e.target.value }))} placeholder="+263 7X XXX XXXX" />
                </div>
                <Button onClick={registerTeacher} disabled={regLoading} className="w-full">
                  <UserPlus className="mr-2 h-4 w-4" />
                  {regLoading ? "Registering..." : "Register Teacher"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timetable Tab */}
          <TabsContent value="timetable">
            <Card>
              <CardHeader><CardTitle className="font-heading">Manage Timetable</CardTitle></CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center gap-4">
                  <Label>Class:</Label>
                  <Select>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {gradeOptions.flatMap(g => classOptions.map(c => (
                        <SelectItem key={`${g}${c}`} value={`${g}${c}`}>{g}{c}</SelectItem>
                      )))}
                    </SelectContent>
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
