import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Search, Edit, Trash2, Eye, Upload, Download, AlertTriangle, User, LinkIcon, Copy } from "lucide-react";
import { studentFormSchema, type StudentFormData, zimPhoneRegex } from "@/lib/validators";
import ImageCropper from "@/components/ImageCropper";

const formOptions = ["Form 1", "Form 2", "Form 3", "Form 4", "Lower 6", "Upper 6"];
const streamOptions = ["A", "B", "C", "D", "Arts", "Sciences", "Commercials"];
const statusOptions = ["active", "graduated", "withdrawn"];
const genderOptions = ["Male", "Female"];

type Student = {
  id: string;
  admission_number: string;
  full_name: string;
  date_of_birth: string | null;
  form: string;
  stream: string | null;
  subject_combination: string | null;
  gender: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  emergency_contact: string | null;
  medical_conditions: string | null;
  has_medical_alert: boolean;
  address: string | null;
  enrollment_date: string | null;
  status: string;
  profile_photo_url: string | null;
  deleted_at: string | null;
  created_at: string;
};

const emptyForm: StudentFormData = {
  admission_number: "",
  full_name: "",
  date_of_birth: "",
  form: "Form 1",
  stream: "",
  subject_combination: "",
  gender: "",
  guardian_name: "",
  guardian_phone: "",
  guardian_email: "",
  emergency_contact: "",
  medical_conditions: "",
  has_medical_alert: false,
  address: "",
  enrollment_date: new Date().toISOString().split("T")[0],
  status: "active",
};

