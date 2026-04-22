import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import moeLogo from "@/assets/ministry-of-education-logo.png";
import cambridgeLogo from "@/assets/cambridge-logo.png";
import zimsecLogo from "@/assets/zimsec-logo.png";
import { useSiteLogos } from "@/hooks/useSiteLogos";

const fallbackBySlot: Record<string, string> = {
  affiliate_cambridge: cambridgeLogo,
  affiliate_moe: moeLogo,
  affiliate_zimsec: zimsecLogo,
};

export default function Footer() {
  const { logos: affiliates } = useSiteLogos("affiliated");

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <img src={schoolLogo} alt="Gifford High School crest" className="h-32 w-32 object-contain" />
              <span className="font-heading text-xl font-bold">Gifford High School</span>
            </div>
            <p className="text-xs italic text-primary-foreground/70">Hinc Orior — From Here I Arise</p>
            <p className="mt-1 text-sm text-primary-foreground/80">
              Nurturing excellence in education, sports, and character since 1927.
            </p>
          </div>

          <div>
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-secondary">Quick Links</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li><Link to="/about" className="hover:text-secondary transition-colors">About Us</Link></li>
              <li><Link to="/academics" className="hover:text-secondary transition-colors">Academics</Link></li>
              <li><Link to="/admissions" className="hover:text-secondary transition-colors">Admissions</Link></li>
              <li><Link to="/school-life" className="hover:text-secondary transition-colors">School Life</Link></li>
              <li><Link to="/fees" className="hover:text-secondary transition-colors">Fees</Link></li>
              <li><Link to="/school-projects" className="hover:text-secondary transition-colors">School Projects</Link></li>
              <li><Link to="/vacancies" className="hover:text-secondary transition-colors">Vacancies</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-secondary">Portals</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li><Link to="/login" className="hover:text-secondary transition-colors">Student Portal</Link></li>
              <li><Link to="/login" className="hover:text-secondary transition-colors">Parent/Teacher Portal</Link></li>
              <li><Link to="/login" className="hover:text-secondary transition-colors">Admin Portal</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-secondary">Contact</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0" /> Bulawayo, Zimbabwe</li>
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0" /> +263 29 XXXXXXX</li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0" /> info@giffordhigh.ac.zw</li>
            </ul>
          </div>
        </div>

        {/* Affiliations strip */}
        <div className="mt-12">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-secondary/40 to-transparent" />
            <p className="relative bg-primary px-6 text-center font-heading text-[11px] font-semibold uppercase tracking-[0.4em] text-secondary">
              Affiliated With
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {affiliates.map((a) => {
              const src = a.image_url || fallbackBySlot[a.slot_key] || schoolLogo;
              return (
                <div
                  key={a.id}
                  className="group relative flex flex-col items-center gap-3 rounded-xl border border-primary-foreground/10 bg-primary-foreground/[0.04] px-4 py-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-secondary/40 hover:bg-primary-foreground/[0.07] hover:shadow-[0_10px_30px_-10px_hsla(45,75%,55%,0.25)]"
                >
                  <div className="flex h-28 items-center justify-center">
                    <img
                      src={src}
                      alt={a.label}
                      className="max-h-28 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="text-center">
                    <p className="font-heading text-sm font-semibold text-primary-foreground">{a.label}</p>
                    {a.sub_label && (
                      <p className="mt-0.5 text-[11px] uppercase tracking-wider text-primary-foreground/60">{a.sub_label}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 border-t border-primary-foreground/10 pt-4 text-center text-xs text-primary-foreground/50">
          <p>© {new Date().getFullYear()} Gifford High School. All rights reserved.</p>
          <p className="mt-1">
            Designed &amp; maintained by{" "}
            <a href="https://mavingtech.com" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
              MavingTech Business Solutions
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
