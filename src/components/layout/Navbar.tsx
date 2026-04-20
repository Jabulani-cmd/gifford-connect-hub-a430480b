import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown, Star } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface NavItem {
  label: string;
  path: string;
  children?: { label: string; path: string }[];
}

const navLinks: NavItem[] = [
  { label: "Home", path: "/" },
  {
    label: "About",
    path: "/about",
    children: [
      { label: "News", path: "/news" },
      { label: "School Projects", path: "/school-projects" },
      { label: "Facilities", path: "/facilities" },
      { label: "Boarding", path: "/boarding" },
    ],
  },
  {
    label: "Academics",
    path: "/academics",
    children: [{ label: "Downloads", path: "/downloads" }],
  },
  {
    label: "Admissions",
    path: "/admissions",
    children: [{ label: "Fees", path: "/fees" }],
  },
  {
    label: "Sports & Culture",
    path: "/sports-culture",
    children: [
      { label: "School Life", path: "/school-life" },
      { label: "Awards & Prize-Giving", path: "/awards" },
    ],
  },
  {
    label: "Staff",
    path: "/staff",
    children: [{ label: "Vacancies", path: "/vacancies" }],
  },
  { label: "Alumni", path: "/alumni" },
  { label: "Contact Us", path: "/contact" },
];

function NavLinkItem({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`group relative px-5 py-3 font-body text-sm font-medium tracking-wide transition-all duration-300 ease-out motion-reduce:transition-none ${
        active ? "text-[hsl(var(--hero-gold))]" : "text-cream"
      }`}
    >
      {label}
      <span
        className={`pointer-events-none absolute bottom-2 left-5 h-[2px] bg-[hsl(var(--hero-gold))] transition-all duration-300 ease-out motion-reduce:transition-none ${
          active ? "w-[calc(100%-40px)]" : "w-0 group-hover:w-[calc(100%-40px)] group-focus:w-[calc(100%-40px)]"
        }`}
      />
    </Link>
  );
}

function DesktopDropdown({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  const isActive =
    location.pathname === item.path ||
    item.children?.some((c) => location.pathname === c.path);

  const handleEnter = () => {
    clearTimeout(timeout.current);
    setOpen(true);
  };
  const handleLeave = () => {
    timeout.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => () => clearTimeout(timeout.current), []);

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <Link
        to={item.path}
        className={`group relative flex items-center gap-1 px-5 py-3 font-body text-sm font-medium tracking-wide transition-all duration-300 ease-out motion-reduce:transition-none ${
          isActive ? "text-[hsl(var(--hero-gold))]" : "text-cream"
        }`}
      >
        {item.label}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
        <span
          className={`pointer-events-none absolute bottom-2 left-5 h-[2px] bg-[hsl(var(--hero-gold))] transition-all duration-300 ease-out motion-reduce:transition-none ${
            isActive ? "w-[calc(100%-40px)]" : "w-0 group-hover:w-[calc(100%-40px)]"
          }`}
        />
      </Link>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-md border border-[hsl(var(--hero-gold)/0.25)] bg-navy p-1 shadow-xl"
          >
            {item.children!.map((child) => (
              <Link
                key={child.path}
                to={child.path}
                onClick={() => setOpen(false)}
                className="block rounded-sm px-3 py-2 font-body text-sm text-cream/80 transition-colors hover:bg-[hsl(var(--hero-gold)/0.15)] hover:text-[hsl(var(--hero-gold))]"
              >
                {child.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileAccordion({ item, onClose }: { item: NavItem; onClose: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="flex items-center">
        <Link
          to={item.path}
          onClick={onClose}
          className="flex-1 rounded-md px-3 py-2 font-body text-sm font-medium text-cream hover:bg-cream/10"
        >
          {item.label}
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-md p-2 text-cream/70 hover:bg-cream/10"
          aria-label={`Expand ${item.label}`}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden pl-4"
          >
            {item.children!.map((child) => (
              <Link
                key={child.path}
                to={child.path}
                onClick={onClose}
                className="block rounded-md px-3 py-2 font-body text-sm text-cream/80 hover:bg-cream/10 hover:text-[hsl(var(--hero-gold))]"
              >
                {child.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <header
      className="absolute left-0 right-0 top-0 z-30 w-full border-b border-[hsl(var(--hero-gold)/0.25)]"
      style={{
        background:
          "linear-gradient(90deg, hsl(var(--navy)) 0%, hsl(var(--navy-deep)) 100%)",
      }}
    >
      <div className="mx-auto flex min-h-[88px] max-w-[1400px] items-center justify-between px-6 md:px-10">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-4">
          <img src={schoolLogo} alt="Gifford High School crest" className="h-10 w-10 object-contain md:h-12 md:w-12" />
          <span
            className="hidden font-heading font-semibold uppercase text-cream sm:block"
            style={{ fontSize: "20px", letterSpacing: "4px" }}
          >
            Gifford High
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-2 lg:flex">
          {navLinks.map((item) =>
            item.children ? (
              <DesktopDropdown key={item.path} item={item} />
            ) : (
              <NavLinkItem
                key={item.path}
                to={item.path}
                label={item.label}
                active={location.pathname === item.path}
              />
            ),
          )}
          <Link to="/login" className="ml-3">
            <Button
              size="sm"
              className="bg-[hsl(var(--hero-gold))] font-body font-semibold tracking-wide text-navy hover:bg-[hsl(var(--hero-gold-muted))] hover:text-navy"
            >
              Portal Login
            </Button>
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          className="flex h-11 w-11 items-center justify-center rounded-md border border-cream/30 text-cream lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-[hsl(var(--hero-gold)/0.25)] bg-navy lg:hidden"
          >
            <div className="mx-auto flex max-w-[1400px] flex-col gap-1 px-6 py-4">
              {navLinks.map((item) =>
                item.children ? (
                  <MobileAccordion key={item.path} item={item} onClose={() => setMobileOpen(false)} />
                ) : (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-2 font-body text-sm font-medium text-cream hover:bg-cream/10"
                  >
                    {item.label}
                  </Link>
                ),
              )}
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <Button
                  size="sm"
                  className="mt-2 w-full bg-[hsl(var(--hero-gold))] font-semibold text-navy hover:bg-[hsl(var(--hero-gold-muted))]"
                >
                  Portal Login
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
