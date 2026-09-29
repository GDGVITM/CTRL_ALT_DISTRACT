import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Play, Square, RotateCcw, Search, ShieldAlert, Check, X } from "lucide-react";
import { Logo } from "../components/Logo";
import { Button, PixelSpinner } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/Badge";
import { LeaderboardTable } from "../components/leaderboard/LeaderboardTable";
import { LEADERBOARD, EVENT } from "../lib/data";
import { eventActions, useEventState } from "../lib/eventStore";
import { cn } from "../lib/utils";

type Severity = "high" | "medium" | "low";
type ViolationType = "TAB_SWITCH" | "FULLSCREEN_EXIT" | "PASTE_BLOCKED" | "MULTI_SESSION" | "DISCONNECT";

interface Violation {
  id: number;
  type: ViolationType;
  severity: Severity;
  player: string;
  playerId: string;
  round: number;
  time: string;
  detail: string;
  acknowledged: boolean;
  fresh?: boolean;
}

const TYPE_META: Record<ViolationType, { label: string; severity: Severity; detail: string }> = {
  TAB_SWITCH: { label: "Left competition tab", severity: "medium", detail: "Tab lost focus for {n}s" },
  FULLSCREEN_EXIT: { label: "Exited full screen", severity: "medium", detail: "Full screen was closed during a round" },
  PASTE_BLOCKED: { label: "Paste attempt blocked", severity: "low", detail: "Clipboard paste into the editor was blocked" },
  MULTI_SESSION: { label: "Second session opened", severity: "high", detail: "Same account opened in another tab or device" },
  DISCONNECT: { label: "Long disconnect", severity: "low", detail: "Connection lost for {n}s" },
};

const SEVERITY_META: Record<Severity, { label: string; icon: string; cls: string }> = {
  high: { label: "HIGH", icon: "▲", cls: "border-danger/40 bg-fill-danger text-danger" },
  medium: { label: "MEDIUM", icon: "◆", cls: "border-warning/35 bg-fill-warning text-warning" },
  low: { label: "LOW", icon: "■", cls: "border-border-default bg-white/5 text-text-secondary" },
};

const SEED: Omit<Violation, "id">[] = [
  { type: "TAB_SWITCH", severity: "medium", player: "PLAYER_31", playerId: "P31", round: 3, time: "10:42:08", detail: "Tab lost focus for 14s", acknowledged: false },
  { type: "MULTI_SESSION", severity: "high", player: "PLAYER_58", playerId: "P58", round: 2, time: "10:31:55", detail: "Same account opened in another tab or device", acknowledged: false },
  { type: "PASTE_BLOCKED", severity: "low", player: "PLAYER_12", playerId: "P12", round: 4, time: "10:29:13", detail: "Clipboard paste into the editor was blocked", acknowledged: true },
  { type: "FULLSCREEN_EXIT", severity: "medium", player: "PLAYER_31", playerId: "P31", round: 2, time: "10:24:40", detail: "Full screen was closed during a round", acknowledged: false },
  { type: "DISCONNECT", severity: "low", player: "PLAYER_77", playerId: "P77", round: 1, time: "10:11:02", detail: "Connection lost for 42s", acknowledged: true },
];

