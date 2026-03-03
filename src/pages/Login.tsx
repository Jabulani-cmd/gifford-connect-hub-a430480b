import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "student") navigate("/portal/student");
    else if (role === "parent-teacher") navigate("/portal/parent-teacher");
    else if (role === "admin") navigate("/portal/admin");
  };

  return (
    <Layout>
      <section className="flex min-h-[70vh] items-center justify-center bg-section-warm py-16">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md px-4">
          <Card className="shadow-maroon">
            <CardHeader className="text-center">
              <img src={schoolLogo} alt="Gifford High School crest" className="mx-auto mb-2 h-16 w-16 object-contain" />
              <CardTitle className="font-heading text-2xl text-primary">Portal Login</CardTitle>
              <p className="text-xs italic text-muted-foreground">Hinc Orior — From Here I Arise</p>
              <p className="text-sm text-muted-foreground">Access your Gifford High portal</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email or Username</Label>
                  <Input id="email" placeholder="you@giffordhigh.ac.zw" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input id="password" type="password" placeholder="••••••••" required />
                    <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Login As</Label>
                  <Select value={role} onValueChange={setRole} required>
                    <SelectTrigger><SelectValue placeholder="Select your role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="parent-teacher">Parent / Teacher</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={!role}>
                  Sign In
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Demo: select a role and click Sign In
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </Layout>
  );
}
