// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  UserPlus,
  Users,
  Search,
  Shield,
  Trash2,
  KeyRound,
  Pencil,
  FileSpreadsheet,
  Loader2,
  Camera,
  Upload,
  X,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import BulkUserImport from "./BulkUserImport";
import ImageCropper from "@/components/ImageCropper";
import WebcamCapture from "@/components/WebcamCapture";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const portalRoles = [
  { value: "admin", label: "System Administrator" },
  { value: "admin_supervisor", label: "Admin Supervisor" },
  { value: "principal", label: "Principal" },
  { value: "deputy_principal", label: "Deputy Principal" },
  { value: "hod", label: "Head of Department" },
  { value: "finance", label: "Finance Admin Clerk" },
  { value: "teacher", label: "Teacher" },
  { value: "student", label: "Student" },
  { value: "parent", label: "Parent" },
];

const staffRoles = [
  { value: "principal", label: "Principal" },
  { value: "deputy_principal", label: "Deputy Principal" },
  { value: "hod", label: "Head of Department (HOD)" },
  { value: "teacher", label: "Teacher" },
  { value: "senior_teacher", label: "Senior Teacher" },
  { value: "librarian", label: "Librarian" },
  { value: "lab_technician", label: "Lab Technician" },
  { value: "sports_director", label: "Sports Director" },
  { value: "bursar", label: "Bursar" },
  { value: "secretary", label: "Secretary" },
  { value: "groundsman", label: "Groundsman" },
  { value: "matron", label: "Matron" },
];

const staffRoleLabels: Record<string, string> = Object.fromEntries(staffRoles.map((r) => [r.value, r.label]));

const departmentOptions = [
  "Mathematics",
  "Sciences",
  "Languages",
  "Humanities",
  "Technical",
  "Arts",
  "Sports",
  "Administration",
];
const gradeOptions = ["Form 1", "Form 2", "Form 3", "Form 4", "Lower 6", "Upper 6"];
const subjectsList = [
  "Mathematics",
  "English",
  "Shona",
  "Ndebele",
  "History",
  "Geography",
  "Physics",
  "Chemistry",
  "Biology",
  "Accounts",
  "Commerce",
  "Computer Science",
  "Agriculture",
  "Technical Graphics",
  "Food & Nutrition",
  "Fashion & Fabrics",
  "Music",
  "Art",
  "Physical Education",
];

interface ManagedUser {
  id: string;
  email: string;
  full_name: string;
  portal_role: string;
  staff_role?: string;
  department?: string;
  created_at: string;
}

interface ClassOption {
  id: string;
  name: string;
  form_level: string | null;
}

export default function UserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const createFileRef = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  // Photo state for create
  const [createPhotoBlob, setCreatePhotoBlob] = useState<Blob | null>(null);
  const [createPhotoPreview, setCreatePhotoPreview] = useState<string | null>(null);
  const [showCreateCropper, setShowCreateCropper] = useState(false);
  const [createCropSrc, setCreateCropSrc] = useState("");
  const [showCreateWebcam, setShowCreateWebcam] = useState(false);

  // Photo state for edit
  const [editPhotoBlob, setEditPhotoBlob] = useState<Blob | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [showEditCropper, setShowEditCropper] = useState(false);
  const [editCropSrc, setEditCropSrc] = useState("");
  const [showEditWebcam, setShowEditWebcam] = useState(false);

  // Create user form
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    portal_role: "teacher" as string,
    staff_role: "teacher" as string,
    department: "",
    phone: "",
    grade: "",
    class_name: "",
    assigned_class_id: "",
  });
  const [creating, setCreating] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, mode: "create" | "edit") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (mode === "create") {
      setCreateCropSrc(url);
      setShowCreateCropper(true);
    } else {
      setEditCropSrc(url);
      setShowEditCropper(true);
    }
    e.target.value = "";
  };

  const handleWebcamCapture = (blob: Blob, mode: "create" | "edit") => {
    const url = URL.createObjectURL(blob);
    if (mode === "create") {
      setCreateCropSrc(url);
      setShowCreateCropper(true);
    } else {
      setEditCropSrc(url);
      setShowEditCropper(true);
    }
  };

  const uploadPhoto = async (blob: Blob, userId: string, role: string): Promise<string | null> => {
    const folder = role === "student" ? "profile-photos/students" : "profile-photos/staff";
    const ext = "jpg";
    const path = `${folder}/${userId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("school-media")
      .upload(path, blob, { contentType: "image/jpeg", upsert: true });
    if (error) {
      console.error("Photo upload error:", error);
      return null;
    }
    const { data: urlData } = supabase.storage.from("school-media").getPublicUrl(path);
    return urlData.publicUrl;
  };

  useEffect(() => {
    fetchUsers();
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const { data } = await supabase.from("classes").select("id, name, form_level").order("name");
      if (data) setClasses(data);
    } catch (err) {
      console.error("Failed to fetch classes:", err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 1. Fetch staff users via Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: "Session expired", description: "Please log in again.", variant: "destructive" });
        setLoading(false);
        return;
      }
      const token = session.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: "list-users" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const staffUsersFromEdge: ManagedUser[] = data.users || [];

      // 2. Fetch staff users directly from staff table (as backup)
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("id, user_id, staff_number, full_name, role, department, email, phone")
        .not("user_id", "is", null)
        .is("deleted_at", null);
      if (staffError) console.error("Staff fetch error:", staffError);
      const staffUsersFromTable: ManagedUser[] = (staffData || []).map((s: any) => ({
        id: s.user_id,
        email: s.email || `${s.staff_number}@giffordhigh.ac.zw`,
        full_name: s.full_name,
        portal_role: s.role === "admin" ? "admin" : "teacher", // adjust as needed
        staff_role: s.role,
        department: s.department,
        created_at: new Date().toISOString(),
      }));

      // 3. Fetch student users from students table (active only)
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, user_id, admission_number, full_name, enrollment_date")
        .is("deleted_at", null)
        .not("user_id", "is", null);
      if (studentsError) throw studentsError;

      const studentUsers: ManagedUser[] = (studentsData || []).map((s: any) => ({
        id: s.user_id,
        email: `ghs${s.admission_number.toLowerCase().replace(/^ghs/, '')}@giffordhigh.ac.zw`,
        full_name: s.full_name,
        portal_role: "student",
        staff_role: undefined,
        department: undefined,
        created_at: s.enrollment_date,
      }));

      // 4. Merge all sources (avoid duplicates by id)
      const combined = [...staffUsersFromEdge];
      for (const staff of staffUsersFromTable) {
        if (!combined.some(u => u.id === staff.id)) {
          combined.push(staff);
        }
      }
      for (const student of studentUsers) {
        if (!combined.some(u => u.id === student.id)) {
          combined.push(student);
        }
      }

      setUsers(combined);
    } catch (err: any) {
      console.error("Failed to fetch users:", err);
      toast({ title: "Error loading users", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    // ... (unchanged) ...
  };

  // ... (rest of the component remains the same) ...