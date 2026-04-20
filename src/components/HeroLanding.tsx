import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";

export default function HeroLanding() {
  return (
    <section
      className="relative flex min-h-screen items-center bg-cover bg-center"
      style={{
        backgroundImage:
          "linear-gradient(hsl(var(--navy) / 0.78), hsl(var(--navy) / 0.78)), url('https://images.unsplash.com/photo-1508780709619-79562169bc64?q=80&w=2000&auto=format&fit=crop')",
      }}
    >
      <div className="mx-auto w-full max-w-[1400px] px-6 pb-16 pt-32 md:px-10 md:pt-40 lg:pt-44">
        <div className="max-w-[900px]">
          <p
            className="mb-4 font-body text-[14px] font-medium uppercase text-[hsl(var(--hero-gold))]"
            style={{ letterSpacing: "3px" }}
          >
            Welcome to
          </p>
          <h1
            className="mb-6 font-heading font-semibold leading-[1.1] text-cream"
            style={{ fontSize: "clamp(48px, 5vw, 84px)", letterSpacing: "2px" }}
          >
            Gifford High School
          </h1>
          <p
            className="font-body text-[20px] leading-[1.6] text-cream/90"
            style={{ maxWidth: "720px" }}
          >
            Where we <em className="not-italic font-normal italic text-[hsl(var(--hero-gold))]">celebrate and inspire</em>{" "}
            generations of diversely talented young men since 1927.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link to="/admissions">
              <button
                className="inline-flex min-h-[44px] items-center gap-2.5 rounded-md bg-[hsl(var(--hero-gold))] px-6 py-3 font-body font-semibold text-navy transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-[hsl(var(--hero-gold-muted))] motion-reduce:transition-none motion-reduce:hover:transform-none"
              >
                <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.5} />
                Enrol
              </button>
            </Link>
            <Link to="/contact">
              <button
                className="inline-flex min-h-[44px] items-center gap-2.5 rounded-md border border-cream/50 bg-transparent px-6 py-3 font-body font-semibold text-cream transition-all duration-300 ease-out hover:border-[hsl(var(--hero-gold))] hover:bg-cream/10 motion-reduce:transition-none"
              >
                <MessageCircle className="h-[18px] w-[18px]" strokeWidth={2} />
                Connect
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom fade to cream */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-[120px] w-full"
        style={{
          background:
            "linear-gradient(to bottom, hsl(var(--navy) / 0) 0%, hsl(var(--cream)) 100%)",
        }}
      />
    </section>
  );
}
