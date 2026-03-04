import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero-school.png";

type CarouselImage = {
  id: string;
  image_url: string;
  display_order: number;
};

export default function HeroCarousel() {
  const [images, setImages] = useState<CarouselImage[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    supabase
      .from("carousel_images")
      .select("id, image_url, display_order")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setImages(data);
        }
      });
  }, []);

  const slides = images.length > 0
    ? images.map((img) => ({ id: img.id, src: img.image_url }))
    : [{ id: "fallback", src: heroImg }];

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const goTo = (index: number) => setCurrent(index);

  return (
    <section className="relative w-full overflow-hidden" style={{ aspectRatio: "16/7", minHeight: 260 }}>
      {slides.map((slide, i) => (
        <img
          key={slide.id}
          src={slide.src}
          alt="Gifford High School"
          className="absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700"
          style={{ opacity: i === current ? 1 : 0 }}
          onError={(e) => {
            e.currentTarget.src = heroImg;
          }}
        />
      ))}

      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-2.5 rounded-full transition-all ${
                i === current ? "bg-accent w-6" : "bg-primary-foreground/50 w-2.5"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
