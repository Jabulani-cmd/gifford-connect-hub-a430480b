import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "@/components/layout/Layout";
import HeroCarousel from "@/components/HeroCarousel";
import classroomImg from "@/assets/classroom.png";
import achievementsImg from "@/assets/achievements.png";
import schoolLogo from "@/assets/school-logo.png";
import { supabase } from "@/integrations/supabase/client";

function PrincipalPhoto() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("staff")
      .select("photo_url, full_name")
      .or("title.ilike.%principal%,title.ilike.%head%master%")
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0 && data[0].photo_url) setPhotoUrl(data[0].photo_url);
      });
  }, []);

  return (
    <div className="flex justify-center">
      <div className="relative">
        {photoUrl ? (
          <img src={photoUrl} alt="The Principal" className="h-80 w-64 rounded-xl object-cover object-top shadow-maroon" />
        ) : (
          <div className="flex h-80 w-64 items-center justify-center rounded-xl bg-maroon-light shadow-maroon">
            <img src={schoolLogo} alt="Gifford High School" className="h-32 w-32 object-contain opacity-60" />
          </div>
        )}
        <div className="absolute -bottom-4 -right-4 rounded-lg bg-primary px-4 py-2 shadow-lg">
          <span className="text-xs font-bold text-primary-foreground">The Principal</span>
        </div>
      </div>
    </div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.15, duration: 0.6 } }),
};

const highlights = [
  { title: "Academic Excellence", desc: "Cambridge & ZIMSEC curriculum with outstanding pass rates." },
  { title: "Sporting Achievements", desc: "Provincial and national champions in rugby, soccer, and athletics." },
  { title: "Vibrant Community", desc: "Over 20 clubs and societies fostering holistic student development." },
  { title: "Rich Heritage", desc: "Decades of tradition shaping tomorrow's leaders since 1965." },
];

export default function Home() {
  const [announcements, setAnnouncements] = useState<{ id: string; title: string; content: string | null; created_at: string }[]>([]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(4);
      if (data) setAnnouncements(data);
    };
    fetchAnnouncements();
  }, []);

  return (
    <Layout>
      <HeroCarousel />

      {/* Highlights */}
      <section className="bg-section-warm py-20">
        <div className="container">
          <h2 className="mb-12 text-center font-heading text-3xl font-bold text-primary">Why Gifford High?</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((h, i) => (
              <motion.div key={h.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <Card className="h-full border-none shadow-maroon transition-transform hover:-translate-y-1">
                  <CardContent className="flex flex-col items-center p-6 text-center">
                    <div className="mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-maroon-light">
                      <img src={schoolLogo} alt="Gifford High School" className="h-20 w-20 object-contain" />
                    </div>
                    <h3 className="mb-2 font-heading text-lg font-semibold">{h.title}</h3>
                    <p className="text-sm text-muted-foreground">{h.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Announcements from DB */}
      <section className="py-20">
        <div className="container">
          <h2 className="mb-10 text-center font-heading text-3xl font-bold text-primary">Announcements</h2>
          {announcements.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {announcements.map((a, i) => (
                <motion.div key={a.id} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                  <Card className="h-full transition-shadow hover:shadow-maroon">
                    <CardContent className="p-6">
                      <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                        {new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <h3 className="mt-2 font-heading text-lg font-semibold">{a.title}</h3>
                      {a.content && <p className="mt-2 text-sm text-muted-foreground">{a.content}</p>}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground italic">No announcements at this time.</p>
          )}
        </div>
      </section>

      {/* Principal's Message */}
      <section className="bg-section-warm py-20">
        <div className="container grid items-center gap-12 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <PrincipalPhoto />
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">Message from the Principal</span>
            <h2 className="mt-2 font-heading text-3xl font-bold text-primary">Welcome to Gifford High School</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              It is with great pride and pleasure that I welcome you to Gifford High School. Our institution has been a beacon of excellence in education since 1965, nurturing young minds to become leaders, innovators, and responsible citizens.
            </p>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              At Gifford, we believe in holistic education — combining rigorous academics with vibrant sporting and cultural programmes. Our dedicated staff work tirelessly to ensure every student reaches their full potential.
            </p>
            <p className="mt-3 font-heading text-sm font-semibold text-primary italic">
              — The Principal, Gifford High School
            </p>
            <Link to="/about" className="mt-6 inline-block">
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                Learn More <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* About Snapshot */}
      <section className="py-20">
        <div className="container grid items-center gap-12 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="order-2 lg:order-1">
            <h2 className="font-heading text-3xl font-bold text-primary">A Tradition of Excellence</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Founded in 1965, Gifford High School has been a cornerstone of education in Bulawayo. Our students consistently achieve top results in both ZIMSEC and Cambridge examinations, and our alumni hold distinguished positions across the globe.
            </p>
            <Link to="/about" className="mt-6 inline-block">
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                About Us <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="order-1 lg:order-2">
            <img src={classroomImg} alt="Students in classroom" className="rounded-xl shadow-maroon" />
          </motion.div>
        </div>
      </section>

      {/* Achievements Snapshot */}
      <section className="py-20">
        <div className="container grid items-center gap-12 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="order-2 lg:order-1">
            <h2 className="font-heading text-3xl font-bold text-primary">Celebrating Achievement</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Our students consistently excel in national examinations, inter-school competitions, and sporting events. We celebrate every milestone, from academic honours to sportsmanship awards.
            </p>
            <Link to="/academics" className="mt-6 inline-block">
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                View Academics <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="order-1 lg:order-2">
            <img src={achievementsImg} alt="Students celebrating achievements" className="rounded-xl shadow-maroon" />
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-maroon-gradient py-16">
        <div className="container text-center">
          <h2 className="font-heading text-3xl font-bold text-primary-foreground">Ready to Join the Gifford Family?</h2>
          <p className="mx-auto mt-3 max-w-lg text-primary-foreground/80">
            Applications for the next academic year are now open. Take the first step towards a world-class education.
          </p>
          <Link to="/admissions" className="mt-8 inline-block">
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              Apply Now <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
