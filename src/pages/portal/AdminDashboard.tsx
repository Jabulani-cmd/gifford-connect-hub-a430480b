import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Image, Users, Calendar, LogOut, Plus, Trash2, Upload, Layers } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const classes = ["Form 1A", "Form 1B", "Form 2A", "Form 2B", "Form 3A", "Form 3B", "Form 4A", "Form 4B"];

export default function AdminDashboard() {
  const { toast } = useToast();

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

  // Fetch data on mount
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
    const { error } = await supabase.from("announcements").insert({ title: newTitle, content: newText, is_public: true });
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

  const uploadImage = async (file: File, bucket: string, folder: string) => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleCarouselUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, "school-media", "carousel");
      const order = carouselImages.length;
      await supabase.from("carousel_images").insert({ image_url: url, display_order: order });
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
      const url = await uploadImage(file, "school-media", "gallery");
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
            <TabsTrigger value="register"><Users className="mr-1 h-4 w-4" /> Register Students</TabsTrigger>
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
                  <p className="text-sm text-muted-foreground">These images appear on the homepage carousel. Recommended size: 1920×1080px.</p>
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
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute right-2 top-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteCarouselImage(img.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                {carouselImages.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No carousel images yet. Upload one to get started.</p>
                )}
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
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteGalleryImage(img.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                {galleryImages.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No gallery images yet.</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Register Tab */}
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

          {/* Timetable Tab */}
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
