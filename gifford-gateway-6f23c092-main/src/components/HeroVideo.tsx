import { useEffect, useRef } from "react";
import heroPoster from "@/assets/hero-school.png";

type HeroVideoProps = {
  subtitle?: string;
  title?: string;
  description?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  videoSrc?: string;
  posterSrc?: string;
};

export default function HeroVideo({
  subtitle = "Academic",
  title = "Excellence",
  description = "Inspiring students to achieve their highest potential through discipline, leadership, and a commitment to academic distinction.",
  primaryLabel = "Apply Now",
  primaryHref = "/admissions",
  secondaryLabel = "Explore Academics",
  secondaryHref = "/academics",
  videoSrc = "https://cdn.pixabay.com/video/2020/09/08/49375-458382119_large.mp4",
  posterSrc,
}: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = 0.9;
  }, []);

  return (
    <section className="hero-video">
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        poster={posterSrc || heroPoster}
        className="hero-video__media"
      >
        <source src={videoSrc} type="video/mp4" />
      </video>

      <div className="hero-video__content">
        <div className="hero-video__subtitle">{subtitle}</div>
        <h1 className="hero-video__title">{title}</h1>
        <p className="hero-video__description">{description}</p>
        <div className="hero-video__actions">
          <a href={primaryHref} className="hero-video__btn hero-video__btn--primary">
            {primaryLabel}
          </a>
          <a href={secondaryHref} className="hero-video__btn hero-video__btn--secondary">
            {secondaryLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
