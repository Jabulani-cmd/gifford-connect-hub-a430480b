import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  
  { label: "About", path: "/about" },
  { label: "Academics", path: "/academics" },
  { label: "Admissions", path: "/admissions" },
  { label: "School Life", path: "/school-life" },
  { label: "Facilities", path: "/facilities" },
  { label: "Staff", path: "/staff" },
  { label: "Downloads", path: "/downloads" },
  { label: "Projects", path: "/school-projects" },
  { label: "News", path: "/news" },
  { label: "Alumni", path: "/alumni" },
  { label: "Contact", path: "/contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 border-b border-primary/10 bg-primary text-primary-foreground backdrop-blur">
      <div className="container flex h-28 items-center justify-between md:h-36">
        <Link to="/" className="flex items-center gap-3">
          <img src={schoolLogo} alt="Gifford High School crest" className="h-[104px] w-[104px] flex-shrink-0 object-contain md:h-[120px] md:w-[120px]" />
          <div className="flex flex-col justify-center leading-tight">
            <span className="block font-heading text-2xl font-bold tracking-tight text-primary-foreground md:text-3xl md:whitespace-nowrap">Gifford High School</span>
            <span className="block text-xs italic text-primary-foreground/70 md:text-sm">Hinc Orior — From Here I Arise</span>
          </div>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.path}
              to={l.path}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-primary-foreground/10 ${
                location.pathname === l.path ? "text-primary-foreground font-semibold" : "text-primary-foreground/70"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link to="/login">
            <Button size="sm" className="ml-2 bg-secondary text-secondary-foreground hover:bg-secondary/90">Portal Login</Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="text-primary-foreground md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-primary-foreground/10 bg-primary md:hidden"
          >
            <div className="container flex flex-col gap-1 py-4">
              {navLinks.map((l) => (
                <Link
                  key={l.path}
                  to={l.path}
                  onClick={() => setOpen(false)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-primary-foreground/10 ${
                    location.pathname === l.path ? "text-primary-foreground font-semibold" : "text-primary-foreground/70"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              <Link to="/login" onClick={() => setOpen(false)}>
                <Button size="sm" className="mt-2 w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">Portal Login</Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
