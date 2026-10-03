import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut } from "lucide-react";
import { Logo } from "../Logo";
import { StatusBadge } from "../ui/Badge";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import { useCompetitionScreenGuard } from "../competition/CompetitionScreenGuard";

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
  const navigate = useNavigate();
  const { fullName, initials, signOut } = useAuth();
  const screenGuard = useCompetitionScreenGuard();

  const logOut = async () => {
    if (screenGuard.active) {
      setMenuOpen(false);
      screenGuard.askToReturn("navigation");
      return;
    }
    await signOut();
    navigate("/login", { replace: true });
  };
  const badge = badgeConfig[eventState];

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "relative py-1 font-sans text-[15px] font-medium transition-colors hover:text-text-primary",
      isActive ? "text-text-primary" : "text-text-secondary",
    );

  return (
    <header className="sticky top-0 z-sticky h-16 border-b border-border-hairline bg-bg-canvas sm:h-[72px]">
      <div className="flex h-full w-full items-center justify-between gap-2 px-4 sm:px-8 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-4">
        <Link to="/dashboard" className="shrink-0 justify-self-start">
          <Logo size={36} wordmark={false} />
        </Link>
        <nav className="hidden items-center gap-4 md:flex lg:justify-self-center lg:gap-6">
          <NavLink to="/dashboard" className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/rules" className={navLinkClass}>
            Rules
          </NavLink>
          <NavLink to="/leaderboard" className={navLinkClass}>
            Leaderboard
          </NavLink>
        </nav>
        <div className="flex min-w-0 items-center justify-end gap-4 justify-self-end">
          <StatusBadge tone={badge.tone} pulse={badge.pulse} icon={badge.icon}>
            <span className="sr-only sm:not-sr-only">{badge.label}</span>
          </StatusBadge>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-sm py-1.5 pl-1.5 pr-2 hover:bg-bg-hover"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xs bg-accent-cyan/15 font-mono text-xs font-bold text-accent-cyan">
                {initials}
              </span>
              <span className="hidden max-w-[120px] truncate font-sans text-sm text-text-primary sm:inline md:max-w-16 lg:max-w-[160px]" title={fullName}>
                {fullName}
              </span>
              <ChevronDown size={16} className="text-text-muted" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-12 z-dropdown w-48 border border-border-default bg-bg-elevated py-1 shadow-[0_24px_64px_rgba(0,0,0,0.8)]"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <Link
                  to="/rules"
                  className="block px-4 py-2.5 font-body text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                >
                  Rulebook
                </Link>
                <button
                  onClick={logOut}
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
