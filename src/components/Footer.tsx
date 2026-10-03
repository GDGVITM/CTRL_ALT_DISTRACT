import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "../context/AuthContext";
import { useEvent } from "../context/EventContext";

const COMMUNITY_LINKS = [
  { label: "GDG website", href: "https://gdgsite.vercel.app" },
  { label: "Instagram", href: "https://www.instagram.com/gdg_vit" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/google-developer-groups-vit-mumbai" },
  { label: "GitHub", href: "https://github.com/GDGVITM" },
];

const linkClass = "inline-flex min-h-9 items-center gap-2 rounded-xs font-body text-sm text-text-secondary transition-colors hover:text-accent-cyan focus-visible:text-accent-cyan";

export function Footer() {
  const EVENT = useEvent();
  const { user, role } = useAuth();
  const accountLink = user
    ? role === "admin" ? { to: "/admin", label: "Admin console" } : { to: "/dashboard", label: "Dashboard" }
    : { to: "/login", label: "Log in" };
  const showCollege = !EVENT.organizerName.toLowerCase().includes(EVENT.collegeName.toLowerCase());

  return (
    <footer className="border-t border-border-hairline bg-bg-base">
      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-8 sm:py-10">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[1.5fr_0.7fr_1fr] md:gap-10">
          <div className="col-span-2 md:col-span-1">
            <Logo size={24} />
            <p className="mt-4 max-w-[40ch] font-body text-sm leading-relaxed text-text-secondary">
              Organized by {EVENT.organizerName}
            </p>
            {showCollege && <p className="mt-1 font-body text-sm leading-relaxed text-text-muted">{EVENT.collegeName}</p>}
          </div>
          <nav aria-label="Event links">
            <h2 className="font-label text-[15px] uppercase tracking-[0.04em] text-text-muted">
              Event
            </h2>
            <ul className="mt-3 space-y-1">
              <li><Link to="/rules" className={linkClass}>Rules</Link></li>
              <li><Link to="/leaderboard" className={linkClass}>Leaderboard</Link></li>
              <li><Link to={accountLink.to} className={linkClass}>{accountLink.label}</Link></li>
            </ul>
          </nav>
          <nav aria-label="GDG community links">
            <h2 className="font-label text-[15px] uppercase tracking-[0.04em] text-text-muted">
              GDG community
            </h2>
            <ul className="mt-3 space-y-1">
              {COMMUNITY_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    {label}
                    <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-8 flex flex-col gap-3 border-t border-border-hairline pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-body text-xs text-text-muted">© {new Date().getFullYear()} Ctrl Alt Distract</p>
          <a href="https://linktr.ee/gdgvitm" target="_blank" rel="noopener noreferrer" className={linkClass}>
            GDG-VIT Mumbai Linktree
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