function nowClock() {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

function formatElapsed(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

type Confirm = null | "start" | "end";

export default function Admin() {
  const event = useEventState();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [violations, setViolations] = useState<Violation[]>(() =>
    SEED.map((v, i) => ({ ...v, id: SEED.length - i })),
  );
  const [sevFilter, setSevFilter] = useState<"all" | Severity>("all");
  const [openOnly, setOpenOnly] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Simulated live proctoring alerts while the event is running.
  useEffect(() => {
    if (event.status !== "live") return;
    const t = setInterval(() => {
      const types = Object.keys(TYPE_META) as ViolationType[];
      const type = types[Math.floor(Math.random() * types.length)];
      const meta = TYPE_META[type];
      const n = 5 + Math.floor(Math.random() * 40);
      const pid = 2 + Math.floor(Math.random() * 120);
      setViolations((prev) => [
        {
          id: (prev[0]?.id ?? 0) + 1,
          type,
          severity: meta.severity,
          player: `PLAYER_${pid.toString().padStart(2, "0")}`,
          playerId: `P${pid}`,
          round: 1 + Math.floor((Date.now() - (event.startedAt ?? Date.now())) / 600000) % 10,
          time: nowClock(),
          detail: meta.detail.replace("{n}", String(n)),
          acknowledged: false,
          fresh: true,
        },
        ...prev.map((v) => ({ ...v, fresh: false })),
      ]);
    }, 7000);
    return () => clearInterval(t);
  }, [event.status, event.startedAt]);

  const perPlayer = useMemo(() => {
    const map = new Map<string, number>();
    violations.forEach((v) => map.set(v.playerId, (map.get(v.playerId) ?? 0) + 1));
    return map;
  }, [violations]);

  const filtered = violations.filter(
    (v) =>
      (sevFilter === "all" || v.severity === sevFilter) &&
      (!openOnly || !v.acknowledged) &&
      (!query || v.player.toLowerCase().includes(query.toLowerCase())),
  );

  const openCount = violations.filter((v) => !v.acknowledged).length;
  const highOpen = violations.filter((v) => !v.acknowledged && v.severity === "high").length;

  const runConfirmed = () => {
    if (!confirm) return;
    setBusy(true);
    setTimeout(() => {
      if (confirm === "start") eventActions.start();
      else eventActions.end();
      setBusy(false);
      setConfirm(null);
    }, 600);
  };

  const elapsed =
    event.startedAt === null
      ? 0
      : (event.status === "ended" ? (event.endedAt ?? now) : now) - event.startedAt;

  const statusBadge =
    event.status === "live" ? (
      <StatusBadge tone="danger" pulse="fast" icon="●">Live</StatusBadge>
    ) : event.status === "ended" ? (
      <StatusBadge tone="muted" icon="■">Ended</StatusBadge>
    ) : (
      <StatusBadge tone="warning" pulse="slow" icon="◌">Lobby open</StatusBadge>
    );

  return (
    <div className="min-h-screen bg-bg-canvas">
      <header className="sticky top-0 z-sticky border-b border-border-hairline bg-bg-canvas">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-8">
          <div className="flex items-center gap-4">
            <Logo size={24} />
            <span className="rounded-xs border border-accent-magenta/45 bg-fill-bonus px-2 py-1 font-label text-[10px] uppercase tracking-wide text-accent-magenta">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            {statusBadge}
            <Link to="/" className="hidden font-body text-sm text-text-secondary hover:text-text-primary sm:inline">
              Exit console
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-8">
        {/* Event control */}
        <section className="relative border border-border-default bg-bg-panel p-6 chamfer-lg sm:p-8" aria-labelledby="control-title">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-accent-yellow" />
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <h1 id="control-title" className="font-pixel text-base text-text-primary sm:text-lg">
                EVENT CONTROL
              </h1>
              <p className="mt-2 max-w-[56ch] font-body text-sm text-text-secondary">
                {event.status === "lobby" &&
                  "Players are waiting in the lobby. Starting launches the 3-2-1 countdown for everyone at once."}
                {event.status === "live" &&
                  "The event is running. Ending it stops all rounds immediately and sends every player to their results."}
                {event.status === "ended" &&
                  "The event has ended. Final standings are locked. Reset to run the demo again."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {event.status === "lobby" && (
                  <Button variant="primary" size="lg" chamfer icon={<Play size={18} />} onClick={() => setConfirm("start")}>
                    Start event
                  </Button>
                )}
                {event.status === "live" && (
                  <Button variant="danger" size="lg" icon={<Square size={16} />} onClick={() => setConfirm("end")}>
                    End event
                  </Button>
                )}
                {event.status === "ended" && (
                  <Button variant="secondary" size="lg" icon={<RotateCcw size={16} />} onClick={eventActions.reset}>
                    Reset demo
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-border-default border border-border-default sm:grid-cols-4">
              {[
                ["Elapsed", formatElapsed(elapsed), "text-text-primary"],
                ["Players", "127", "text-accent-yellow"],
                ["Finished", event.status === "lobby" ? "0" : String(Math.min(LEADERBOARD.length, 5 + Math.floor(elapsed / 20000))), "text-success"],
                ["Open alerts", String(openCount), highOpen ? "text-danger" : "text-text-primary"],
              ].map(([label, val, color]) => (
                <div key={label} className="min-w-[110px] px-4 py-3">
                  <div className="font-label text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
                  <div className={cn("mt-1 font-mono text-xl font-bold font-tnum", color)}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-12">
          {/* Violations */}
          <section className="xl:col-span-7" aria-labelledby="alerts-title">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 id="alerts-title" className="flex items-center gap-2 font-sans text-2xl font-bold text-text-primary">
                <ShieldAlert size={22} className="text-warning" /> Proctoring alerts
                {openCount > 0 && (
                  <span className="rounded-xs bg-fill-danger px-2 py-0.5 font-mono text-xs text-danger">
                    {openCount} open
                  </span>
                )}
              </h2>
              <button
                onClick={() => setViolations((v) => v.map((x) => ({ ...x, acknowledged: true })))}
                disabled={openCount === 0}
                className="font-body text-sm text-accent-cyan hover:underline disabled:text-text-disabled disabled:no-underline"
              >
                Acknowledge all
              </button>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-3">
              <div className="relative w-full max-w-[240px]">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search player…"
                  className="h-10 w-full rounded-xs border border-border-default bg-bg-inset pl-9 pr-3 font-body text-sm text-text-primary placeholder:text-text-muted focus:border-accent-cyan focus:outline-none"
                />
              </div>
              <div className="flex border border-border-default bg-bg-inset" role="group" aria-label="Severity filter">
                {(["all", "high", "medium", "low"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSevFilter(s)}
                    className={cn(
                      "px-3 py-2 font-label text-[11px] uppercase tracking-wide",
                      sevFilter === s ? "bg-bg-elevated text-accent-cyan" : "text-text-secondary hover:text-text-primary",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <label className="flex cursor-pointer items-center gap-2 font-body text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={openOnly}
                  onChange={(e) => setOpenOnly(e.target.checked)}
                  className="h-[18px] w-[18px] appearance-none border border-border-strong bg-bg-inset checked:border-accent-cyan checked:bg-accent-cyan"
                />
                Open only
              </label>
            </div>

            <ul className="max-h-[640px] divide-y divide-border-hairline overflow-y-auto border border-border-default bg-bg-panel" aria-live="polite">
              {filtered.map((v) => {
                const sev = SEVERITY_META[v.severity];
                const repeats = perPlayer.get(v.playerId) ?? 1;
                return (
                  <li
                    key={v.id}
                    className={cn(
                      "flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between",
                      v.fresh && "alert-flash",
                      v.acknowledged && "opacity-60",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-xs border px-1.5 py-0.5 font-label text-[10px] uppercase tracking-wide", sev.cls)}>
                          {sev.icon} {sev.label}
                        </span>
                        <span className="font-sans text-[15px] font-semibold text-text-primary">
                          {TYPE_META[v.type].label}
                        </span>
                        {repeats > 1 && (
                          <span className="rounded-xs bg-bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-warning">
                            {repeats}× this player
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 font-body text-sm text-text-secondary">{v.detail}</p>
                      <p className="mt-1 font-mono text-xs text-text-muted">
                        {v.player} · {v.playerId} · Round {v.round.toString().padStart(2, "0")} · {v.time}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {v.acknowledged ? (
                        <span className="flex items-center gap-1 font-label text-[11px] uppercase text-success">
                          <Check size={14} /> Reviewed
                        </span>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<Check size={14} />}
                            onClick={() =>
                              setViolations((all) => all.map((x) => (x.id === v.id ? { ...x, acknowledged: true } : x)))
                            }
                          >
                            Acknowledge
                          </Button>
                          <button
                            aria-label="Dismiss alert"
                            title="Dismiss"
                            onClick={() => setViolations((all) => all.filter((x) => x.id !== v.id))}
                            className="flex h-8 w-8 items-center justify-center rounded-xs text-text-muted hover:bg-bg-hover hover:text-text-primary"
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="p-10 text-center font-body text-sm text-text-muted">
                  No alerts match. {event.status === "live" ? "New alerts appear here as they happen." : ""}
                </li>
              )}
            </ul>
          </section>

          {/* Leaderboard */}
          <section className="xl:col-span-5" aria-labelledby="lb-title">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="lb-title" className="font-sans text-2xl font-bold text-text-primary">
                Leaderboard
              </h2>
              <Link to="/leaderboard" className="font-body text-sm text-accent-cyan hover:underline">
                Full board →
              </Link>
            </div>
            <LeaderboardTable rows={LEADERBOARD.slice(0, 10)} compact />
            <p className="mt-3 font-body text-xs text-text-muted">
              Top 10 of {LEADERBOARD.length} players · {EVENT.totalRounds} rounds
            </p>
          </section>
        </div>
      </main>

      {/* Confirm dialog */}
      {confirm && (
        <div className="fixed inset-0 z-dialog flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className={cn(
              "w-full max-w-[440px] border-t-2 bg-bg-elevated p-6 shadow-[0_24px_64px_rgba(0,0,0,0.8)]",
              confirm === "end" ? "border-danger" : "border-accent-cyan",
            )}
          >
            <h3 id="confirm-title" className="font-sans text-lg font-semibold text-text-primary">
              {confirm === "start" ? "Start the event now?" : "End the event for everyone?"}
            </h3>
            <p className="mt-3 font-body text-sm text-text-secondary">
              {confirm === "start"
                ? "All players in the lobby get a 3-2-1 countdown and Round 01 begins together. This can't be undone."
                : "All rounds stop immediately. Players still in the Arena are sent to their results with the progress saved so far."}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirm(null)} disabled={busy}>
                {confirm === "end" ? "Keep running" : "Cancel"}
              </Button>
              {confirm === "start" ? (
                <Button variant="primary" chamfer onClick={runConfirmed} disabled={busy}>
                  {busy ? (
                    <span className="flex items-center gap-2"><PixelSpinner /> Starting…</span>
                  ) : (
                    "Start now"
                  )}
                </Button>
              ) : (
                <Button variant="danger" onClick={runConfirmed} disabled={busy}>
                  {busy ? (
                    <span className="flex items-center gap-2"><PixelSpinner /> Ending…</span>
                  ) : (
                    "End event"
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
