import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const navigate = useNavigate();
  const { signIn, role, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Seed admin on first visit
  useEffect(() => {
    const seedAdmin = async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        await fetch(`https://${projectId}.supabase.co/functions/v1/manage-users`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({ action: "seed-admin" }),
        });
      } catch {
        // Silently fail
      }
    };
    seedAdmin();
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user && role) {
      redirectByRole(role);
    }
  }, [authLoading, user, role]);

  const redirectByRole = (r: string) => {
    if (r === "student") navigate("/portal/student");
    else if (r === "parent" || r === "teacher") navigate("/portal/parent-teacher");
    else if (r === "admin") navigate("/portal/admin");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Login failed", description: err?.message || "An unexpected error occurred", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <section className="flex min-h-[70vh] items-center justify-center bg-section-warm py-16">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md px-4">
          <Card className="shadow-maroon">
            <CardHeader className="text-center">
              <img src={schoolLogo} alt="Gifford High School crest" className="mx-auto mb-2 h-32 w-32 object-contain" />
              <CardTitle className="font-heading text-2xl text-primary">Portal Login</CardTitle>
              <p className="text-xs italic text-muted-foreground">Hinc Orior — From Here I Arise</p>
              <p className="text-sm text-muted-foreground">Access your Gifford High portal</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@giffordhigh.ac.zw"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
                <div className="text-center space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Parent?{" "}
                    <Link to="/register" className="text-primary font-medium hover:underline">
                      Register here
                    </Link>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Students & teachers: credentials provided by admin
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </Layout>
  );
}
