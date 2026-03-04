import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import ImageCropper from "@/components/ImageCropper";
import StaffManagement from "@/components/admin/StaffManagement";
import ProjectsManagement from "@/components/admin/ProjectsManagement";
import FacilitiesManagement from "@/components/admin/FacilitiesManagement";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Image, Users, Calendar, LogOut, Plus, Trash2, Upload, Layers, GraduationCap, UserPlus, Download, FileText, HandshakeIcon, Settings, UserCheck, Building, FolderKanban } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const gradeOptions = ["Form 1", "Form 2", "Form 3", "Form 4", "Lower 6", "Upper 6"];
const classOptions = ["A", "B", "C", "D"];
const departmentOptions = ["Mathematics", "Sciences", "Languages", "Humanities", "Technical", "Arts", "Sports"];
const downloadCategories = ["fees", "forms", "policies", "vacancies", "general"];
const meetingTypes = ["sgb", "parent-teacher", "general"];

export default function AdminDashboard() {
  const { toast } = useToast();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  // Announcements
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newText, setNewText] = useState("");

  // Carousel images
  const [carouselImages, setCarouselImages] = useState<any[]>([]);
  const carouselFileRef = useRef<HTMLInputElement>(null);
  const [carouselCropSrc, setCarouselCropSrc] = useState<string | null>(null);
  const [carouselCropOpen, setCarouselCropOpen] = useState(false);

  // Gallery images
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const galleryFileRef = useRef<HTMLInputElement>(null);
  const [galleryCaption, setGalleryCaption] = useState("");
  const [galleryCropSrc, setGalleryCropSrc] = useState<string | null>(null);
  const [galleryCropOpen, setGalleryCropOpen] = useState(false);

  // Downloads
  const [downloads, setDownloads] = useState<any[]>([]);
  const downloadFileRef = useRef<HTMLInputElement>(null);
  const [downloadTitle, setDownloadTitle] = useState("");
  const [downloadDesc, setDownloadDesc] = useState("");
  const [downloadCategory, setDownloadCategory] = useState("general");

  // Meetings
  const [meetings, setMeetings] = useState<any[]>([]);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDesc, setMeetingDesc] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingType, setMeetingType] = useState("general");
  const [meetingLocation, setMeetingLocation] = useState("");

  const [uploading, setUploading] = useState(false);

  // Site images (achievements etc.)
  const [achievementsImageUrl, setAchievementsImageUrl] = useState<string | null>(null);
  const achievementsFileRef = useRef<HTMLInputElement>(null);
  const [achievementsCropSrc, setAchievementsCropSrc] = useState<string | null>(null);
  const [achievementsCropOpen, setAchievementsCropOpen] = useState(false);

  // Principal photo
  const [principalPhotoUrl, setPrincipalPhotoUrl] = useState<string | null>(null);
  const principalFileRef = useRef<HTMLInputElement>(null);
  const [principalCropSrc, setPrincipalCropSrc] = useState<string | null>(null);
  const [principalCropOpen, setPrincipalCropOpen] = useState(false);

  // Student registration
  const [studentForm, setStudentForm] = useState({ full_name: "", email: "", password: "", grade: "", class_name: "", phone: "" });
  const [regLoading, setRegLoading] = useState(false);

  // Teacher registration
  const [teacherForm, setTeacherForm] = useState({ full_name: "", email: "", password: "", department: "", phone: "" });

  useEffect(() => {
    fetchAnnouncements();
    fetchCarouselImages();
    fetchGalleryImages();
    fetchDownloads();
    fetchMeetings();
    fetchSiteSettings();
  }, []);

  const fetchSiteSettings = async () => {
    const { data } = await supabase.from("site_settings").select("*").in("setting_key", ["achievements_image", "principal_photo"]);
    if (data) {
      data.forEach((s) => {
        if (s.setting_key === "achievements_image") setAchievementsImageUrl(s.setting_value);
        if (s.setting_key === "principal_photo") setPrincipalPhotoUrl(s.setting_value);
      });
    }
  };

  const handlePrincipalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPrincipalCropSrc(reader.result as string);
      setPrincipalCropOpen(true);
    };
    reader.readAsDataURL(file);
    if (principalFileRef.current) principalFileRef.current.value = "";
  };

  const handlePrincipalCropComplete = async (blob: Blob) => {
    setUploading(true);
    try {
      const file = new File([blob], `principal_${Date.now()}.jpg`, { type: "image/jpeg" });
      const url = await uploadFile(file, "site-images");
      const { data: existing } = await supabase.from("site_settings").select("id").eq("setting_key", "principal_photo");
      if (existing && existing.length > 0) {
        await supabase.from("site_settings").update({ setting_value: url, updated_at: new Date().toISOString() }).eq("setting_key", "principal_photo");
      } else {
        await supabase.from("site_settings").insert({ setting_key: "principal_photo", setting_value: url });
      }
      setPrincipalPhotoUrl(url);
      toast({ title: "Principal photo updated!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const handleAchievementsFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAchievementsCropSrc(reader.result as string);
      setAchievementsCropOpen(true);
    };
    reader.readAsDataURL(file);
    if (achievementsFileRef.current) achievementsFileRef.current.value = "";
  };

  const handleAchievementsCropComplete = async (blob: Blob) => {
    setUploading(true);
    try {
      const file = new File([blob], `achievements_${Date.now()}.jpg`, { type: "image/jpeg" });
      const url = await uploadFile(file, "site-images");
      const { data: existing } = await supabase.from("site_settings").select("id").eq("setting_key", "achievements_image");
      if (existing && existing.length > 0) {
        await supabase.from("site_settings").update({ setting_value: url, updated_at: new Date().toISOString() }).eq("setting_key", "achievements_image");
      } else {
        await supabase.from("site_settings").insert({ setting_key: "achievements_image", setting_value: url });
      }
      setAchievementsImageUrl(url);
      toast({ title: "Achievements image updated!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

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
  const fetchDownloads = async () => {
    const { data } = await supabase.from("downloads").select("*").order("created_at", { ascending: false });
    if (data) setDownloads(data);
  };
  const fetchMeetings = async () => {
    const { data } = await supabase.from("meetings").select("*").order("meeting_date", { ascending: true });
    if (data) setMeetings(data);
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

  const uploadFile = async (file: File | Blob, folder: string) => {
    const fileExtFromName = file instanceof File ? file.name.split(".").pop() : undefined;
    const mimeExt = file.type?.split("/")?.[1];
    const ext = fileExtFromName || mimeExt || "jpg";
    const path = `${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("school-media").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("school-media").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleCarouselFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCarouselCropSrc(reader.result as string);
      setCarouselCropOpen(true);
    };
    reader.readAsDataURL(file);
    if (carouselFileRef.current) carouselFileRef.current.value = "";
  };

  const handleCarouselCropComplete = async (blob: Blob) => {
    setUploading(true);
    try {
      const file = new File([blob], `carousel_${Date.now()}.jpg`, { type: "image/jpeg" });
      const url = await uploadFile(file, "carousel");
      const { error } = await supabase.from("carousel_images").insert({ image_url: url, display_order: carouselImages.length });
      if (error) throw error;
      toast({ title: "Carousel image added!" });
      fetchCarouselImages();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const deleteCarouselImage = async (id: string) => {
    await supabase.from("carousel_images").delete().eq("id", id);
    toast({ title: "Carousel image removed" });
    fetchCarouselImages();
  };

  const handleGalleryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setGalleryCropSrc(reader.result as string);
      setGalleryCropOpen(true);
    };
    reader.readAsDataURL(file);
    if (galleryFileRef.current) galleryFileRef.current.value = "";
  };

  const handleGalleryCropComplete = async (blob: Blob) => {
    setUploading(true);
    try {
      const file = new File([blob], `gallery_${Date.now()}.jpg`, { type: "image/jpeg" });
      const url = await uploadFile(file, "gallery");
      const { error } = await supabase.from("gallery_images").insert({ image_url: url, caption: galleryCaption || null });
      if (error) throw error;
      toast({ title: "Gallery image added!" });
      setGalleryCaption("");
      fetchGalleryImages();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const deleteGalleryImage = async (id: string) => {
    await supabase.from("gallery_images").delete().eq("id", id);
    toast({ title: "Gallery image removed" });
    fetchGalleryImages();
  };

  const handleDownloadUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !downloadTitle) {
      toast({ title: "Please enter a title first", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const url = await uploadFile(file, "downloads");
      const { error } = await supabase.from("downloads").insert({ title: downloadTitle, description: downloadDesc || null, file_url: url, category: downloadCategory });
      if (error) throw error;
      toast({ title: "Document uploaded!" });
      setDownloadTitle(""); setDownloadDesc(""); setDownloadCategory("general");
      fetchDownloads();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
    if (downloadFileRef.current) downloadFileRef.current.value = "";
  };

  const deleteDownload = async (id: string) => {
    await supabase.from("downloads").delete().eq("id", id);
    toast({ title: "Document removed" });
    fetchDownloads();
  };

  const addMeeting = async () => {
    if (!meetingTitle || !meetingDate) { toast({ title: "Title and date required", variant: "destructive" }); return; }
    const { error } = await supabase.from("meetings").insert({ title: meetingTitle, description: meetingDesc || null, meeting_date: meetingDate, meeting_type: meetingType, location: meetingLocation || null });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setMeetingTitle(""); setMeetingDesc(""); setMeetingDate(""); setMeetingLocation("");
    toast({ title: "Meeting scheduled!" });
    fetchMeetings();
  };

  const deleteMeeting = async (id: string) => {
    await supabase.from("meetings").delete().eq("id", id);
    toast({ title: "Meeting removed" });
    fetchMeetings();
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
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
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
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
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

  const meetingTypeLabels: Record<string, string> = { sgb: "SGB Meeting", "parent-teacher": "Parent-Teacher Meeting", general: "General" };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={schoolLogo} alt="Gifford High School crest" className="h-16 w-16 object-contain" />
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
            { label: "Downloads", value: String(downloads.length), icon: Download },
            { label: "Meetings", value: String(meetings.length), icon: HandshakeIcon },
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
            <TabsTrigger value="downloads"><Download className="mr-1 h-4 w-4" /> Downloads</TabsTrigger>
            <TabsTrigger value="meetings"><HandshakeIcon className="mr-1 h-4 w-4" /> SGB / Meetings</TabsTrigger>
            <TabsTrigger value="register-student"><GraduationCap className="mr-1 h-4 w-4" /> Register Student</TabsTrigger>
            <TabsTrigger value="register-teacher"><UserPlus className="mr-1 h-4 w-4" /> Register Teacher</TabsTrigger>
            <TabsTrigger value="timetable"><Calendar className="mr-1 h-4 w-4" /> Timetables</TabsTrigger>
            <TabsTrigger value="site-images"><Settings className="mr-1 h-4 w-4" /> Site Images</TabsTrigger>
            <TabsTrigger value="staff-mgmt"><UserCheck className="mr-1 h-4 w-4" /> Staff</TabsTrigger>
            <TabsTrigger value="facilities"><Building className="mr-1 h-4 w-4" /> Facilities</TabsTrigger>
            <TabsTrigger value="projects"><FolderKanban className="mr-1 h-4 w-4" /> Projects</TabsTrigger>
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
                      <Button variant="ghost" size="icon" onClick={() => deleteAnnouncement(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Carousel Tab */}
          <TabsContent value="carousel">
            {carouselCropSrc && (
              <ImageCropper
                imageSrc={carouselCropSrc}
                open={carouselCropOpen}
                onClose={() => { setCarouselCropOpen(false); setCarouselCropSrc(null); }}
                onCropComplete={handleCarouselCropComplete}
                aspectRatio={16 / 9}
                cropShape="rect"
                title="Crop Carousel Image"
              />
            )}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="font-heading">Upload Carousel Image</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">Recommended: 1920×1080px.</p>
                  <input type="file" accept="image/*" ref={carouselFileRef} onChange={handleCarouselFileSelect} className="hidden" />
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
            {galleryCropSrc && (
              <ImageCropper
                imageSrc={galleryCropSrc}
                open={galleryCropOpen}
                onClose={() => { setGalleryCropOpen(false); setGalleryCropSrc(null); }}
                onCropComplete={handleGalleryCropComplete}
                aspectRatio={4 / 3}
                cropShape="rect"
                title="Crop Gallery Image"
              />
            )}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="font-heading">Upload Gallery Image</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Caption (optional)</Label>
                    <Input value={galleryCaption} onChange={e => setGalleryCaption(e.target.value)} placeholder="e.g. Inter-house Athletics 2026" />
                  </div>
                  <input type="file" accept="image/*" ref={galleryFileRef} onChange={handleGalleryFileSelect} className="hidden" />
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

          {/* Downloads Tab */}
          <TabsContent value="downloads">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="font-heading">Upload Document</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><Label>Title *</Label><Input value={downloadTitle} onChange={e => setDownloadTitle(e.target.value)} placeholder="e.g. Fee Structure 2026" /></div>
                  <div className="space-y-2"><Label>Description</Label><Input value={downloadDesc} onChange={e => setDownloadDesc(e.target.value)} placeholder="Brief description" /></div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={downloadCategory} onValueChange={setDownloadCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {downloadCategories.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <input type="file" ref={downloadFileRef} onChange={handleDownloadUpload} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" />
                  <Button onClick={() => { if (!downloadTitle) { toast({ title: "Enter a title first", variant: "destructive" }); return; } downloadFileRef.current?.click(); }} disabled={uploading}>
                    <Upload className="mr-1 h-4 w-4" /> {uploading ? "Uploading…" : "Choose File"}
                  </Button>
                </CardContent>
              </Card>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                <h3 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider">Documents ({downloads.length})</h3>
                {downloads.map(d => (
                  <Card key={d.id}>
                    <CardContent className="flex items-start justify-between p-4">
                      <div className="flex items-start gap-3">
                        <FileText className="mt-1 h-5 w-5 text-primary shrink-0" />
                        <div>
                          <h3 className="font-semibold">{d.title}</h3>
                          {d.description && <p className="text-sm text-muted-foreground">{d.description}</p>}
                          <span className="text-xs text-accent">{d.category}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteDownload(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* SGB / Meetings Tab */}
          <TabsContent value="meetings">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="font-heading">Schedule Meeting</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><Label>Title *</Label><Input value={meetingTitle} onChange={e => setMeetingTitle(e.target.value)} placeholder="e.g. SGB Quarter 1 Meeting" /></div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={meetingType} onValueChange={setMeetingType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {meetingTypes.map(t => <SelectItem key={t} value={t}>{meetingTypeLabels[t]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Date & Time *</Label><Input type="datetime-local" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Location</Label><Input value={meetingLocation} onChange={e => setMeetingLocation(e.target.value)} placeholder="e.g. School Hall" /></div>
                  <div className="space-y-2"><Label>Description</Label><Textarea value={meetingDesc} onChange={e => setMeetingDesc(e.target.value)} rows={2} /></div>
                  <Button onClick={addMeeting} disabled={!meetingTitle || !meetingDate}><Plus className="mr-1 h-4 w-4" /> Schedule Meeting</Button>
                </CardContent>
              </Card>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                <h3 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider">Scheduled Meetings ({meetings.length})</h3>
                {meetings.map(m => (
                  <Card key={m.id}>
                    <CardContent className="flex items-start justify-between p-4">
                      <div>
                        <span className="inline-block rounded-full bg-maroon-light px-2 py-0.5 text-xs font-semibold text-primary">{meetingTypeLabels[m.meeting_type] || m.meeting_type}</span>
                        <h3 className="mt-1 font-semibold">{m.title}</h3>
                        <p className="text-sm text-muted-foreground">{new Date(m.meeting_date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p>
                        {m.location && <p className="text-xs text-accent">📍 {m.location}</p>}
                        {m.description && <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteMeeting(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </CardContent>
                  </Card>
                ))}
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

          {/* Site Images Tab */}
          <TabsContent value="site-images">
            {/* Principal Photo Cropper */}
            {principalCropSrc && (
              <ImageCropper
                imageSrc={principalCropSrc}
                open={principalCropOpen}
                onClose={() => { setPrincipalCropOpen(false); setPrincipalCropSrc(null); }}
                onCropComplete={handlePrincipalCropComplete}
                aspectRatio={3 / 4}
                cropShape="rect"
                title="Crop Principal Photo"
              />
            )}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Principal Photo */}
              <Card>
                <CardHeader><CardTitle className="font-heading">Principal Photo</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">This photo appears on the homepage in the "From the Principal's Desk" section.</p>
                  <input type="file" accept="image/*" ref={principalFileRef} onChange={handlePrincipalFileSelect} className="hidden" />
                  <Button onClick={() => principalFileRef.current?.click()} disabled={uploading}>
                    <Upload className="mr-1 h-4 w-4" /> {uploading ? "Uploading…" : "Upload Principal Photo"}
                  </Button>
                  {principalPhotoUrl && (
                    <img src={principalPhotoUrl} alt="Principal" className="mt-2 h-48 w-36 rounded-lg border object-cover object-top" />
                  )}
                </CardContent>
              </Card>

              {/* Achievements Image */}
              {achievementsCropSrc && (
                <ImageCropper
                  imageSrc={achievementsCropSrc}
                  open={achievementsCropOpen}
                  onClose={() => { setAchievementsCropOpen(false); setAchievementsCropSrc(null); }}
                  onCropComplete={handleAchievementsCropComplete}
                  aspectRatio={16 / 9}
                  cropShape="rect"
                  title="Crop Achievements Image"
                />
              )}
              <Card>
                <CardHeader><CardTitle className="font-heading">Achievements Section Image</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">This image appears on the homepage next to the "Celebrating Achievement" section.</p>
                  <input type="file" accept="image/*" ref={achievementsFileRef} onChange={handleAchievementsFileSelect} className="hidden" />
                  <Button onClick={() => achievementsFileRef.current?.click()} disabled={uploading}>
                    <Upload className="mr-1 h-4 w-4" /> {uploading ? "Uploading…" : "Upload Image"}
                  </Button>
                  {achievementsImageUrl && (
                    <img src={achievementsImageUrl} alt="Achievements section" className="mt-2 rounded-lg border max-h-64 w-full object-cover" />
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Staff Management Tab */}
          <TabsContent value="staff-mgmt">
            <StaffManagement />
          </TabsContent>

          {/* Facilities Tab */}
          <TabsContent value="facilities">
            <FacilitiesManagement />
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <ProjectsManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
