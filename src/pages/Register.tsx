import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock, UserPlus } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Student linking
  const [students, setStudents] = useState<{ id: string; full_name: string; grade: string | null }[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/manage-users`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({ action: "get-students" }),
        }
      );
      const data = await res.json();
      if (data.students) setStudents(data.students);
    } catch {
      // Students list may not be available yet
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await signUp(email, password, fullName);
      if (error) throw error;

      const userId = data?.user?.id;
      if (!userId) throw new Error("Registration failed");

      // Update profile with phone
      await supabase.from("profiles").update({ phone }).eq("id", userId);

      // Assign parent role
      await supabase.from("user_roles").insert({ user_id: userId, role: "parent" as any });

      // Link selected children
      if (selectedStudents.length > 0) {
        const links = selectedStudents.map((studentId) => ({
          parent_id: userId,
          student_id: studentId,
        }));
        await supabase.from("parent_students" as any).insert(links);
      }

      toast({ title: "Registration successful!", description: "You can now sign in." });
      navigate("/login");
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const filteredStudents = students.filter((s) =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <section className="flex min-h-[70vh] items-center justify-center bg-section-warm py-16">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg px-4">
          <Card className="shadow-maroon">
            <CardHeader className="text-center">
              <img src={schoolLogo} alt="Gifford High School crest" className="mx-auto mb-2 h-16 w-16 object-contain" />
              <CardTitle className="font-heading text-2xl text-primary">Parent Registration</CardTitle>
              <p className="text-xs italic text-muted-foreground">Hinc Orior — From Here I Arise</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+263 7X XXX XXXX" />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="relative">
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                    <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required />
                </div>

                {/* Link Children */}
                <div className="space-y-2">
                  <Label>Link Your Children (Students)</Label>
                  <Input
                    placeholder="Search student by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {filteredStudents.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-2">
                      {filteredStudents.map((s) => (
                        <label key={s.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted rounded p-1">
                          <Checkbox
                            checked={selectedStudents.includes(s.id)}
                            onCheckedChange={() => toggleStudent(s.id)}
                          />
                          <span className="text-sm">{s.full_name}</span>
                          {s.grade && <span className="text-xs text-muted-foreground">({s.grade})</span>}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      {students.length === 0
                        ? "No students registered yet. You can link them later."
                        : "No students match your search."}
                    </p>
                  )}
                  {selectedStudents.length > 0 && (
                    <p className="text-xs text-primary font-medium">{selectedStudents.length} child(ren) selected</p>
                  )}
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {loading ? "Registering..." : "Register"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Already have an account?{" "}
                  <a href="/login" className="text-primary hover:underline">Sign in</a>
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </Layout>
  );
}
