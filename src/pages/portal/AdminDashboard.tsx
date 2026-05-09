// @ts-nocheck
import { useState, useEffect, useRef, useMemo } from "react";
import { useTimeSlots } from "@/hooks/useTimeSlots";
import { Link, useNavigate } from "react-router-dom";

import AcademicManagement from "@/pages/admin/AcademicManagement";
import AdminAttendanceViewer from "@/components/admin/AdminAttendanceViewer";
import VerificationCodesManager from "@/components/admin/VerificationCodesManager";
import ImageCropper from "@/components/ImageCropper";
import StaffManagement from "@/components/admin/StaffManagement";
import ProjectsManagement from "@/components/admin/ProjectsManagement";
import AwardsManagement from "@/components/admin/AwardsManagement";
import FacilitiesManagement from "@/components/admin/FacilitiesManagement";
import SiteLogosManagement from "@/components/admin/SiteLogosManagement";
import StudentManagement from "@/pages/admin/StudentManagement";
import StaffManagementFull from "@/pages/admin/StaffManagementFull";
import BoardingManagement from "@/pages/admin/BoardingManagement";
import InventoryManagement from "@/pages/admin/InventoryManagement";
import CommunicationModule from "@/pages/admin/CommunicationModule";
import EMISReports from "@/pages/admin/EMISReports";
import AuditLogs from "@/pages/admin/AuditLogs";
import FinanceManagement from "@/pages/admin/FinanceManagement";
import DataMigration from "@/pages/admin/DataMigration";
import GoLiveChecklist from "@/pages/admin/GoLiveChecklist";
import UserManualPage from "@/pages/admin/UserManual";
import UserManagement from "@/components/admin/UserManagement";
import PasswordManagement from "@/components/admin/PasswordManagement";
import StaffAvailabilityOverview from "@/components/admin/StaffAvailabilityOverview";
import ExamResultsManagement from "@/components/admin/ExamResultsManagement";
import ExamResultsEntry from "@/components/admin/ExamResultsEntry";
import TermReportsTab from "@/components/admin/TermReportsTab";
import ExchangeRateCard from "@/components/finance/ExchangeRateCard";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, Image, Users, Calendar, LogOut, Plus, Trash2, Upload, Layers, GraduationCap, UserPlus, Download, FileText, HandshakeIcon, Settings, UserCheck, Building, FolderKanban, BookOpen, Briefcase, DollarSign, Shield, BedDouble, Package, MessageSquare, ClipboardList, ShieldCheck, Database, Rocket, KeyRound, Megaphone, Trophy, ShieldAlert, CheckCircle2, CalendarOff } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import { useMainCrest } from "@/hooks/useMainCrest";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const gradeOptions = ["Form 1", "Form 2", "Form 3", "Form 4", "Lower 6", "Upper 6"];
const classOptions = ["A", "B", "C", "D"];
const departmentOptions = ["Mathematics", "Sciences", "Languages", "Humanities", "Technical", "Arts", "Sports"];
const downloadCategories = ["fees", "forms", "policies", "vacancies", "general"];
const meetingTypes = ["sdc", "parent-teacher", "general"];
const timetableDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const FALLBACK_TT_SLOTS = [
  { start: "07:30", end: "08:10" },
  { start: "08:10", end: "08:50" },
  { start: "08:50", end: "09:30" },
  { start: "09:50", end: "10:30" },
  { start: "10:30", end: "11:10" },
  { start: "11:10", end: "11:50" },
  { start: "11:50", end: "12:30" },
  { start: "12:30", end: "13:10" },
  { start: "13:50", end: "14:30" },
  { start: "14:30", end: "15:10" },
];

interface AdminDashboardProps {
  portalTitle?: string;
  portalRole?: string;
}

