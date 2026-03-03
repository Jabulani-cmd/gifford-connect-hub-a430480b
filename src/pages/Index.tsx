import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Trophy, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "@/components/layout/Layout";
import heroImg from "@/assets/hero-school.png";
import classroomImg from "@/assets/classroom.png";
import achievementsImg from "@/assets/achievements.png";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.15, duration: 0.6 } }),
};

const highlights = [
  { icon: BookOpen, title: "Academic Excellence", desc: "Cambridge & ZIMSEC curriculum with outstanding pass rates." },
  { icon: Trophy, title: "Sporting Achievements", desc: "Provincial and national champions in rugby, soccer, and athletics." },
  { icon: Users, title: "Vibrant Community", desc: "Over 20 clubs and societies fostering holistic student development." },
  { icon: Calendar, title: "Rich Heritage", desc: "Decades of tradition shaping tomorrow's leaders since 1965." },
];

const announcements = [
  { title: "Term 1 Exam Results Published", date: "Feb 28, 2026", excerpt: "Form 4 and Upper 6 results are now available on the student portal." },
  { title: "Inter-house Athletics Day", date: "Mar 15, 2026", excerpt: "Annual athletics day at the school stadium. All parents welcome." },
  { title: "Open Day for Prospective Students", date: "Apr 5, 2026", excerpt: "Tour our campus and meet our teachers. Register online now." },
];

export default function Home() {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative h-[85vh] min-h-[500px] overflow-hidden">
        <img src={heroImg} alt="Gifford High School campus" className="absolute inset-0 h-full w-full object-cover" />
        <div className="bg-hero-overlay absolute inset-0" />
        <div className="container relative z-10 flex h-full flex-col items-center justify-center text-center">
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl font-heading text-4xl font-bold leading-tight text-primary-foreground sm:text-5xl lg:text-6xl"
          >
            Excellence in Education, Character & Sport
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="mt-4 max-w-xl text-lg text-primary-foreground/85"
          >
            Gifford High School, Bulawayo — shaping tomorrow's leaders through a proud tradition of academic rigour and holistic development.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-8 flex flex-wrap justify-center gap-4"
          >
            <Link to="/admissions">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-maroon">
                Apply Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10">
                Portal Login
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Highlights */}
      <section className="bg-section-warm py-20">
        <div className="container">
          <h2 className="mb-12 text-center font-heading text-3xl font-bold text-primary">Why Gifford High?</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((h, i) => (
              <motion.div key={h.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <Card className="h-full border-none shadow-maroon transition-transform hover:-translate-y-1">
                  <CardContent className="flex flex-col items-center p-6 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-maroon-light">
                      <h.icon className="h-7 w-7 text-primary" />
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

      {/* About Snapshot */}
      <section className="py-20">
        <div className="container grid items-center gap-12 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <img src={classroomImg} alt="Students in classroom" className="rounded-xl shadow-maroon" />
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <h2 className="font-heading text-3xl font-bold text-primary">A Tradition of Excellence</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Founded in 1965, Gifford High School has been a cornerstone of education in Bulawayo. Our students consistently achieve top results in both ZIMSEC and Cambridge examinations, and our alumni hold distinguished positions across the globe.
            </p>
            <Link to="/about" className="mt-6 inline-block">
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                Learn More <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Achievements Snapshot */}
      <section className="bg-section-warm py-20">
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

      {/* Announcements */}
      <section className="py-20">
        <div className="container">
          <h2 className="mb-10 text-center font-heading text-3xl font-bold text-primary">Latest News</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {announcements.map((a, i) => (
              <motion.div key={i} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <Card className="h-full transition-shadow hover:shadow-maroon">
                  <CardContent className="p-6">
                    <span className="text-xs font-semibold uppercase tracking-wider text-accent">{a.date}</span>
                    <h3 className="mt-2 font-heading text-lg font-semibold">{a.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{a.excerpt}</p>
                    <Link to="/news" className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline">
                      Read more <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
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
