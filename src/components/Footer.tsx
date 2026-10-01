import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { useEvent } from "../context/EventContext";

export function Footer() {
  const EVENT = useEvent();
  return (
    <footer className="border-t border-border-hairline bg-bg-base">
      <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-8 sm:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          <div>
            <Logo size={24} />
            <p className="mt-4 font-body text-sm text-text-secondary">
              A {EVENT.organizerName} event
            </p>
            <p className="font-body text-sm text-text-muted">{EVENT.collegeName}</p>
          </div>
          <div className="flex flex-col gap-3">
            <span className="font-label text-[15px] uppercase tracking-[0.04em] text-text-muted">
              Event
            </span>
            <Link to="/rules" className="font-body text-sm text-text-secondary hover:text-text-primary">
              Rules
            </Link>
            <Link to="/leaderboard" className="font-body text-sm text-text-secondary hover:text-text-primary">
              Leaderboard
            </Link>
            <Link to="/login" className="font-body text-sm text-text-secondary hover:text-text-primary">
              Log in
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            <span className="font-label text-[15px] uppercase tracking-[0.04em] text-text-muted">
              Community
            </span>
            <a href="#" className="font-body text-sm text-text-secondary hover:text-text-primary">
              GDG chapter page
            </a>
            <a href="#" className="font-body text-sm text-text-secondary hover:text-text-primary">
              Contact organizers
            </a>
            <a href="#" className="font-body text-sm text-text-secondary hover:text-text-primary">
              Code of conduct
            </a>
          </div>
        </div>
        <div className="mt-12 border-t border-border-hairline pt-6 font-body text-xs text-text-muted">
          © 2026 Ctrl Alt Distract · {EVENT.organizerName}
        </div>
      </div>
    </footer>
  );
}
