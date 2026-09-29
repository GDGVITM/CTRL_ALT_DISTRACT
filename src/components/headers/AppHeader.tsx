import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Shield } from "lucide-react";
import { Logo } from "../Logo";
import { StatusBadge } from "../ui/Badge";
import { PLAYER } from "../../lib/data";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";

export type EventBadgeState = "upcoming" | "joined" | "waiting" | "live" | "ended" | "finished";

const badgeConfig: Record<
  EventBadgeState,
  { label: string; tone: "cyan" | "warning" | "danger" | "muted" | "success"; pulse?: "slow" | "fast"; icon: string }
> = {
  upcoming: { label: "Upcoming", tone: "cyan", icon: "●" },
  joined: { label: "Joined", tone: "cyan", icon: "●" },
  waiting: { label: "Waiting", tone: "warning", pulse: "slow", icon: "◌" },
  live: { label: "Live", tone: "danger", pulse: "fast", icon: "●" },
  ended: { label: "Ended", tone: "muted", icon: "■" },
  finished: { label: "Finished", tone: "success", icon: "✓" },
};

export function AppHeader({ eventState = "waiting" }: { eventState?: EventBadgeState }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const badge = badgeConfig[eventState];
  const { user, profile, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (err) {
      console.error("Sign out error:", err);
      navigate("/login");
    }
  };

  const displayName = profile?.full_name || user?.email?.split("@")[0] || PLAYER.fullName;
  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : PLAYER.initials;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "relative py-1 font-sans text-[15px] font-medium transition-colors hover:text-text-primary",
      isActive ? "text-text-primary" : "text-text-secondary",
    );

  return (
    <header className="sticky top-0 z-sticky h-16 border-b border-border-hairline bg-bg-canvas sm:h-[72px]">
      <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-8">
          <Link to="/dashboard">
            <Logo size={26} />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/rules" className={navLinkClass}>
              Rules
            </NavLink>
            <NavLink to="/leaderboard" className={navLinkClass}>
              Leaderboard
            </NavLink>
            {role === "admin" && (
              <NavLink to="/admin" className={navLinkClass}>
                <span className="flex items-center gap-1 text-accent-magenta">
                  <Shield size={14} /> Admin Console
                </span>
              </NavLink>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge tone={badge.tone} pulse={badge.pulse} icon={badge.icon}>
            {badge.label}
          </StatusBadge>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-sm py-1.5 pl-1.5 pr-2 hover:bg-bg-hover"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xs bg-accent-cyan/15 font-mono text-xs font-bold text-accent-cyan">
                {initials}
              </span>
              <span className="hidden font-sans text-sm text-text-primary sm:inline">
                {displayName}
              </span>
              <ChevronDown size={16} className="text-text-muted" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-12 z-dropdown w-52 border border-border-default bg-bg-elevated py-1 shadow-[0_24px_64px_rgba(0,0,0,0.8)]"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <div className="border-b border-border-hairline px-4 py-2 font-mono text-xs text-text-muted">
                  <p className="truncate text-text-primary font-sans">{displayName}</p>
                  <p className="truncate text-[11px] text-text-secondary">{user?.email}</p>
                  <p className="mt-1 inline-block uppercase text-[10px] tracking-wider text-accent-cyan">
                    Role: {role}
                  </p>
                </div>
                {role === "admin" && (
                  <Link
                    to="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 font-body text-sm text-accent-magenta hover:bg-bg-hover"
                  >
                    Proctor Console
                  </Link>
                )}
                <Link
                  to="/rules"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2.5 font-body text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                >
                  Rulebook
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-body text-sm text-text-secondary hover:bg-bg-hover hover:text-danger"
                >
                  <LogOut size={14} /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
