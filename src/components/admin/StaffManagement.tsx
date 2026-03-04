import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Upload, Edit2, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import schoolLogo from "@/assets/school-logo.png";

const categoryOptions = [
  { value: "leadership", label: "Leadership" },
  { value: "teaching", label: "Teaching Staff" },
  { value: "admin", label: "Admin Staff" },
  { value: "general", label: "General Staff" },
];

const departmentOptions = ["Mathematics", "Sciences", "Languages", "Humanities", "Technical", "Arts", "Sports", "Administration"];

type StaffMember = {
  id: string;
  full_name: string;
  title: string | null;
  department: string | null;
  bio: string | null;
  photo_url: string | null;
  email: string | null;
  phone: string | null;
  category: string;
};

export default function StaffManagement() {
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [groupPhotoUrl, setGroupPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New staff form
  const [form, setForm] = useState({
    full_name: "", title: "", department: "", bio: "", email: "", phone: "", category: "teaching"
  });
  const photoFileRef = useRef<HTMLInputElement>(null);
  const groupPhotoRef = useRef<HTMLInputElement>(null);
  const editPhotoRef = useRef<HTMLInputElement>(null);

  // Filter
  const [filterCategory, setFilterCategory] = useState("all");

  useEffect(() => {
    fetchStaff();
    fetchGroupPhoto();
  }, []);

  const fetchStaff = async () => {
    const { data } = await supabase.from("staff").select("*").order("full_name");
    if (data) setStaff(data as StaffMember[]);
  };

  const fetchGroupPhoto = async () => {
    const { data } = await supabase.from("site_settings").select("setting_value").eq("setting_key", "staff_group_photo").limit(1);
    if (data && data.length > 0) setGroupPhotoUrl(data[0].setting_value);
  };

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("school-media").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("school-media").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleGroupPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, "staff");
      const { data: existing } = await supabase.from("site_settings").select("id").eq("setting_key", "staff_group_photo");
      if (existing && existing.length > 0) {
        await supabase.from("site_settings").update({ setting_value: url, updated_at: new Date().toISOString() }).eq("setting_key", "staff_group_photo");
      } else {
        await supabase.from("site_settings").insert({ setting_key: "staff_group_photo", setting_value: url });
      }
      setGroupPhotoUrl(url);
      toast({ title: "Group photo updated!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
    if (groupPhotoRef.current) groupPhotoRef.current.value = "";
  };

  const addStaffMember = async () => {
    if (!form.full_name) { toast({ title: "Name is required", variant: "destructive" }); return; }

    // Check if a photo was selected
    const photoFile = photoFileRef.current?.files?.[0];
    let photo_url: string | null = null;

    setUploading(true);
    try {
      if (photoFile) {
        photo_url = await uploadFile(photoFile, "staff");
      }
      const { error } = await supabase.from("staff").insert({
        full_name: form.full_name,
        title: form.title || null,
        department: form.department || null,
        bio: form.bio || null,
        email: form.email || null,
        phone: form.phone || null,
        category: form.category,
        photo_url,
      });
      if (error) throw error;
      toast({ title: "Staff member added!" });
      setForm({ full_name: "", title: "", department: "", bio: "", email: "", phone: "", category: "teaching" });
      if (photoFileRef.current) photoFileRef.current.value = "";
      fetchStaff();
    } catch (err: any) {
      toast({ title: "Failed to add staff", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const deleteStaff = async (id: string) => {
    await supabase.from("staff").delete().eq("id", id);
    toast({ title: "Staff member removed" });
    fetchStaff();
  };

  const updateStaffPhoto = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, "staff");
      await supabase.from("staff").update({ photo_url: url }).eq("id", id);
      toast({ title: "Photo updated!" });
      fetchStaff();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const updateStaffCategory = async (id: string, category: string) => {
    await supabase.from("staff").update({ category }).eq("id", id);
    toast({ title: "Category updated" });
    fetchStaff();
  };

  const filteredStaff = filterCategory === "all" ? staff : staff.filter(s => s.category === filterCategory);
  const categoryLabel = (c: string) => categoryOptions.find(o => o.value === c)?.label || c;

  return (
    <div className="space-y-8">
      {/* Group Photo Section */}
      <Card>
        <CardHeader><CardTitle className="font-heading">Staff Group Photo</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">This photo appears at the top of the Staff page.</p>
          <div className="flex items-start gap-6">
            <div>
              <input type="file" accept="image/*" ref={groupPhotoRef} onChange={handleGroupPhotoUpload} className="hidden" />
              <Button onClick={() => groupPhotoRef.current?.click()} disabled={uploading}>
                <Upload className="mr-1 h-4 w-4" /> {uploading ? "Uploading…" : "Upload Group Photo"}
              </Button>
            </div>
            {groupPhotoUrl && (
              <img src={groupPhotoUrl} alt="Staff group" className="max-h-40 rounded-lg border object-cover" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add New Staff Member */}
      <Card>
        <CardHeader><CardTitle className="font-heading">Add Staff Member</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="e.g. Mr. T. Moyo" />
            </div>
            <div className="space-y-2">
              <Label>Title / Position</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Principal, HOD Science" />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={form.department} onValueChange={v => setForm(p => ({ ...p, department: v }))}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departmentOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@giffordhigh.ac.zw" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+263 7X XXX XXXX" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Bio / Portfolio</Label>
              <Textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={3} placeholder="Brief description of qualifications, subjects taught, responsibilities..." />
            </div>
            <div className="space-y-2">
              <Label>Photo</Label>
              <input type="file" accept="image/*" ref={photoFileRef} className="block text-sm file:mr-4 file:rounded-md file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-secondary-foreground hover:file:bg-secondary/90" />
            </div>
          </div>
          <Button onClick={addStaffMember} disabled={uploading || !form.full_name} className="mt-4">
            <Plus className="mr-1 h-4 w-4" /> Add Staff Member
          </Button>
        </CardContent>
      </Card>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading">Staff Directory ({staff.length})</CardTitle>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoryOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredStaff.map(member => (
              <div key={member.id} className="flex items-center gap-4 rounded-lg border p-3">
                <div className="relative shrink-0">
                  {member.photo_url ? (
                    <img src={member.photo_url} alt={member.full_name} className="h-16 w-16 rounded-full object-cover object-top" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-maroon-light">
                      <span className="font-heading text-xl font-bold text-primary">{member.full_name[0]}</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id={`photo-${member.id}`}
                    onChange={(e) => updateStaffPhoto(member.id, e)}
                  />
                  <button
                    onClick={() => document.getElementById(`photo-${member.id}`)?.click()}
                    className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/90"
                    title="Change photo"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">{member.full_name}</h4>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {member.title && <span>{member.title}</span>}
                    {member.department && <span>• {member.department}</span>}
                  </div>
                  <span className="inline-block mt-1 rounded-full bg-maroon-light px-2 py-0.5 text-xs font-medium text-primary">
                    {categoryLabel(member.category)}
                  </span>
                  {member.bio && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{member.bio}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Select value={member.category} onValueChange={(v) => updateStaffCategory(member.id, v)}>
                    <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => deleteStaff(member.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {filteredStaff.length === 0 && (
              <p className="text-center text-sm text-muted-foreground italic py-8">No staff members in this category.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
