import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, X } from "lucide-react";
import { AppHeader, type EventBadgeState } from "../components/headers/AppHeader";
import { Button, PixelSpinner } from "../components/ui/Button";
import { Rulebook } from "../components/Rulebook";
import { EVENT, PLAYER } from "../lib/data";
import { cn } from "../lib/utils";
import { useEventState } from "../lib/eventStore";

type DashState = "not-joined" | "joined" | "waiting" | "live" | "ended" | "finished";

const STATE_META: Record<
  DashState,
  { badge: EventBadgeState; cta: string; helper: string; disabled?: boolean; lock?: boolean }
> = {
  "not-joined": {
    badge: "upcoming",
    cta: "Join event",
    helper: "Joining puts you in the lobby. The admin starts the event for everyone at once.",
  },
  joined: {
    badge: "joined",
    cta: "Go to lobby",
    helper: "You're in. Wait in the lobby for the start.",
  },
  waiting: {
    badge: "waiting",
    cta: "Lobby opens soon",
    helper: `The lobby opens at ${EVENT.eventTime}.`,
    disabled: true,
    lock: true,
  },
  live: {
    badge: "live",
    cta: "Return to arena",
    helper: "Your run is in progress. Round 4/10.",
  },
  ended: {
    badge: "ended",
    cta: "View leaderboard",
    helper: "Final results are in.",
  },
  finished: {
    badge: "finished",
    cta: "View leaderboard",
    helper: "Your score: 870",
  },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [state, setState] = useState<DashState>("not-joined");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const [checks, setChecks] = useState([false, false, false]);

  const { status: eventStatus } = useEventState();
  useEffect(() => {
    if (eventStatus === "live") setState((s) => (s === "joined" || s === "waiting" ? "live" : s));
    if (eventStatus === "ended") setState("ended");
  }, [eventStatus]);

  const meta = STATE_META[state];

  const handlePrimary = () => {
    if (state === "not-joined") return setConfirmOpen(true);
    if (state === "joined") return navigate("/lobby");
    if (state === "live") return navigate("/arena");
    if (state === "ended" || state === "finished") return navigate("/leaderboard");
  };

  const confirmJoin = () => {
    setJoining(true);
    setTimeout(() => {
      setJoining(false);
      setConfirmOpen(false);
      setState("joined");
    }, 700);
  };

  return (
    <div className="min-h-screen bg-bg-canvas">
      <AppHeader eventState={meta.badge} />

      <main className="mx-auto max-w-[1280px] px-4 py-10 pb-24 sm:px-8 lg:pb-10">
        <h1 className="font-sans text-4xl font-bold text-text-primary">
          Hi, {PLAYER.firstName}.
        </h1>
        <p className="mt-1 font-body text-sm text-text-muted">
          Player ID {PLAYER.playerId} · Your College
        </p>

        {/* dev state switcher */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(STATE_META) as DashState[]).map((s) => (
            <button
              key={s}
              onClick={() => setState(s)}
              className={cn(
                "rounded-xs border px-2.5 py-1 font-label text-[10px] uppercase tracking-wide",
                state === s
                  ? "border-accent-cyan text-accent-cyan"
                  : "border-border-default text-text-muted hover:text-text-secondary",
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Event card */}
          <div className="lg:col-span-8">
            <div className="relative overflow-hidden border border-border-default bg-bg-panel p-6 chamfer-lg sm:p-8">
              <div className="absolute inset-x-0 top-0 h-[2px] bg-accent-yellow" />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-pixel text-base text-text-primary sm:text-lg">
                  CTRL ALT ONE
                </h2>
                <span
                  className={cn(
                    "rounded-xs border px-2.5 py-1 font-label text-[11px] uppercase tracking-wide",
                    meta.badge === "live" && "border-danger/40 bg-fill-danger text-danger",
                    meta.badge === "waiting" && "border-warning/40 bg-fill-warning text-warning",
                    (meta.badge === "upcoming" || meta.badge === "joined") &&
                      "border-accent-cyan/30 bg-fill-info text-accent-cyan",
                    meta.badge === "ended" && "border-border-default bg-white/5 text-text-muted",
                    meta.badge === "finished" && "border-success/35 bg-fill-success text-success",
                  )}
                >
                  {meta.badge}
                </span>
              </div>
              <p className="mt-2 font-body text-text-secondary">
                Starts {EVENT.eventDate} at {EVENT.eventTime}
              </p>

              <div className="mt-6 grid grid-cols-2 divide-x divide-border-default border border-border-default sm:grid-cols-4">
                {[
                  ["Rounds", "10"],
                  ["Per round", "10:00"],
                  ["Interrupt", "00:30"],
                  ["Languages", "C · C++ · JAVA · PY"],
                ].map(([label, val]) => (
                  <div key={label} className="px-4 py-3">
                    <div className="font-label text-[10px] uppercase tracking-wider text-text-muted">
                      {label}
                    </div>
                    <div className="mt-1 font-mono text-lg font-bold text-text-primary">
                      {val}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  chamfer
                  disabled={meta.disabled}
                  icon={meta.lock ? <Lock size={18} /> : undefined}
                  onClick={handlePrimary}
                >
                  {meta.cta}
                </Button>
                <button
                  className="font-body text-sm text-accent-cyan hover:underline"
                  onClick={() =>
                    document.getElementById("rulebook")?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Read the rulebook
                </button>
              </div>
              <p className="mt-3 font-body text-sm text-text-muted">{meta.helper}</p>
            </div>
          </div>

          {/* Status panel */}
          <div className="lg:col-span-4">
            <div className="border border-border-default bg-bg-panel p-6">
              <div className="flex flex-col divide-y divide-border-hairline">
                {[
                  ["Entry", state === "not-joined" ? "Not joined" : "Joined"],
                  ["Rounds", state === "live" || state === "finished" || state === "ended" ? "4/10" : "0/10"],
                  ["Score", state === "finished" || state === "ended" ? "0870" : "----"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-2.5">
                    <span className="font-label text-[11px] uppercase tracking-wide text-text-muted">
                      {k}
                    </span>
                    <span className="font-mono text-sm font-bold text-text-primary">{v}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-2.5">
                {["I've read the rulebook", "I'm on a desktop or laptop", "My internet connection is stable"].map(
                  (label, i) => (
                    <label key={label} className="flex cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={checks[i]}
                        onChange={() =>
                          setChecks((c) => c.map((v, idx) => (idx === i ? !v : v)))
                        }
                        className="h-[18px] w-[18px] appearance-none border border-border-strong bg-bg-inset checked:border-accent-cyan checked:bg-accent-cyan"
                      />
                      <span className="font-body text-sm text-text-secondary">{label}</span>
                    </label>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Rulebook */}
        <div id="rulebook" className="mt-10 scroll-mt-20">
          <h2 className="mb-4 font-sans text-2xl font-bold text-text-primary">Rulebook</h2>
          <Rulebook />
        </div>
      </main>

      {/* mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-sticky flex h-[72px] items-center border-t border-border-hairline bg-bg-base px-4 lg:hidden">
        <Button variant="primary" size="lg" chamfer fullWidth disabled={meta.disabled} onClick={handlePrimary}>
          {meta.cta}
        </Button>
      </div>

      {/* Join confirm dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-dialog flex items-end justify-center bg-black/72 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-[440px] border-t-2 border-accent-cyan bg-bg-elevated p-6 sm:border-t-0 sm:border-2">
            <div className="flex items-start justify-between">
              <h3 className="font-sans text-lg font-semibold text-text-primary">
                Join Ctrl Alt One?
              </h3>
              <button
                onClick={() => setConfirmOpen(false)}
                className="text-text-muted hover:text-text-primary"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-3 font-body text-sm text-text-secondary">
              You'll enter the lobby and wait for the admin to start. Once the event
              starts, the 10 rounds run back to back.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" chamfer onClick={confirmJoin} disabled={joining}>
                {joining ? (
                  <span className="flex items-center gap-2">
                    <PixelSpinner /> Joining…
                  </span>
                ) : (
                  "Join"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
