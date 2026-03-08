import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ScrollToTop from "@/components/ScrollToTop";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import About from "./pages/About";
import Academics from "./pages/Academics";
import Admissions from "./pages/Admissions";
import SchoolLife from "./pages/SchoolLife";
import News from "./pages/News";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentDashboard from "./pages/portal/StudentDashboard";
import ParentTeacherDashboard from "./pages/portal/ParentTeacherDashboard";
import TeacherDashboard from "./pages/portal/TeacherDashboard";
import AdminDashboard from "./pages/portal/AdminDashboard";
import Downloads from "./pages/Downloads";
import Staff from "./pages/Staff";
import Facilities from "./pages/Facilities";
import Fees from "./pages/Fees";
import Vacancies from "./pages/Vacancies";
import SchoolProjects from "./pages/SchoolProjects";
import Alumni from "./pages/Alumni";
import Contact from "./pages/Contact";
import Boarding from "./pages/Boarding";
import SportsCulture from "./pages/SportsCulture";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/academics" element={<Academics />} />
            <Route path="/admissions" element={<Admissions />} />
            <Route path="/school-life" element={<SchoolLife />} />
            <Route path="/facilities" element={<Facilities />} />
            <Route path="/downloads" element={<Downloads />} />
            <Route path="/fees" element={<Fees />} />
            <Route path="/vacancies" element={<Vacancies />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/school-projects" element={<SchoolProjects />} />
            <Route path="/news" element={<News />} />
            <Route path="/alumni" element={<Alumni />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/boarding" element={<Boarding />} />
            <Route path="/sports-culture" element={<SportsCulture />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/portal/student" element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/portal/teacher" element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <TeacherDashboard />
              </ProtectedRoute>
            } />
            <Route path="/portal/parent-teacher" element={
              <ProtectedRoute allowedRoles={["parent"]}>
                <ParentTeacherDashboard />
              </ProtectedRoute>
            } />
            <Route path="/portal/admin" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
