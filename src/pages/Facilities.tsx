import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

type FacilityImage = {
  id: string;
  image_url: string;
  caption: string | null;
  facility_type: string;
};

const facilityTypes = [
  { value: "boarding", label: "Boarding Facilities" },
  { value: "classrooms", label: "Classrooms" },
  { value: "sports", label: "Sports Facilities" },
  { value: "labs", label: "Laboratories" },
  { value: "library", label: "Library" },
  { value: "general", label: "General" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function Facilities() {
  const [images, setImages] = useState<FacilityImage[]>([]);

  useEffect(() => {
    supabase
      .from("facility_images")
      .select("id, image_url, caption, facility_type")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setImages(data); });
  }, []);

  const typesWithImages = facilityTypes.filter(t => images.some(img => img.facility_type === t.value));

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-secondary py-16">
        <div className="container">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-heading text-4xl font-bold text-secondary-foreground">
            Our Facilities
          </motion.h1>
        </div>
      </section>

      {/* Intro */}
      <section className="py-12">
        <div className="container max-w-3xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-lg leading-relaxed text-muted-foreground"
          >
            Gifford High School provides excellent facilities to support both academic and residential life.
            Our boarding facilities offer a safe, supportive home-away-from-home environment for students,
            complemented by modern classrooms, well-equipped laboratories, sports grounds, and a comprehensive library.
          </motion.p>
        </div>
      </section>

      {/* Facility Images */}
      <section className="bg-section-warm py-16">
        <div className="container">
          {typesWithImages.length > 0 ? (
            <Tabs defaultValue={typesWithImages[0]?.value || "boarding"} className="space-y-8">
              <TabsList className="flex flex-wrap justify-center">
                <TabsTrigger value="all">All</TabsTrigger>
                {typesWithImages.map(t => (
                  <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="all">
                <FacilityGrid images={images} />
              </TabsContent>
              {typesWithImages.map(t => (
                <TabsContent key={t.value} value={t.value}>
                  <FacilityGrid images={images.filter(img => img.facility_type === t.value)} />
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <p className="text-center text-muted-foreground italic py-8">Facility images coming soon.</p>
          )}
        </div>
      </section>

      {/* Boarding Info */}
      <section className="py-16">
        <div className="container max-w-4xl">
          <h2 className="mb-8 text-center font-heading text-3xl font-bold text-primary">Boarding at Gifford</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              { title: "Boys' Hostel", desc: "Well-maintained dormitories with supervised study sessions, recreational areas, and 24-hour security." },
              { title: "Girls' Hostel", desc: "Safe, comfortable accommodation with dedicated house mothers, common rooms, and private study spaces." },
              { title: "Dining Hall", desc: "Nutritious meals prepared daily by our kitchen staff, catering for various dietary requirements." },
              { title: "Study & Recreation", desc: "Evening prep sessions, weekend activities, and pastoral care to ensure a balanced boarding experience." },
            ].map((item, i) => (
              <motion.div key={item.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <Card className="h-full border-none shadow-maroon">
                  <CardContent className="p-6">
                    <h3 className="font-heading text-lg font-semibold text-primary">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}

function FacilityGrid({ images }: { images: FacilityImage[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {images.map((img, i) => (
        <motion.div key={img.id} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
          <div className="overflow-hidden rounded-xl shadow-maroon">
            <img src={img.image_url} alt={img.caption || "Facility"} className="h-56 w-full object-cover transition-transform hover:scale-105" />
          </div>
          {img.caption && <p className="mt-2 text-center text-xs text-muted-foreground">{img.caption}</p>}
        </motion.div>
      ))}
    </div>
  );
}