export default function StudentManagement() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterForm, setFilterForm] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState<StudentFormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Photo upload
  const photoRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .is("deleted_at", null)
      .order("full_name");
    if (data) setStudents(data as Student[]);
    if (error) toast({ title: "Error loading students", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  const filtered = students.filter(s => {
    const matchSearch = s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.admission_number.toLowerCase().includes(search.toLowerCase());
    const matchForm = filterForm === "all" || s.form === filterForm;
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchSearch && matchForm && matchStatus;
  });

  const openAdd = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setPhotoUrl(null);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (s: Student) => {
    setEditingId(s.id);
    setFormData({
      admission_number: s.admission_number,
      full_name: s.full_name,
      date_of_birth: s.date_of_birth || "",
      form: s.form,
      stream: s.stream || "",
      subject_combination: s.subject_combination || "",
      gender: s.gender || "",
      guardian_name: s.guardian_name || "",
      guardian_phone: s.guardian_phone || "",
      guardian_email: s.guardian_email || "",
      emergency_contact: s.emergency_contact || "",
      medical_conditions: s.medical_conditions || "",
      has_medical_alert: s.has_medical_alert,
      address: s.address || "",
      enrollment_date: s.enrollment_date || "",
      status: s.status,
    });
    setPhotoUrl(s.profile_photo_url);
    setErrors({});
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const result = studentFormSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(e => { fieldErrors[e.path[0] as string] = e.message; });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSaving(true);

    const payload = { ...result.data, profile_photo_url: photoUrl };

    if (editingId) {
      const { error } = await supabase.from("students").update(payload).eq("id", editingId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Student updated!" });
    } else {
      const { error } = await supabase.from("students").insert(payload as any);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Student added!" });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchStudents();
  };

  const handleDelete = async (id: string) => {
    // Soft delete
    const { error } = await supabase.from("students").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Student removed" }); fetchStudents(); }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setCropSrc(reader.result as string); setCropOpen(true); };
    reader.readAsDataURL(file);
    if (photoRef.current) photoRef.current.value = "";
  };

  const handleCropComplete = async (blob: Blob) => {
    setUploading(true);
    try {
      const path = `students/${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("profile-photos").upload(path, blob, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("profile-photos").getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
      toast({ title: "Photo uploaded!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const exportCSV = () => {
    const headers = ["Admission #", "Full Name", "Form", "Stream", "Gender", "Guardian Phone", "Status"];
    const rows = filtered.map(s => [s.admission_number, s.full_name, s.form, s.stream || "", s.gender || "", s.guardian_phone || "", s.status]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "students.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const updateField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const statusColor = (s: string) => {
    if (s === "active") return "bg-green-100 text-green-800";
    if (s === "graduated") return "bg-blue-100 text-blue-800";
    return "bg-orange-100 text-orange-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-heading text-2xl font-bold text-foreground">Student Management</h2>
        <div className="flex gap-2">
          <Button onClick={exportCSV} variant="outline" size="sm"><Download className="mr-1 h-4 w-4" /> Export CSV</Button>
          <Button onClick={openAdd} className="bg-secondary text-secondary-foreground hover:bg-secondary/90"><Plus className="mr-1 h-4 w-4" /> Add Student</Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name or admission #..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterForm} onValueChange={setFilterForm}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Form" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Forms</SelectItem>
              {formOptions.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statusOptions.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Photo</TableHead>
                <TableHead>Admission #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Form/Stream</TableHead>
                <TableHead>Guardian Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No students found. Click "Add Student" to get started.</TableCell></TableRow>
              ) : filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell>
                    {s.profile_photo_url ? (
                      <img src={s.profile_photo_url} alt={s.full_name} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-maroon-light">
                        <User className="h-4 w-4 text-secondary" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{s.admission_number}</TableCell>
                  <TableCell className="font-medium">
                    {s.full_name}
                    {s.has_medical_alert && <AlertTriangle className="ml-1 inline h-4 w-4 text-destructive" />}
                  </TableCell>
                  <TableCell>{s.form}{s.stream ? ` / ${s.stream}` : ""}</TableCell>
                  <TableCell>{s.guardian_phone || "—"}</TableCell>
                  <TableCell><Badge className={statusColor(s.status)}>{s.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedStudent(s); setProfileOpen(true); }}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Student?</AlertDialogTitle>
                            <AlertDialogDescription>This will soft-delete {s.full_name}. The record can be restored later.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-destructive text-destructive-foreground">Remove</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editingId ? "Edit Student" : "Add New Student"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Photo */}
            <div className="sm:col-span-2 flex items-center gap-4">
              {photoUrl ? (
                <img src={photoUrl} alt="Preview" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-maroon-light"><User className="h-8 w-8 text-secondary" /></div>
              )}
              <div>
                <input type="file" accept="image/*" ref={photoRef} onChange={handlePhotoSelect} className="hidden" />
                <Button variant="outline" size="sm" onClick={() => photoRef.current?.click()} disabled={uploading}>
                  <Upload className="mr-1 h-4 w-4" /> {uploading ? "Uploading..." : "Upload Photo"}
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Admission Number *</Label>
              <Input value={formData.admission_number} onChange={e => updateField("admission_number", e.target.value)} />
              {errors.admission_number && <p className="text-xs text-destructive">{errors.admission_number}</p>}
            </div>
            <div className="space-y-1">
              <Label>Full Name *</Label>
              <Input value={formData.full_name} onChange={e => updateField("full_name", e.target.value)} />
              {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
            </div>
            <div className="space-y-1">
              <Label>Date of Birth</Label>
              <Input type="date" value={formData.date_of_birth || ""} onChange={e => updateField("date_of_birth", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Gender</Label>
              <Select value={formData.gender || ""} onValueChange={v => updateField("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{genderOptions.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Form *</Label>
              <Select value={formData.form} onValueChange={v => updateField("form", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{formOptions.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Stream</Label>
              <Select value={formData.stream || ""} onValueChange={v => updateField("stream", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{streamOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Subject Combination</Label>
              <Input value={formData.subject_combination || ""} onChange={e => updateField("subject_combination", e.target.value)} placeholder="e.g. Maths, Physics, Chemistry" />
            </div>
            <div className="space-y-1">
              <Label>Guardian Name</Label>
              <Input value={formData.guardian_name || ""} onChange={e => updateField("guardian_name", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Guardian Phone</Label>
              <Input value={formData.guardian_phone || ""} onChange={e => updateField("guardian_phone", e.target.value)} placeholder="07XXXXXXXX" />
              {errors.guardian_phone && <p className="text-xs text-destructive">{errors.guardian_phone}</p>}
            </div>
            <div className="space-y-1">
              <Label>Guardian Email</Label>
              <Input value={formData.guardian_email || ""} onChange={e => updateField("guardian_email", e.target.value)} type="email" />
            </div>
            <div className="space-y-1">
              <Label>Emergency Contact</Label>
              <Input value={formData.emergency_contact || ""} onChange={e => updateField("emergency_contact", e.target.value)} placeholder="07XXXXXXXX" />
              {errors.emergency_contact && <p className="text-xs text-destructive">{errors.emergency_contact}</p>}
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Address</Label>
              <Textarea value={formData.address || ""} onChange={e => updateField("address", e.target.value)} rows={2} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Medical Conditions</Label>
              <Textarea value={formData.medical_conditions || ""} onChange={e => updateField("medical_conditions", e.target.value)} rows={2} />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox checked={formData.has_medical_alert} onCheckedChange={v => updateField("has_medical_alert", !!v)} id="medical-alert" />
              <Label htmlFor="medical-alert" className="text-sm text-destructive font-medium">Has Medical Alert</Label>
            </div>
            <div className="space-y-1">
              <Label>Enrollment Date</Label>
              <Input type="date" value={formData.enrollment_date || ""} onChange={e => updateField("enrollment_date", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={v => updateField("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              {saving ? "Saving..." : editingId ? "Update Student" : "Add Student"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Cropper */}
      {cropSrc && (
        <ImageCropper
          imageSrc={cropSrc}
          open={cropOpen}
          onClose={() => { setCropOpen(false); setCropSrc(null); }}
          onCropComplete={handleCropComplete}
          aspectRatio={1}
          cropShape="round"
          title="Crop Student Photo"
        />
      )}

      {/* Student Profile Modal */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedStudent && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading flex items-center gap-3">
                  {selectedStudent.profile_photo_url ? (
                    <img src={selectedStudent.profile_photo_url} alt={selectedStudent.full_name} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-maroon-light"><User className="h-6 w-6 text-secondary" /></div>
                  )}
                  {selectedStudent.full_name}
                  {selectedStudent.has_medical_alert && <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" /> Medical Alert</Badge>}
                </DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="personal">
                <TabsList className="w-full flex-wrap">
                  <TabsTrigger value="personal">Personal Info</TabsTrigger>
                  <TabsTrigger value="academics">Academics</TabsTrigger>
                  <TabsTrigger value="fees">Fees</TabsTrigger>
                  <TabsTrigger value="attendance">Attendance</TabsTrigger>
                  <TabsTrigger value="boarding">Boarding</TabsTrigger>
                </TabsList>
                <TabsContent value="personal" className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ["Admission #", selectedStudent.admission_number],
                      ["Form", selectedStudent.form],
                      ["Stream", selectedStudent.stream],
                      ["Gender", selectedStudent.gender],
                      ["Date of Birth", selectedStudent.date_of_birth],
                      ["Subject Combination", selectedStudent.subject_combination],
                      ["Guardian", selectedStudent.guardian_name],
                      ["Guardian Phone", selectedStudent.guardian_phone],
                      ["Guardian Email", selectedStudent.guardian_email],
                      ["Emergency Contact", selectedStudent.emergency_contact],
                      ["Address", selectedStudent.address],
                      ["Enrollment Date", selectedStudent.enrollment_date],
                      ["Status", selectedStudent.status],
                    ].map(([label, value]) => (
                      <div key={label as string}>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="font-medium">{value || "—"}</p>
                      </div>
                    ))}
                  </div>
                  {selectedStudent.medical_conditions && (
                    <div className={`rounded-lg p-3 ${selectedStudent.has_medical_alert ? "bg-destructive/10 border border-destructive/30" : "bg-muted"}`}>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Medical Conditions</p>
                      <p className={`text-sm ${selectedStudent.has_medical_alert ? "text-destructive font-medium" : ""}`}>{selectedStudent.medical_conditions}</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="academics">
                  <div className="py-8 text-center text-muted-foreground">
                    <p className="text-lg font-medium">Academic records</p>
                    <p className="text-sm">Grades and subject enrollment will appear here.</p>
                  </div>
                </TabsContent>
                <TabsContent value="fees">
                  <div className="py-8 text-center text-muted-foreground">
                    <p className="text-lg font-medium">Fee Records</p>
                    <p className="text-sm">Invoice summary and balances (USD/ZiG) will appear here.</p>
                  </div>
                </TabsContent>
                <TabsContent value="attendance">
                  <div className="py-8 text-center text-muted-foreground">
                    <p className="text-lg font-medium">Attendance</p>
                    <p className="text-sm">Attendance charts will appear here.</p>
                  </div>
                </TabsContent>
                <TabsContent value="boarding">
                  <div className="py-8 text-center text-muted-foreground">
                    <p className="text-lg font-medium">Boarding</p>
                    <p className="text-sm">Room allocation details will appear here.</p>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
