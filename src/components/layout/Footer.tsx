import { Link } from "react-router-dom";
import { GraduationCap, Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-maroon-gradient text-primary-foreground">
      <div className="container py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <GraduationCap className="h-7 w-7 text-gold" />
              <span className="font-heading text-xl font-bold">Gifford High</span>
            </div>
            <p className="text-sm text-primary-foreground/80">
              Nurturing excellence in education, sports, and character since 1965.
            </p>
          </div>

          <div>
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-gold">Quick Links</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li><Link to="/about" className="hover:text-gold transition-colors">About Us</Link></li>
              <li><Link to="/academics" className="hover:text-gold transition-colors">Academics</Link></li>
              <li><Link to="/admissions" className="hover:text-gold transition-colors">Admissions</Link></li>
              <li><Link to="/school-life" className="hover:text-gold transition-colors">School Life</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-gold">Portals</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li><Link to="/login" className="hover:text-gold transition-colors">Student Portal</Link></li>
              <li><Link to="/login" className="hover:text-gold transition-colors">Parent/Teacher Portal</Link></li>
              <li><Link to="/login" className="hover:text-gold transition-colors">Admin Portal</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-gold">Contact</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0" /> Bulawayo, Zimbabwe</li>
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0" /> +263 29 XXXXXXX</li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0" /> info@giffordhigh.ac.zw</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-primary-foreground/20 pt-6 text-center text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} Gifford High School. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
