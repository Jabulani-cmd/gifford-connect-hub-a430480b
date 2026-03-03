import { useState, useEffect, useCallback } from "react";
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

  // Auto-advance every 5s
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const goTo = (index: number) => setCurrent(index);
  const goPrev = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  const goNext = () => setCurrent((prev) => (prev + 1) % slides.length);

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
        <>
          <button
            onClick={goPrev}
            className="absolute left-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/50 text-foreground hover:bg-background/80 transition-colors"
            aria-label="Previous slide"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button
            onClick={goNext}
            className="absolute right-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/50 text-foreground hover:bg-background/80 transition-colors"
            aria-label="Next slide"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
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
        </>
      )}
    </section>
  );
}
