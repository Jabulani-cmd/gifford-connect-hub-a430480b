import { motion } from "framer-motion";
import Layout from "@/components/layout/Layout";
import sportsImg from "@/assets/sports.png";
import classroomImg from "@/assets/classroom.png";
import achievementsImg from "@/assets/achievements.png";
import heroImg from "@/assets/hero-school.png";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Music, BookOpen, Palette, Users, Volleyball } from "lucide-react";

const sports = [
  { name: "Rugby", desc: "Provincial champions 2024. U-16 and 1st XV teams." },
  { name: "Soccer", desc: "Boys and girls teams compete in the Inter-Schools League." },
  { name: "Athletics", desc: "Track & field, cross-country, and inter-house competitions." },
  { name: "Swimming", desc: "Annual galas and inter-school relay events." },
  { name: "Cricket", desc: "Boys 1st XI competing at provincial level." },
  { name: "Netball", desc: "Girls teams representing at national level." },
];

const clubs = [
  { icon: Music, name: "Choir & Music", desc: "Award-winning choir performing at national festivals." },
  { icon: Palette, name: "Drama Club", desc: "Annual productions and inter-school drama competitions." },
  { icon: BookOpen, name: "Debate Society", desc: "Critical thinking and public speaking development." },
  { icon: Users, name: "Community Service", desc: "Outreach programmes and environmental conservation." },
  { icon: Volleyball, name: "Chess Club", desc: "Strategic thinking — provincial finalists 2025." },
  { icon: Trophy, name: "Science Club", desc: "Hands-on experiments and science olympiads." },
];

const galleryImages = [heroImg, classroomImg, sportsImg, achievementsImg];

export default function SchoolLife() {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative h-64 overflow-hidden sm:h-80">
        <img src={sportsImg} alt="Sports" className="absolute inset-0 h-full w-full object-cover" />
        <div className="bg-hero-overlay absolute inset-0" />
        <div className="container relative z-10 flex h-full items-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-heading text-4xl font-bold text-primary-foreground">
            School Life
          </motion.h1>
        </div>
      </section>

      <section className="py-16">
        <div className="container">
          <Tabs defaultValue="sports">
            <TabsList className="mb-8">
              <TabsTrigger value="sports">Sports</TabsTrigger>
              <TabsTrigger value="clubs">Clubs & Activities</TabsTrigger>
              <TabsTrigger value="gallery">Gallery</TabsTrigger>
            </TabsList>

            <TabsContent value="sports">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sports.map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                    <Card className="h-full transition-shadow hover:shadow-maroon">
                      <CardContent className="p-5">
                        <h3 className="font-heading font-semibold text-primary">{s.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="clubs">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {clubs.map((c, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                    <Card className="h-full transition-shadow hover:shadow-maroon">
                      <CardContent className="flex items-start gap-4 p-5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-maroon-light">
                          <c.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-heading font-semibold">{c.name}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="gallery">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                {galleryImages.map((img, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                    <img src={img} alt={`Gallery ${i + 1}`} className="h-64 w-full rounded-xl object-cover shadow-maroon transition-transform hover:scale-[1.02]" />
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </Layout>
  );
}
