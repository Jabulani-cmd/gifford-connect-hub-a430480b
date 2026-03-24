// @ts-nocheck
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Users, GraduationCap, BookOpen, Briefcase, MessageSquare, ClipboardList, Bell, Calendar } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import AcademicManagement from "@/pages/admin/AcademicManagement";
import StudentManagement from "@/pages/admin/StudentManagement";
import StaffManagementFull from "@/pages/admin/StaffManagementFull";
import CommunicationModule from "@/pages/admin/CommunicationModule";
import EMISReports from "@/pages/admin/EMISReports";
import PersonalTimetableEditor from "@/components/PersonalTimetableEditor";

export default function DeputyPrincipalDashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ students: 0, staff: 0, announcements: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [studentsRes, staffRes, annRes] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("staff").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("announcements").select("id", { count: "exact", head: true }),
      ]);
      setStats({ students: studentsRes.count || 0, staff: staffRes.count || 0, announcements: annRes.count || 0 });
    };
    fetchStats();
  }, []);

  const handleLogout = async () => { await signOut(); navigate("/login"); };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 sm:h-20 items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-2">
            <img src={schoolLogo} alt="Gifford High School crest" className="h-10 w-10 sm:h-16 sm:w-16 object-contain" />
            <span className="font-heading text-sm sm:text-lg font-bold text-primary">Deputy Principal</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:inline text-sm text-muted-foreground">Deputy Principal</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden sm:flex"><LogOut className="mr-1 h-4 w-4" /> Logout</Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="sm:hidden h-8 w-8"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 font-heading text-2xl font-bold text-primary">
          Deputy Principal's Dashboard
        </motion.h1>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Active Students", value: String(stats.students), icon: GraduationCap },
            { label: "Staff Members", value: String(stats.staff), icon: Users },
            { label: "Announcements", value: String(stats.announcements), icon: Bell },
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

        <Tabs defaultValue="students" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="students"><BookOpen className="mr-1 h-4 w-4" /> Students</TabsTrigger>
            <TabsTrigger value="staff"><Briefcase className="mr-1 h-4 w-4" /> Staff Overview</TabsTrigger>
            <TabsTrigger value="academics"><GraduationCap className="mr-1 h-4 w-4" /> Academics</TabsTrigger>
            <TabsTrigger value="communication"><MessageSquare className="mr-1 h-4 w-4" /> Communication</TabsTrigger>
            <TabsTrigger value="reports"><ClipboardList className="mr-1 h-4 w-4" /> Reports</TabsTrigger>
            <TabsTrigger value="timetable"><Calendar className="mr-1 h-4 w-4" /> My Timetable</TabsTrigger>
          </TabsList>

          <TabsContent value="students"><StudentManagement /></TabsContent>
          <TabsContent value="staff"><StaffManagementFull /></TabsContent>
          <TabsContent value="academics"><AcademicManagement /></TabsContent>
          <TabsContent value="communication"><CommunicationModule /></TabsContent>
          <TabsContent value="reports"><EMISReports /></TabsContent>
          <TabsContent value="timetable"><PersonalTimetableEditor /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
