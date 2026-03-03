import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from "@/components/ui/carousel";
import heroImg from "@/assets/hero-school.png";

type CarouselImage = {
  id: string;
  image_url: string;
  display_order: number;
};

export default function HeroCarousel() {
  const [images, setImages] = useState<CarouselImage[]>([]);
  const [api, setApi] = useState<CarouselApi>();
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

  const onSelect = useCallback(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on("select", onSelect);
    return () => { api.off("select", onSelect); };
  }, [api, onSelect]);

  // Auto-advance every 5s
  useEffect(() => {
    if (!api) return;
    const interval = setInterval(() => api.scrollNext(), 5000);
    return () => clearInterval(interval);
  }, [api]);

  // Fallback to hero image if no carousel images in DB
  const slides = images.length > 0
    ? images.map((img) => ({ id: img.id, src: img.image_url }))
    : [{ id: "fallback", src: heroImg }];

  return (
    <section className="relative w-full overflow-hidden" style={{ aspectRatio: "16/7" }}>
      <Carousel opts={{ loop: true }} setApi={setApi} className="h-full">
        <CarouselContent className="-ml-0 h-full">
          {slides.map((slide) => (
            <CarouselItem key={slide.id} className="pl-0 h-full">
              <div className="relative h-full w-full">
                <img
                  src={slide.src}
                  alt="Gifford High School"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {slides.length > 1 && (
          <>
            <CarouselPrevious className="left-4 top-1/2 z-20 h-10 w-10 border-none bg-background/50 text-foreground hover:bg-background/80" />
            <CarouselNext className="right-4 top-1/2 z-20 h-10 w-10 border-none bg-background/50 text-foreground hover:bg-background/80" />
            {/* Dots */}
            <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => api?.scrollTo(i)}
                  className={`h-2.5 w-2.5 rounded-full transition-all ${
                    i === current ? "bg-accent w-6" : "bg-primary-foreground/50"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </Carousel>
    </section>
  );
}