export default function AdminDashboard({ portalTitle, portalRole }: AdminDashboardProps = {}) {
  const { toast } = useToast();
  const { signOut, user, role } = useAuth();
  const isFinanceUser = role === 'finance' || role === 'admin_supervisor' || role === 'principal' || role === 'deputy_principal';
  const displayTitle = portalTitle || "Admin Portal";
  const displayRole = portalRole || "Admin";
  const navigate = useNavigate();

  // Announcements
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newText, setNewText] = useState("");
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);

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

  // Tradition image
  const [traditionImageUrl, setTraditionImageUrl] = useState<string | null>(null);
  const traditionFileRef = useRef<HTMLInputElement>(null);
  const [traditionCropSrc, setTraditionCropSrc] = useState<string | null>(null);
  const [traditionCropOpen, setTraditionCropOpen] = useState(false);

  // CTA image
  const [ctaImageUrl, setCtaImageUrl] = useState<string | null>(null);
  const ctaFileRef = useRef<HTMLInputElement>(null);
  const [ctaCropSrc, setCtaCropSrc] = useState<string | null>(null);
  const [ctaCropOpen, setCtaCropOpen] = useState(false);

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

  // Timetable management
  const [ttClasses, setTtClasses] = useState<any[]>([]);
  const [ttSubjects, setTtSubjects] = useState<any[]>([]);
  const [ttStaff, setTtStaff] = useState<any[]>([]);
  const [ttClassSubjects, setTtClassSubjects] = useState<any[]>([]);
  const [ttSelectedClassId, setTtSelectedClassId] = useState("");
  const [ttGrid, setTtGrid] = useState<Record<string, string>>({});
  const [ttLoading, setTtLoading] = useState(false);
  const [ttSaving, setTtSaving] = useState(false);
  // Quick Add slot form
  const [qaDay, setQaDay] = useState<string>("0");
  const [qaSlot, setQaSlot] = useState<string>("");
  const [qaSubject, setQaSubject] = useState<string>("");
  const [qaTeacher, setQaTeacher] = useState<string>("");
  const [qaRoom, setQaRoom] = useState<string>("");
  const [qaDouble, setQaDouble] = useState<boolean>(false);
  const [qaSaving, setQaSaving] = useState(false);
  // Sync Status checker
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncRunning, setSyncRunning] = useState(false);
  const [syncReport, setSyncReport] = useState<any>(null);

  // DB-driven time slots — shared with all portals via useTimeSlots
  const { timeSlots: allTimeSlots, lessonSlots: dbLessonSlots, refetch: refetchTimeSlots, loading: timeSlotsLoading } = useTimeSlots();
  const timetableSlots = useMemo(
    () =>
      dbLessonSlots.length > 0
        ? dbLessonSlots.map((s) => ({ start: s.start_time, end: s.end_time }))
        : FALLBACK_TT_SLOTS,
    [dbLessonSlots],
  );
  // Time slot editor state
  const [tsForm, setTsForm] = useState({ start_time: "", end_time: "", label: "", slot_type: "lesson", display_order: "" });
  const [tsEditingId, setTsEditingId] = useState<string | null>(null);
  const [tsSaving, setTsSaving] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
    fetchCarouselImages();
    fetchGalleryImages();
    fetchDownloads();
    fetchMeetings();
    fetchSiteSettings();
    fetchTimetableMeta();
  }, []);

  useEffect(() => {
    if (ttSelectedClassId) {
      fetchClassTimetable(ttSelectedClassId);
    } else {
      setTtGrid({});
    }
  }, [ttSelectedClassId]);

  useEffect(() => {
    if (!ttSelectedClassId) return;
    const channel = supabase
      .channel(`admin-timetable-${ttSelectedClassId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "timetable_entries", filter: `class_id=eq.${ttSelectedClassId}` }, () => fetchClassTimetable(ttSelectedClassId))
      .on("postgres_changes", { event: "*", schema: "public", table: "class_subjects", filter: `class_id=eq.${ttSelectedClassId}` }, () => fetchClassTimetable(ttSelectedClassId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ttSelectedClassId]);

  const fetchSiteSettings = async () => {
    const { data } = await supabase.from("site_settings").select("*").in("setting_key", ["achievements_image", "principal_photo", "tradition_image", "cta_image"]);
    if (data) {
      data.forEach((s) => {
        if (s.setting_key === "achievements_image") setAchievementsImageUrl(s.setting_value);
        if (s.setting_key === "principal_photo") setPrincipalPhotoUrl(s.setting_value);
        if (s.setting_key === "tradition_image") setTraditionImageUrl(s.setting_value);
        if (s.setting_key === "cta_image") setCtaImageUrl(s.setting_value);
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

  const handleTraditionFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setTraditionCropSrc(reader.result as string);
      setTraditionCropOpen(true);
    };
    reader.readAsDataURL(file);
    if (traditionFileRef.current) traditionFileRef.current.value = "";
  };

  const handleTraditionCropComplete = async (blob: Blob) => {
    setUploading(true);
    try {
      const file = new File([blob], `tradition_${Date.now()}.jpg`, { type: "image/jpeg" });
      const url = await uploadFile(file, "site-images");
      const { data: existing } = await supabase.from("site_settings").select("id").eq("setting_key", "tradition_image");
      if (existing && existing.length > 0) {
        await supabase.from("site_settings").update({ setting_value: url, updated_at: new Date().toISOString() }).eq("setting_key", "tradition_image");
      } else {
        await supabase.from("site_settings").insert({ setting_key: "tradition_image", setting_value: url });
      }
      setTraditionImageUrl(url);
      toast({ title: "Tradition image updated!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const handleCtaFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCtaCropSrc(reader.result as string);
      setCtaCropOpen(true);
    };
    reader.readAsDataURL(file);
    if (ctaFileRef.current) ctaFileRef.current.value = "";
  };

  const handleCtaCropComplete = async (blob: Blob) => {
    setUploading(true);
    try {
      const file = new File([blob], `cta_${Date.now()}.jpg`, { type: "image/jpeg" });
      const url = await uploadFile(file, "site-images");
      const { data: existing } = await supabase.from("site_settings").select("id").eq("setting_key", "cta_image");
      if (existing && existing.length > 0) {
        await supabase.from("site_settings").update({ setting_value: url, updated_at: new Date().toISOString() }).eq("setting_key", "cta_image");
      } else {
        await supabase.from("site_settings").insert({ setting_key: "cta_image", setting_value: url });
      }
      setCtaImageUrl(url);
      toast({ title: "CTA image updated!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const handleDeleteSiteImage = async (settingKey: string, setter: (v: string | null) => void) => {
    if (!confirm("Are you sure you want to delete this image?")) return;
    setUploading(true);
    try {
      await supabase.from("site_settings").delete().eq("setting_key", settingKey);
      setter(null);
      toast({ title: "Image deleted successfully" });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
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

  const getTimetableCellKey = (dayIndex: number, startTime: string) => `${dayIndex}-${startTime}`;

  const getTimetableCellValue = (key: string) => {
    const cell = ttGrid[key];
    return typeof cell === "object" && cell !== null ? cell : { subject_id: "", teacher_id: "", room: "" };
  };

  const updateTimetableCell = (key: string, patch: Record<string, string>) => {
    setTtGrid((prev) => ({ ...prev, [key]: { ...getTimetableCellValue(key), ...patch } }));
  };

  const fetchTimetableMeta = async () => {
    const [{ data: classRows }, { data: subjectRows }, { data: staffRows }] = await Promise.all([
      supabase.from("classes").select("id, name").order("name"),
      supabase.from("subjects").select("id, name").order("name"),
      supabase.from("staff").select("id, full_name").neq("status", "deleted").order("full_name"),
    ]);

    if (classRows) {
      setTtClasses(classRows);
      if (!ttSelectedClassId && classRows.length > 0) {
        setTtSelectedClassId(classRows[0].id);
      }
    }
    if (subjectRows) {
      setTtSubjects(subjectRows);
    }
    if (staffRows) setTtStaff(staffRows);
  };

  const fetchClassTimetable = async (classId: string) => {
    setTtLoading(true);
    const [{ data, error }, { data: assignments }] = await Promise.all([
      supabase
        .from("timetable_entries")
        .select("day_of_week, start_time, subject_id, teacher_id, room")
        .eq("class_id", classId)
        .in("day_of_week", [0, 1, 2, 3, 4]),
      supabase.from("class_subjects").select("subject_id, teacher_id").eq("class_id", classId),
    ]);

    if (error) {
      toast({ title: "Failed to load timetable", description: error.message, variant: "destructive" });
      setTtLoading(false);
      return;
    }

    setTtClassSubjects(assignments || []);
    const teacherBySubject = new Map((assignments || []).map((a: any) => [a.subject_id, a.teacher_id]));
    const nextGrid: Record<string, any> = {};
    (data || []).forEach((entry: any) => {
      const key = getTimetableCellKey(entry.day_of_week, entry.start_time);
      nextGrid[key] = {
        subject_id: entry.subject_id || "",
        teacher_id: entry.teacher_id || (entry.subject_id ? teacherBySubject.get(entry.subject_id) : "") || "",
        room: entry.room || "",
      };
    });
    setTtGrid(nextGrid);
    setTtLoading(false);
  };

  const saveTimetable = async () => {
    if (!ttSelectedClassId) {
      toast({ title: "Select a class first", variant: "destructive" });
      return;
    }

    if (ttSubjects.length === 0) {
      toast({ title: "No subjects found", variant: "destructive" });
      return;
    }

    setTtSaving(true);

    const teacherBySubject = new Map(ttClassSubjects.map((a: any) => [a.subject_id, a.teacher_id]));
    const rows: any[] = [];

    timetableSlots.forEach((slot) => {
      timetableDays.forEach((_, dayIndex) => {
        const key = getTimetableCellKey(dayIndex, slot.start);
        const cell = getTimetableCellValue(key);
        const subjectId = cell.subject_id;
        if (!subjectId) return;

        rows.push({
          class_id: ttSelectedClassId,
          day_of_week: dayIndex,
          start_time: slot.start,
          end_time: slot.end,
          subject_id: subjectId,
          teacher_id: cell.teacher_id || teacherBySubject.get(subjectId) || null,
          room: cell.room?.trim() || null,
        });
      });
    });

    // ----- Clash detection (teacher / venue across other classes) -----
    const slotStarts = timetableSlots.map((slot) => slot.start);
    const { data: otherEntries } = await supabase
      .from("timetable_entries")
      .select("day_of_week, start_time, teacher_id, room, class_id, classes(name), subjects(name), staff(full_name)")
      .neq("class_id", ttSelectedClassId)
      .in("day_of_week", [0, 1, 2, 3, 4])
      .in("start_time", slotStarts);

    const clashes: string[] = [];
    const dayLabel = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    rows.forEach((row) => {
      (otherEntries || []).forEach((other: any) => {
        if (other.day_of_week !== row.day_of_week || other.start_time !== row.start_time) return;
        if (row.teacher_id && other.teacher_id === row.teacher_id) {
          clashes.push(
            `Teacher ${other.staff?.full_name || "—"} already teaching ${other.subjects?.name || ""} in ${other.classes?.name || "another class"} on ${dayLabel[row.day_of_week]} ${row.start_time}`
          );
        }
        if (row.room && other.room && row.room.trim().toLowerCase() === other.room.trim().toLowerCase()) {
          clashes.push(
            `Venue "${row.room}" already booked by ${other.classes?.name || "another class"} on ${dayLabel[row.day_of_week]} ${row.start_time}`
          );
        }
      });
    });

    if (clashes.length > 0) {
      setTtSaving(false);
      const unique = Array.from(new Set(clashes));
      toast({
        title: `Timetable clash detected (${unique.length})`,
        description: unique.slice(0, 4).join(" • ") + (unique.length > 4 ? ` …and ${unique.length - 4} more` : ""),
        variant: "destructive",
      });
      return;
    }

    const { error: deleteError } = await supabase
      .from("timetable_entries")
      .delete()
      .eq("class_id", ttSelectedClassId)
      .in("day_of_week", [0, 1, 2, 3, 4])
      .in("start_time", slotStarts);

    if (deleteError) {
      setTtSaving(false);
      toast({ title: "Failed to save timetable", description: deleteError.message, variant: "destructive" });
      return;
    }

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("timetable_entries").insert(rows);
      if (insertError) {
        setTtSaving(false);
        toast({ title: "Failed to save timetable", description: insertError.message, variant: "destructive" });
        return;
      }
    }

    await fetchClassTimetable(ttSelectedClassId);
    setTtSaving(false);
  };

  // ===== Time Slot CRUD =====
  const tsResetForm = () => {
    setTsForm({ start_time: "", end_time: "", label: "", slot_type: "lesson", display_order: "" });
    setTsEditingId(null);
  };

  const tsStartEdit = (slot: any) => {
    setTsEditingId(slot.id);
    setTsForm({
      start_time: slot.start_time,
      end_time: slot.end_time,
      label: slot.label || "",
      slot_type: slot.slot_type,
      display_order: String(slot.display_order),
    });
  };

  const saveTimeSlot = async () => {
    if (!tsForm.start_time || !tsForm.end_time) {
      toast({ title: "Start and end time required", variant: "destructive" });
      return;
    }
    if (tsForm.start_time >= tsForm.end_time) {
      toast({ title: "End time must be after start time", variant: "destructive" });
      return;
    }
    setTsSaving(true);
    const order = parseInt(tsForm.display_order, 10);
    const payload: any = {
      start_time: tsForm.start_time,
      end_time: tsForm.end_time,
      label: tsForm.label.trim() || null,
      slot_type: tsForm.slot_type,
      display_order: Number.isFinite(order) ? order : (allTimeSlots.length + 1),
    };
    let error;
    if (tsEditingId && !tsEditingId.startsWith("fallback-")) {
      ({ error } = await supabase.from("timetable_time_slots").update(payload).eq("id", tsEditingId));
    } else {
      ({ error } = await supabase.from("timetable_time_slots").insert(payload));
    }
    setTsSaving(false);
    if (error) {
      toast({ title: "Failed to save slot", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: tsEditingId ? "Slot updated" : "Slot added" });
    tsResetForm();
    refetchTimeSlots();
  };

  const deleteTimeSlot = async (id: string) => {
    if (id.startsWith("fallback-")) {
      toast({ title: "Cannot delete fallback slot", description: "Save a custom slot first.", variant: "destructive" });
      return;
    }
    const slot = timetableSlots.find((s: any) => s.id === id);
    if (slot) {
      const { count, error: countErr } = await supabase
        .from("timetable_entries")
        .select("id", { count: "exact", head: true })
        .eq("start_time", slot.start_time)
        .eq("end_time", slot.end_time);
      if (countErr) {
        toast({ title: "Could not verify usage", description: countErr.message, variant: "destructive" });
        return;
      }
      if ((count ?? 0) > 0) {
        const proceed = window.confirm(
          `WARNING: This time slot is used by ${count} timetable entr${count === 1 ? "y" : "ies"} across one or more classes.\n\nDeleting it will leave those entries orphaned and they will no longer appear correctly on Student, Teacher, or Parent portals.\n\nRecommended: reassign or delete those entries first.\n\nDo you still want to permanently delete this time slot?`
        );
        if (!proceed) return;
        const reconfirm = window.prompt('Type "DELETE" to confirm permanent deletion of this in-use time slot:');
        if (reconfirm !== "DELETE") {
          toast({ title: "Deletion cancelled" });
          return;
        }
      } else {
        if (!window.confirm("Permanently Delete this time slot? It will disappear from all portals.")) return;
      }
    } else {
      if (!window.confirm("Permanently Delete this time slot? It will disappear from all portals.")) return;
    }
    const { error } = await supabase.from("timetable_time_slots").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Time slot deleted" });
    refetchTimeSlots();
  };

  const runSyncCheck = async () => {
    if (!ttSelectedClassId) {
      toast({ title: "Select a class first", variant: "destructive" });
      return;
    }
    setSyncOpen(true);
    setSyncRunning(true);
    setSyncReport(null);

    const cls = ttClasses.find((c: any) => c.id === ttSelectedClassId);

    // 1. Canonical query — exactly what Student/Parent/Teacher portals query
    const { data: entries, error: entriesError } = await supabase
      .from("timetable_entries")
      .select("day_of_week, start_time, end_time, subject_id, teacher_id, room, subjects(name), staff(full_name)")
      .eq("class_id", ttSelectedClassId)
      .order("day_of_week")
      .order("start_time");

    // 2. class_subjects fallback (used by Student portal when teacher_id missing)
    const { data: assignments } = await supabase
      .from("class_subjects")
      .select("subject_id, teacher_id")
      .eq("class_id", ttSelectedClassId);

    // 3. Detect double lessons
    const sortedSlots = [...timetableSlots].map((s) => s.start);
    const doubleLessons: string[] = [];
    const dayLabel = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    for (let day = 0; day < 5; day++) {
      const dayEntries = (entries || []).filter((e: any) => e.day_of_week === day);
      for (let i = 0; i < sortedSlots.length - 1; i++) {
        const a = dayEntries.find((e: any) => e.start_time === sortedSlots[i]);
        const b = dayEntries.find((e: any) => e.start_time === sortedSlots[i + 1]);
        if (
          a && b &&
          a.subject_id === b.subject_id &&
          (a.teacher_id || "") === (b.teacher_id || "") &&
          (a.room || "") === (b.room || "")
        ) {
          doubleLessons.push(
            `${dayLabel[day]} ${a.start_time}–${b.end_time}: ${a.subjects?.name || "—"} (${a.staff?.full_name || "Teacher TBA"}) @ ${a.room || "Venue TBA"}`
          );
        }
      }
    }

    // 4. Live realtime probe — subscribe and confirm the channel reaches SUBSCRIBED
    let realtimeStatus: "live" | "failed" | "timeout" = "timeout";
    const probe = supabase.channel(`sync-probe-${Date.now()}`);
    probe.on("postgres_changes", { event: "*", schema: "public", table: "timetable_entries" }, () => {});
    await new Promise<void>((resolve) => {
      const t = setTimeout(() => resolve(), 4000);
      probe.subscribe((status) => {
        if (status === "SUBSCRIBED") { realtimeStatus = "live"; clearTimeout(t); resolve(); }
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") { realtimeStatus = "failed"; clearTimeout(t); resolve(); }
      });
    });
    supabase.removeChannel(probe);

    // 5. Build per-portal summary (all read same source of truth)
    const total = entries?.length || 0;
    const missingTeacher = (entries || []).filter((e: any) => !e.teacher_id).length;
    const teacherFallbackResolves = (entries || []).filter((e: any) => {
      if (e.teacher_id) return false;
      return assignments?.some((a: any) => a.subject_id === e.subject_id && a.teacher_id);
    }).length;
    const missingVenue = (entries || []).filter((e: any) => !e.room).length;

    setSyncReport({
      className: cls?.name || "—",
      total,
      missingTeacher,
      teacherFallbackResolves,
      missingVenue,
      doubleLessons,
      realtimeStatus,
      error: entriesError?.message || null,
      timestamp: new Date().toLocaleString(),
    });
    setSyncRunning(false);
  };

  const quickAddSlot = async () => {
    if (!ttSelectedClassId) { toast({ title: "Select a class first", variant: "destructive" }); return; }
    if (!qaSlot) { toast({ title: "Pick a time slot", variant: "destructive" }); return; }
    if (!qaSubject) { toast({ title: "Pick a subject", variant: "destructive" }); return; }
    const slotIdx = timetableSlots.findIndex((s) => s.start === qaSlot);
    if (slotIdx < 0) return;
    const slot = timetableSlots[slotIdx];
    const slot2 = qaDouble ? timetableSlots[slotIdx + 1] : null;
    if (qaDouble && !slot2) {
      toast({ title: "No next slot available", description: "Pick an earlier time for a double lesson.", variant: "destructive" });
      return;
    }
    const dayIndex = parseInt(qaDay, 10);
    const teacherId = qaTeacher || ttClassSubjects.find((a: any) => a.subject_id === qaSubject)?.teacher_id || null;
    const targetSlots = slot2 ? [slot, slot2] : [slot];
    const slotStarts = targetSlots.map((s) => s.start);

    setQaSaving(true);
    // Clash check across all target slots
    const { data: clashRows } = await supabase
      .from("timetable_entries")
      .select("class_id, start_time, teacher_id, room, classes(name), subjects(name), staff(full_name)")
      .neq("class_id", ttSelectedClassId)
      .eq("day_of_week", dayIndex)
      .in("start_time", slotStarts);
    const dayLabel = ["Mon", "Tue", "Wed", "Thu", "Fri"][dayIndex];
    const conflicts: string[] = [];
    (clashRows || []).forEach((other: any) => {
      if (teacherId && other.teacher_id === teacherId) {
        conflicts.push(`Teacher already teaching ${other.subjects?.name || ""} in ${other.classes?.name || "another class"} at ${dayLabel} ${other.start_time}`);
      }
      if (qaRoom && other.room && qaRoom.trim().toLowerCase() === other.room.trim().toLowerCase()) {
        conflicts.push(`Venue "${qaRoom}" already booked by ${other.classes?.name || "another class"} at ${dayLabel} ${other.start_time}`);
      }
    });
    if (conflicts.length > 0) {
      setQaSaving(false);
      toast({ title: "Clash detected", description: Array.from(new Set(conflicts)).join(" • "), variant: "destructive" });
      return;
    }

    // Upsert: delete same class/day/target-slots, insert new rows
    await supabase.from("timetable_entries").delete()
      .eq("class_id", ttSelectedClassId).eq("day_of_week", dayIndex).in("start_time", slotStarts);
    const rows = targetSlots.map((s) => ({
      class_id: ttSelectedClassId,
      day_of_week: dayIndex,
      start_time: s.start,
      end_time: s.end,
      subject_id: qaSubject,
      teacher_id: teacherId,
      room: qaRoom.trim() || null,
    }));
    const { error } = await supabase.from("timetable_entries").insert(rows);
    setQaSaving(false);
    if (error) { toast({ title: "Failed to add", description: error.message, variant: "destructive" }); return; }
    toast({
      title: qaDouble ? "Double lesson added" : "Slot added",
      description: `${dayLabel} ${slot.start}${slot2 ? `–${slot2.end}` : `–${slot.end}`} saved.`,
    });
    setQaSlot(""); setQaSubject(""); setQaTeacher(""); setQaRoom(""); setQaDouble(false);
    fetchClassTimetable(ttSelectedClassId);
  };

  const [wipingTimetable, setWipingTimetable] = useState(false);
  const wipeAllTimetables = async () => {
    const scope = window.prompt(
      'This will PERMANENTLY DELETE timetable data so you can rebuild from scratch.\n\n' +
      'Type one of:\n' +
      '  CLASS    — delete all entries for the currently selected class only\n' +
      '  ALL      — delete ALL timetable entries for EVERY class\n' +
      '  ALL+SLOTS — delete ALL entries AND all time slots (full reset)\n\n' +
      'Or leave blank to cancel.'
    );
    const choice = (scope || "").trim().toUpperCase();
    if (!choice) return;
    if (!["CLASS", "ALL", "ALL+SLOTS"].includes(choice)) {
      toast({ title: "Cancelled", description: "Unrecognised option." });
      return;
    }
    if (choice === "CLASS" && !ttSelectedClassId) {
      toast({ title: "Pick a class first", variant: "destructive" });
      return;
    }
    const confirmText = window.prompt(`Type "DELETE" to confirm permanent ${choice} wipe.`);
    if (confirmText !== "DELETE") {
      toast({ title: "Cancelled" });
      return;
    }
    setWipingTimetable(true);
    try {
      let q = supabase.from("timetable_entries").delete();
      if (choice === "CLASS") {
        q = q.eq("class_id", ttSelectedClassId);
      } else {
        // delete all rows
        q = q.not("id", "is", null);
      }
      const { error: delErr } = await q;
      if (delErr) throw delErr;

      // Also clear cached personal_timetables (class-derived snapshots) on full wipes
      if (choice === "ALL" || choice === "ALL+SLOTS") {
        await supabase.from("personal_timetables").delete().eq("activity_type", "class");
      }

      if (choice === "ALL+SLOTS") {
        const { error: slotErr } = await supabase.from("timetable_time_slots").delete().not("id", "is", null);
        if (slotErr) throw slotErr;
      }

      toast({
        title: "Timetable cleared",
        description: choice === "CLASS"
          ? "All entries for the selected class were deleted. Ready to rebuild."
          : choice === "ALL"
            ? "All timetable entries deleted across every class. Ready to rebuild."
            : "All entries and time slots deleted. Add new time slots, then rebuild.",
      });
      if (ttSelectedClassId) fetchClassTimetable(ttSelectedClassId);
    } catch (e: any) {
      toast({ title: "Wipe failed", description: e.message, variant: "destructive" });
    } finally {
      setWipingTimetable(false);
    }
  };

  const addAnnouncement = async () => {
    if (!newTitle) return;
    const { error } = await supabase.from("announcements").insert({ title: newTitle, content: newText, is_public: true, author_id: user?.id });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewTitle(""); setNewText("");
    setShowAnnouncementDialog(false);
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

  const meetingTypeLabels: Record<string, string> = { sdc: "SDC Meeting", "parent-teacher": "Parent-Teacher Meeting", general: "General" };
  const crest = useMainCrest();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 sm:h-20 items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-2">
            <img src={crest} alt="Gifford High School crest" className="h-10 w-10 sm:h-16 sm:w-16 object-contain" />
            <span className="font-heading text-sm sm:text-lg font-bold text-primary">{displayTitle}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:inline text-sm text-muted-foreground">{displayRole}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden sm:flex"><LogOut className="mr-1 h-4 w-4" /> Logout</Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="sm:hidden h-8 w-8"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <div className="container px-3 sm:px-4 py-4 sm:py-8">
        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 sm:mb-6 font-heading text-lg sm:text-2xl font-bold text-primary">
          {displayRole} Dashboard
        </motion.h1>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Announcements", value: String(announcements.length), icon: Bell, color: "bg-primary/10" },
            { label: "Carousel Slides", value: String(carouselImages.length), icon: Layers, color: "bg-accent/10" },
            { label: "Downloads", value: String(downloads.length), icon: Download, color: "bg-primary/10" },
            { label: "Meetings", value: String(meetings.length), icon: HandshakeIcon, color: "bg-accent/10" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.color}`}>
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* All image croppers rendered outside Tabs so they're always mounted */}
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
        {traditionCropSrc && (
          <ImageCropper
            imageSrc={traditionCropSrc}
            open={traditionCropOpen}
            onClose={() => { setTraditionCropOpen(false); setTraditionCropSrc(null); }}
            onCropComplete={handleTraditionCropComplete}
            aspectRatio={16 / 9}
            cropShape="rect"
            title="Crop Tradition Image"
          />
        )}
        {ctaCropSrc && (
          <ImageCropper
            imageSrc={ctaCropSrc}
            open={ctaCropOpen}
            onClose={() => { setCtaCropOpen(false); setCtaCropSrc(null); }}
            onCropComplete={handleCtaCropComplete}
            aspectRatio={1}
            cropShape="rect"
            title="Crop CTA Image"
          />
        )}

        <Tabs defaultValue="announcements" className="space-y-4 sm:space-y-6">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide rounded-xl border bg-card p-1.5">
            <TabsList className="flex-wrap gap-1 bg-transparent h-auto p-0 w-max sm:w-auto">
              <TabsTrigger value="announcements" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Bell className="mr-1 h-3.5 w-3.5" /> Notices</TabsTrigger>
              <TabsTrigger value="carousel" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Layers className="mr-1 h-3.5 w-3.5" /> Carousel</TabsTrigger>
              <TabsTrigger value="gallery" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Image className="mr-1 h-3.5 w-3.5" /> Gallery</TabsTrigger>
              <TabsTrigger value="downloads" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Download className="mr-1 h-3.5 w-3.5" /> Downloads</TabsTrigger>
              <TabsTrigger value="site-images" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Settings className="mr-1 h-3.5 w-3.5" /> Images</TabsTrigger>
              <TabsTrigger value="student-mgmt" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><BookOpen className="mr-1 h-3.5 w-3.5" /> Students</TabsTrigger>
              <TabsTrigger value="staff-mgmt" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><UserCheck className="mr-1 h-3.5 w-3.5" /> Staff</TabsTrigger>
              <TabsTrigger value="staff-full" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Briefcase className="mr-1 h-3.5 w-3.5" /> Directory</TabsTrigger>
              <TabsTrigger value="user-mgmt" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Shield className="mr-1 h-3.5 w-3.5" /> Users</TabsTrigger>
              <TabsTrigger value="verification-codes" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><KeyRound className="mr-1 h-3.5 w-3.5" /> Codes</TabsTrigger>
              <TabsTrigger value="password-mgmt" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><ShieldAlert className="mr-1 h-3.5 w-3.5" /> Passwords</TabsTrigger>
              <TabsTrigger value="academics" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><GraduationCap className="mr-1 h-3.5 w-3.5" /> Academics</TabsTrigger>
              <TabsTrigger value="timetable" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Calendar className="mr-1 h-3.5 w-3.5" /> Timetables</TabsTrigger>
              <TabsTrigger value="boarding" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><BedDouble className="mr-1 h-3.5 w-3.5" /> Boarding</TabsTrigger>
              <TabsTrigger value="inventory" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Package className="mr-1 h-3.5 w-3.5" /> Inventory</TabsTrigger>
              <TabsTrigger value="facilities" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Building className="mr-1 h-3.5 w-3.5" /> Facilities</TabsTrigger>
              <TabsTrigger value="site-logos" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Image className="mr-1 h-3.5 w-3.5" /> Site Logos</TabsTrigger>
              <TabsTrigger value="projects" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><FolderKanban className="mr-1 h-3.5 w-3.5" /> Projects</TabsTrigger>
              <TabsTrigger value="awards" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Trophy className="mr-1 h-3.5 w-3.5" /> Awards</TabsTrigger>
              <TabsTrigger value="attendance" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Attendance</TabsTrigger>
              <TabsTrigger value="exam-results" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><FileText className="mr-1 h-3.5 w-3.5" /> Exam Results</TabsTrigger>
              <TabsTrigger value="term-reports" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><ClipboardList className="mr-1 h-3.5 w-3.5" /> Term Reports</TabsTrigger>
              {isFinanceUser && (
                <>
                  <TabsTrigger value="finance" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><DollarSign className="mr-1 h-3.5 w-3.5" /> Finance</TabsTrigger>
                </>
              )}
              <TabsTrigger value="meetings" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><HandshakeIcon className="mr-1 h-3.5 w-3.5" /> Meetings</TabsTrigger>
              <TabsTrigger value="communication" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><MessageSquare className="mr-1 h-3.5 w-3.5" /> Comms</TabsTrigger>
              <TabsTrigger value="reports" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><ClipboardList className="mr-1 h-3.5 w-3.5" /> Reports</TabsTrigger>
              <TabsTrigger value="audit" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><ShieldCheck className="mr-1 h-3.5 w-3.5" /> Audit</TabsTrigger>
              <TabsTrigger value="migration" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Database className="mr-1 h-3.5 w-3.5" /> Migration</TabsTrigger>
              <TabsTrigger value="golive" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Rocket className="mr-1 h-3.5 w-3.5" /> Go-Live</TabsTrigger>
              <TabsTrigger value="staff-leave" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><CalendarOff className="mr-1 h-3.5 w-3.5" /> Staff Leave</TabsTrigger>
              <TabsTrigger value="manual" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><BookOpen className="mr-1 h-3.5 w-3.5" /> Manual</TabsTrigger>
            </TabsList>
          </div>

          {/* Announcements Tab */}
          <TabsContent value="announcements">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg font-semibold text-foreground">Announcements</h2>
                <Button onClick={() => setShowAnnouncementDialog(true)}>
                  <Plus className="mr-1 h-4 w-4" /> New Announcement
                </Button>
              </div>

              {/* Create Announcement Dialog */}
              <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle className="font-heading">Post Announcement</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>Title *</Label><Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Announcement title" /></div>
                    <div className="space-y-2"><Label>Content</Label><Textarea value={newText} onChange={e => setNewText(e.target.value)} rows={4} placeholder="Write your announcement..." /></div>
                    <Button onClick={addAnnouncement} disabled={!newTitle} className="w-full"><Plus className="mr-1 h-4 w-4" /> Post Announcement</Button>
                  </div>
                </DialogContent>
              </Dialog>

              {announcements.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
                  <Megaphone className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                  No announcements yet. Click "New Announcement" to get started.
                </CardContent></Card>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {announcements.map(a => (
                    <Card key={a.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="flex items-start justify-between gap-3 p-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Megaphone className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm">{a.title}</h3>
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{a.content}</p>
                            <span className="text-[11px] text-muted-foreground/70 mt-1 block">{new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => deleteAnnouncement(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Carousel Tab */}
          <TabsContent value="carousel">
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

          {/* SDC / Meetings Tab */}
          <TabsContent value="meetings">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="font-heading">Schedule Meeting</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><Label>Title *</Label><Input value={meetingTitle} onChange={e => setMeetingTitle(e.target.value)} placeholder="e.g. SDC Quarter 1 Meeting" /></div>
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

          {/* User Management Tab */}
          <TabsContent value="user-mgmt">
            <UserManagement />
          </TabsContent>

          {/* Password Management Tab */}
          <TabsContent value="password-mgmt">
            <PasswordManagement />
          </TabsContent>

          {/* Timetable Tab */}
          <TabsContent value="timetable">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Manage Timetable</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  One simple flow: pick a class → add slots (subject, teacher, venue, time) → changes appear instantly in Teacher, Student & Parent portals. Clashes are blocked automatically.
                </p>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center gap-4 flex-wrap">
                  <Label>Class:</Label>
                  <Select value={ttSelectedClassId} onValueChange={setTtSelectedClassId}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {ttClasses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={saveTimetable} disabled={!ttSelectedClassId || ttSaving}>
                    {ttSaving ? "Saving..." : "Save Grid Changes"}
                  </Button>
                  <Button variant="secondary" onClick={runSyncCheck} disabled={!ttSelectedClassId || syncRunning}>
                    <ShieldCheck className="mr-1 h-4 w-4" />
                    {syncRunning ? "Checking..." : "Check Sync Status"}
                  </Button>
                  <Button variant="destructive" onClick={wipeAllTimetables} disabled={wipingTimetable}>
                    <Trash2 className="mr-1 h-4 w-4" />
                    {wipingTimetable ? "Clearing..." : "Clear & Rebuild Timetable"}
                  </Button>
                </div>

                {/* Time Slot Editor */}
                <div className="mb-6 rounded-lg border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold">Time Slots ({allTimeSlots.length})</div>
                    {tsEditingId && (
                      <Button size="sm" variant="ghost" onClick={tsResetForm}>Cancel edit</Button>
                    )}
                  </div>
                  <p className="mb-3 text-[11px] text-muted-foreground">
                    Edits sync instantly to Student, Teacher and Parent portals via the shared time slot table.
                  </p>

                  <div className="grid gap-2 md:grid-cols-6 mb-3">
                    <div>
                      <Label className="text-[11px]">Start</Label>
                      <Input type="time" className="h-9 text-xs" value={tsForm.start_time} onChange={(e) => setTsForm({ ...tsForm, start_time: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-[11px]">End</Label>
                      <Input type="time" className="h-9 text-xs" value={tsForm.end_time} onChange={(e) => setTsForm({ ...tsForm, end_time: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-[11px]">Type</Label>
                      <Select value={tsForm.slot_type} onValueChange={(v) => setTsForm({ ...tsForm, slot_type: v })}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lesson">Lesson</SelectItem>
                          <SelectItem value="break">Break</SelectItem>
                          <SelectItem value="sports">Sports</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[11px]">Label (optional)</Label>
                      <Input className="h-9 text-xs" placeholder="e.g. Lunch" value={tsForm.label} onChange={(e) => setTsForm({ ...tsForm, label: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-[11px]">Order</Label>
                      <Input type="number" className="h-9 text-xs" placeholder="auto" value={tsForm.display_order} onChange={(e) => setTsForm({ ...tsForm, display_order: e.target.value })} />
                    </div>
                    <div className="flex items-end">
                      <Button className="h-9 w-full" onClick={saveTimeSlot} disabled={tsSaving}>
                        {tsSaving ? "Saving..." : tsEditingId ? "Update" : "Add Slot"}
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-2 py-1 text-left">#</th>
                          <th className="px-2 py-1 text-left">Time</th>
                          <th className="px-2 py-1 text-left">Type</th>
                          <th className="px-2 py-1 text-left">Label</th>
                          <th className="px-2 py-1"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeSlotsLoading && (
                          <tr><td colSpan={5} className="p-3 text-center text-muted-foreground">Loading…</td></tr>
                        )}
                        {!timeSlotsLoading && allTimeSlots.map((s) => (
                          <tr key={s.id} className="border-t">
                            <td className="px-2 py-1">{s.display_order}</td>
                            <td className="px-2 py-1 font-mono">{s.start_time}–{s.end_time}</td>
                            <td className="px-2 py-1 capitalize">{s.slot_type}</td>
                            <td className="px-2 py-1">{s.label || "—"}</td>
                            <td className="px-2 py-1 text-right space-x-1">
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => tsStartEdit(s)}>Edit</Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive" onClick={() => deleteTimeSlot(s.id)}>Delete</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {ttSelectedClassId && (
                  <div className="mb-6 rounded-lg border bg-muted/30 p-3">
                    <div className="mb-2 text-sm font-semibold">Quick Add Slot</div>
                    <div className="grid gap-2 md:grid-cols-6">
                      <div>
                        <Label className="text-[11px]">Day</Label>
                        <Select value={qaDay} onValueChange={setQaDay}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {timetableDays.map((d, i) => <SelectItem key={d} value={String(i)}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[11px]">Time</Label>
                        <Select value={qaSlot} onValueChange={setQaSlot}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pick time" /></SelectTrigger>
                          <SelectContent>
                            {timetableSlots.map((s) => <SelectItem key={s.start} value={s.start}>{s.start}–{s.end}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[11px]">Subject</Label>
                        <Select
                          value={qaSubject}
                          onValueChange={(v) => {
                            setQaSubject(v);
                            const auto = ttClassSubjects.find((a: any) => a.subject_id === v)?.teacher_id;
                            if (auto) setQaTeacher(auto);
                          }}
                        >
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Subject" /></SelectTrigger>
                          <SelectContent>
                            {ttSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[11px]">Teacher</Label>
                        <Select value={qaTeacher} onValueChange={setQaTeacher}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Teacher" /></SelectTrigger>
                          <SelectContent>
                            {ttStaff.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[11px]">Venue</Label>
                        <Input className="h-9 text-xs" placeholder="e.g. Room 12" value={qaRoom} onChange={(e) => setQaRoom(e.target.value)} />
                      </div>
                      <div className="flex items-end">
                        <Button className="h-9 w-full" onClick={quickAddSlot} disabled={qaSaving}>
                          {qaSaving ? "Adding..." : "Add Slot"}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        id="qa-double"
                        type="checkbox"
                        checked={qaDouble}
                        onChange={(e) => setQaDouble(e.target.checked)}
                        className="h-4 w-4 cursor-pointer"
                      />
                      <Label htmlFor="qa-double" className="cursor-pointer text-xs">
                        Double lesson (covers this slot + the next consecutive slot)
                      </Label>
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      Tip: choosing a subject auto-fills the teacher (from Academic → Class Subjects). Override here if needed. Saves instantly to all portals.
                    </p>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2">Time</th>
                        {timetableDays.map((d) => <th key={d} className="px-3 py-2">{d}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {timetableSlots.map((slot) => (
                        <tr key={slot.start} className="border-t">
                          <td className="px-3 py-2 font-medium">{slot.start}–{slot.end}</td>
                          {timetableDays.map((_, dayIndex) => {
                            const key = getTimetableCellKey(dayIndex, slot.start);
                            const cell = getTimetableCellValue(key);
                            return (
                              <td key={key} className="min-w-[170px] px-1 py-1 align-top">
                                <div className="space-y-1">
                                  <Select
                                    value={cell.subject_id || "empty"}
                                    onValueChange={(value) => {
                                      const subjectId = value === "empty" ? "" : value;
                                      const assignedTeacher = ttClassSubjects.find((a: any) => a.subject_id === subjectId)?.teacher_id || "";
                                      updateTimetableCell(key, { subject_id: subjectId, teacher_id: assignedTeacher });
                                    }}
                                    disabled={ttLoading || !ttSelectedClassId}
                                  >
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Subject" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="empty">Free period</SelectItem>
                                      {ttSubjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                  <Select
                                    value={cell.teacher_id || "empty"}
                                    onValueChange={(value) => updateTimetableCell(key, { teacher_id: value === "empty" ? "" : value })}
                                    disabled={ttLoading || !ttSelectedClassId || !cell.subject_id}
                                  >
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Teacher" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="empty">Teacher TBA</SelectItem>
                                      {ttStaff.map((staff) => <SelectItem key={staff.id} value={staff.id}>{staff.full_name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    className="h-8 text-xs"
                                    placeholder="Venue"
                                    value={cell.room || ""}
                                    onChange={(e) => updateTimetableCell(key, { room: e.target.value })}
                                    disabled={ttLoading || !ttSelectedClassId || !cell.subject_id}
                                  />
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Sync Status Dialog */}
            <Dialog open={syncOpen} onOpenChange={setSyncOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="font-heading flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" /> Timetable Sync Status
                  </DialogTitle>
                </DialogHeader>
                {syncRunning && (
                  <div className="py-8 text-center text-sm text-muted-foreground">Running checks…</div>
                )}
                {!syncRunning && syncReport && (
                  <div className="space-y-4 text-sm">
                    <div className="rounded-lg border p-3">
                      <div className="font-semibold">{syncReport.className}</div>
                      <div className="text-xs text-muted-foreground">Checked: {syncReport.timestamp}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-lg border p-3">
                        <div className="text-2xl font-bold">{syncReport.total}</div>
                        <div className="text-[10px] uppercase text-muted-foreground">Entries</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-2xl font-bold">{syncReport.doubleLessons.length}</div>
                        <div className="text-[10px] uppercase text-muted-foreground">Double Lessons</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-2xl font-bold">{syncReport.missingTeacher - syncReport.teacherFallbackResolves}</div>
                        <div className="text-[10px] uppercase text-muted-foreground">Unresolved Teacher</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-2xl font-bold">{syncReport.missingVenue}</div>
                        <div className="text-[10px] uppercase text-muted-foreground">Missing Venue</div>
                      </div>
                    </div>

                    <div className={`rounded-lg border p-3 ${syncReport.realtimeStatus === "live" ? "border-green-500/50 bg-green-500/5" : "border-destructive/50 bg-destructive/5"}`}>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={`h-4 w-4 ${syncReport.realtimeStatus === "live" ? "text-green-600" : "text-destructive"}`} />
                        <span className="font-semibold">
                          Realtime channel: {syncReport.realtimeStatus === "live" ? "LIVE" : syncReport.realtimeStatus.toUpperCase()}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {syncReport.realtimeStatus === "live"
                          ? "Student, Teacher and Parent portals will receive timetable updates instantly via the realtime channel."
                          : "Realtime channel did not subscribe. Updates may require a manual refresh in the other portals."}
                      </p>
                    </div>

                    <div className="rounded-lg border p-3">
                      <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Per-portal view (single source of truth)</div>
                      <div className="space-y-1 text-xs">
                        <div>✓ Admin portal grid: {syncReport.total} entries</div>
                        <div>✓ Student portal: {syncReport.total} entries (teacher resolved via class_subjects fallback for {syncReport.teacherFallbackResolves})</div>
                        <div>✓ Teacher portal: {syncReport.total} entries (filtered by teacher_id)</div>
                        <div>✓ Parent portal: {syncReport.total} entries (mirrors student view)</div>
                      </div>
                      <p className="mt-2 text-[10px] text-muted-foreground">All portals query the same <code>timetable_entries</code> table, so the row count is identical by definition.</p>
                    </div>

                    {syncReport.doubleLessons.length > 0 && (
                      <div className="rounded-lg border p-3">
                        <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Double Lessons Detected</div>
                        <ul className="space-y-1 text-xs">
                          {syncReport.doubleLessons.map((d: string, i: number) => (
                            <li key={i}>• {d}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {syncReport.error && (
                      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-xs text-destructive">
                        Error: {syncReport.error}
                      </div>
                    )}
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Site Images Tab */}
          <TabsContent value="site-images">
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
                    <div className="relative mt-2 inline-block">
                      <img src={principalPhotoUrl} alt="Principal" className="h-48 w-36 rounded-lg border object-cover object-top" />
                      <Button variant="destructive" size="icon" className="absolute right-1 top-1 h-7 w-7" onClick={() => handleDeleteSiteImage("principal_photo", setPrincipalPhotoUrl)} disabled={uploading}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Achievements Image */}
              <Card>
                <CardHeader><CardTitle className="font-heading">Achievements Section Image</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">This image appears on the homepage next to the "Celebrating Achievement" section.</p>
                  <input type="file" accept="image/*" ref={achievementsFileRef} onChange={handleAchievementsFileSelect} className="hidden" />
                  <Button onClick={() => achievementsFileRef.current?.click()} disabled={uploading}>
                    <Upload className="mr-1 h-4 w-4" /> {uploading ? "Uploading…" : "Upload Image"}
                  </Button>
                  {achievementsImageUrl && (
                    <div className="relative mt-2">
                      <img src={achievementsImageUrl} alt="Achievements section" className="rounded-lg border max-h-64 w-full object-cover" />
                      <Button variant="destructive" size="icon" className="absolute right-1 top-1 h-7 w-7" onClick={() => handleDeleteSiteImage("achievements_image", setAchievementsImageUrl)} disabled={uploading}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tradition Image */}
              <Card>
                <CardHeader><CardTitle className="font-heading">Tradition of Excellence Image</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">This image appears on the homepage next to the "A Tradition of Excellence" section.</p>
                  <input type="file" accept="image/*" ref={traditionFileRef} onChange={handleTraditionFileSelect} className="hidden" />
                  <Button onClick={() => traditionFileRef.current?.click()} disabled={uploading}>
                    <Upload className="mr-1 h-4 w-4" /> {uploading ? "Uploading…" : "Upload Image"}
                  </Button>
                  {traditionImageUrl && (
                    <div className="relative mt-2">
                      <img src={traditionImageUrl} alt="Tradition section" className="rounded-lg border max-h-64 w-full object-cover" />
                      <Button variant="destructive" size="icon" className="absolute right-1 top-1 h-7 w-7" onClick={() => handleDeleteSiteImage("tradition_image", setTraditionImageUrl)} disabled={uploading}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
               </Card>

              {/* CTA Section Image */}
              <Card>
                <CardHeader><CardTitle className="font-heading">CTA Section Image</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">This image appears on the homepage next to the "Ready to Join the Gifford Family?" section.</p>
                  <input type="file" accept="image/*" ref={ctaFileRef} onChange={handleCtaFileSelect} className="hidden" />
                  <Button onClick={() => ctaFileRef.current?.click()} disabled={uploading}>
                    <Upload className="mr-1 h-4 w-4" /> {uploading ? "Uploading…" : "Upload Image"}
                  </Button>
                  {ctaImageUrl && (
                    <div className="relative mt-2">
                      <img src={ctaImageUrl} alt="CTA section" className="rounded-lg border max-h-64 w-full object-cover" />
                      <Button variant="destructive" size="icon" className="absolute right-1 top-1 h-7 w-7" onClick={() => handleDeleteSiteImage("cta_image", setCtaImageUrl)} disabled={uploading}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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

          {/* Site Logos Tab */}
          <TabsContent value="site-logos">
            <SiteLogosManagement />
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <ProjectsManagement />
          </TabsContent>

          {/* Awards Tab */}
          <TabsContent value="awards">
            <AwardsManagement />
          </TabsContent>

          {/* Student Management Tab */}
          <TabsContent value="student-mgmt">
            <StudentManagement />
          </TabsContent>

          {/* Staff Directory Tab */}
          <TabsContent value="staff-full">
            <StaffManagementFull />
          </TabsContent>

          {/* Academics Tab */}
          <TabsContent value="academics">
            <AcademicManagement />
          </TabsContent>

          {/* Boarding Tab */}
          <TabsContent value="boarding">
            <BoardingManagement />
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory">
            <InventoryManagement />
          </TabsContent>

          {/* Communication Tab */}
          <TabsContent value="communication">
            <CommunicationModule />
          </TabsContent>

          {/* EMIS Reports Tab */}
          <TabsContent value="reports">
            <EMISReports />
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="audit">
            <AuditLogs />
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance">
            <AdminAttendanceViewer />
          </TabsContent>

          {/* Data Migration Tab */}
          <TabsContent value="migration">
            <DataMigration />
          </TabsContent>

          {/* Go-Live Checklist Tab */}
          <TabsContent value="golive">
            <GoLiveChecklist />
          </TabsContent>

          {/* Finance Tab - only for finance clerks and admin supervisors */}
          {isFinanceUser && (
            <TabsContent value="finance">
              <FinanceManagement />
            </TabsContent>
          )}

          {/* User Manual Tab */}
          <TabsContent value="manual">
            <UserManualPage />
          </TabsContent>

          {/* Staff Leave Tab */}
          <TabsContent value="staff-leave">
            <StaffAvailabilityOverview />
          </TabsContent>

          {/* Verification Codes Tab */}
          <TabsContent value="verification-codes">
            <VerificationCodesManager />
          </TabsContent>

          {/* Exam Results Tab */}
          <TabsContent value="exam-results" className="space-y-6">
            <ExamResultsEntry />
            <ExamResultsManagement />
          </TabsContent>

          {/* Term Reports Tab */}
          <TabsContent value="term-reports">
            <TermReportsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
