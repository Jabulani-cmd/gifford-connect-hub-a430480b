import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero-school.png";
import schoolLogo from "@/assets/school-logo.png";

type StaffMember = {
  id: string;
  full_name: string;
  title: string | null;
  department: string | null;
  bio: string | null;
  photo_url: string | null;
  email: string | null;
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function Staff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [groupPhoto, setGroupPhoto] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("staff")
      .select("id, full_name, title, department, bio, photo_url, email")
      .order("full_name")
      .then(({ data }) => { if (data) setStaff(data); });

    // Fetch group photo from gallery with category "staff-group"
    supabase
      .from("gallery_images")
      .select("image_url")
      .eq("category", "staff-group")
      .eq("is_active", true)
      .limit(1)
      .then(({ data }) => { if (data && data.length > 0) setGroupPhoto(data[0].image_url); });
  }, []);

  const leadership = staff.filter(s =>
    s.title && /head|principal|deputy|hod|dean|director/i.test(s.title)
  );
  const departments = [...new Set(staff.map(s => s.department).filter(Boolean))] as string[];

  return (
    <Layout>
      {/* Hero */}
      <section className="relative h-64 overflow-hidden sm:h-80">
        <img src={heroImg} alt="Gifford High School" className="absolute inset-0 h-full w-full object-cover" />
        <div className="bg-hero-overlay absolute inset-0" />
        <div className="container relative z-10 flex h-full items-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-heading text-4xl font-bold text-primary-foreground">
            Our Staff
          </motion.h1>
        </div>
      </section>

      {/* Group Photo */}
      {groupPhoto && (
        <section className="py-12">
          <div className="container max-w-4xl">
            <motion.div initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
              <img src={groupPhoto} alt="Gifford High School Staff" className="w-full rounded-xl shadow-maroon object-cover" style={{ aspectRatio: "16/9" }} />
              <p className="mt-3 text-center text-sm text-muted-foreground italic">Gifford High School Staff — 2026</p>
            </motion.div>
          </div>
        </section>
      )}

      {/* Leadership */}
      {leadership.length > 0 && (
        <section className="bg-section-warm py-16">
          <div className="container">
            <h2 className="mb-10 text-center font-heading text-3xl font-bold text-primary">School Leadership</h2>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {leadership.map((member, i) => (
                <motion.div key={member.id} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                  <Card className="h-full border-none shadow-maroon overflow-hidden">
                    <div className="flex flex-col items-center p-6 text-center">
                      {member.photo_url ? (
                        <img src={member.photo_url} alt={member.full_name} className="mb-4 h-32 w-32 rounded-full object-cover object-top shadow-md" />
                      ) : (
                        <div className="mb-4 flex h-32 w-32 items-center justify-center rounded-full bg-maroon-light">
                          <span className="font-heading text-4xl font-bold text-primary">{member.full_name[0]}</span>
                        </div>
                      )}
                      <h3 className="font-heading text-lg font-bold">{member.full_name}</h3>
                      {member.title && <p className="text-sm font-medium text-accent">{member.title}</p>}
                      {member.department && <p className="text-xs text-muted-foreground">{member.department}</p>}
                      {member.bio && <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{member.bio}</p>}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Staff by Department */}
      <section className="py-16">
        <div className="container">
          <h2 className="mb-8 text-center font-heading text-3xl font-bold text-primary">Teaching Staff</h2>

          {departments.length > 0 ? (
            <Tabs defaultValue={departments[0]} className="space-y-6">
              <TabsList className="flex flex-wrap justify-center">
                <TabsTrigger value="all">All</TabsTrigger>
                {departments.map(d => (
                  <TabsTrigger key={d} value={d}>{d}</TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="all">
                <StaffGrid members={staff} />
              </TabsContent>
              {departments.map(d => (
                <TabsContent key={d} value={d}>
                  <StaffGrid members={staff.filter(s => s.department === d)} />
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <StaffGrid members={staff} />
          )}

          {staff.length === 0 && (
            <p className="text-center text-muted-foreground italic">Staff directory coming soon.</p>
          )}
        </div>
      </section>
    </Layout>
  );
}

function StaffGrid({ members }: { members: StaffMember[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {members.map((member, i) => (
        <motion.div key={member.id} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
          <Card className="h-full transition-shadow hover:shadow-maroon overflow-hidden">
            {member.photo_url ? (
              <div className="relative w-full" style={{ aspectRatio: "3/4" }}>
                <img src={member.photo_url} alt={member.full_name} className="absolute inset-0 h-full w-full object-cover object-top" />
              </div>
            ) : (
              <div className="flex items-center justify-center bg-maroon-light" style={{ aspectRatio: "3/4" }}>
                <span className="font-heading text-5xl font-bold text-primary">{member.full_name[0]}</span>
              </div>
            )}
            <CardContent className="p-4">
              <h3 className="font-heading text-sm font-bold">{member.full_name}</h3>
              {member.title && <p className="text-xs font-medium text-accent">{member.title}</p>}
              {member.department && <p className="text-xs text-muted-foreground">{member.department} Department</p>}
              {member.bio && <p className="mt-2 text-xs text-muted-foreground line-clamp-3">{member.bio}</p>}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
