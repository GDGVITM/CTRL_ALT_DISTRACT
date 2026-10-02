import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Play, Square, RotateCcw, Search, ShieldAlert, Check, X } from "lucide-react";
import { Logo } from "../components/Logo";
import { Button, PixelSpinner } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/Badge";
import { LeaderboardTable } from "../components/leaderboard/LeaderboardTable";
import { RegistrationApprovals } from "../components/admin/RegistrationApprovals";
import { api, ApiError } from "../lib/api";
import type { AdminOverview, Alert, LeaderboardEntry, ProctorType, Severity } from "../lib/types";
import { useEvent, useRefreshEvent } from "../context/EventContext";
import { cn } from "../lib/utils";

const TYPE_LABEL: Record<ProctorType, string> = {
  TAB_SWITCH: "Left competition tab",
  FULLSCREEN_EXIT: "Exited full screen",
  PASTE_BLOCKED: "Paste attempt blocked",
  MULTI_SESSION: "Second session opened",
  DISCONNECT: "Long disconnect",
};

const SEVERITY_META: Record<Severity, { label: string; icon: string; cls: string }> = {
  high: { label: "HIGH", icon: "▲", cls: "border-danger/40 bg-fill-danger text-danger" },
  medium: { label: "MEDIUM", icon: "◆", cls: "border-warning/35 bg-fill-warning text-warning" },
  low: { label: "LOW", icon: "■", cls: "border-border-default bg-white/5 text-text-secondary" },
};

function clock(ms: number) {
  return new Date(ms).toLocaleTimeString("en-GB", { hour12: false });
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
  const event = useEvent();
  const refreshEvent = useRefreshEvent();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [skew, setSkew] = useState(0); // server clock minus this browser's clock
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [freshIds, setFreshIds] = useState<Set<number>>(new Set());
  const [board, setBoard] = useState<{ entries: LeaderboardEntry[]; total: number }>({ entries: [], total: 0 });
  const [sevFilter, setSevFilter] = useState<"all" | Severity>("all");
  const [openOnly, setOpenOnly] = useState(false);
  const [query, setQuery] = useState("");
  const knownAlerts = useRef<Set<number> | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadOverview = useCallback(async () => {
    try {
      const o = await api.admin.overview();
      setOverview(o);
      setSkew(o.serverTime - Date.now());
    } catch {
      /* keep the last good numbers; the next poll retries */
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      const list = await api.admin.alerts();
      setAlerts(list);
      const seen = knownAlerts.current;
      if (seen) setFreshIds(new Set(list.filter((a) => !seen.has(a.id)).map((a) => a.id)));
      knownAlerts.current = new Set(list.map((a) => a.id));
    } catch {
      /* ignore transient failures */
    }
  }, []);

  const loadBoard = useCallback(async () => {
    try {
      const r = await api.leaderboard(10);
      setBoard({ entries: r.entries, total: r.total });
    } catch {
      /* ignore transient failures */
    }
  }, []);

  useEffect(() => {
    void loadOverview();
    void loadAlerts();
    void loadBoard();
    const fast = setInterval(() => void loadOverview(), 3000);
    const alertTimer = setInterval(() => void loadAlerts(), 4000);
    const boardTimer = setInterval(() => void loadBoard(), 5000);
    return () => {
      clearInterval(fast);
      clearInterval(alertTimer);
      clearInterval(boardTimer);
    };
  }, [loadOverview, loadAlerts, loadBoard]);

  const perPlayer = useMemo(() => {
    const map = new Map<string, number>();
    alerts.forEach((v) => map.set(v.playerId, (map.get(v.playerId) ?? 0) + 1));
    return map;
  }, [alerts]);

  const filtered = alerts.filter(
    (v) =>
      (sevFilter === "all" || v.severity === sevFilter) &&
      (!openOnly || !v.acknowledged) &&
      (!query || v.player.toLowerCase().includes(query.toLowerCase())),
  );

  const openCount = alerts.filter((v) => !v.acknowledged).length;
  const highOpen = alerts.filter((v) => !v.acknowledged && v.severity === "high").length;

  const acknowledge = (id: number) => {
    setAlerts((all) => all.map((x) => (x.id === id ? { ...x, acknowledged: true } : x)));
    api.admin.acknowledge(id).catch(() => void loadAlerts());
  };
  const acknowledgeAll = () => {
    setAlerts((all) => all.map((x) => ({ ...x, acknowledged: true })));
    api.admin.acknowledgeAll().catch(() => void loadAlerts());
  };
  const dismiss = (id: number) => {
    setAlerts((all) => all.filter((x) => x.id !== id));
    api.admin.dismiss(id).catch(() => void loadAlerts());
  };

  const refreshAll = () => Promise.all([refreshEvent(), loadOverview(), loadAlerts(), loadBoard()]);

  const runConfirmed = async () => {
    if (!confirm) return;
    setBusy(true);
    setActionError("");
    try {
      await (confirm === "start" ? api.admin.startEvent() : api.admin.endEvent());
      await refreshAll();
      setConfirm(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "That action failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const resetEvent = async () => {
    if (!window.confirm("Reset the event? This deletes every player's progress, scores and alerts.")) return;
    try {
      await api.admin.resetEvent();
      knownAlerts.current = null;
      await refreshAll();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "Reset failed.");
    }
  };

  const serverNow = now + skew;
  const elapsed =
    event.startedAt === null
      ? 0
      : (event.status === "ended" ? (event.endedAt ?? serverNow) : serverNow) - event.startedAt;

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
        <div className="flex h-16 w-full items-center justify-between gap-4 px-4 sm:h-[72px] sm:px-8">
          <div className="flex items-center gap-4">
            <Logo size={36} wordmark={false} />
            <span className="rounded-xs border border-accent-magenta/45 bg-fill-bonus px-2 py-1 font-label text-[15px] uppercase tracking-[0.04em] text-accent-magenta">
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

      <main className="w-full px-4 py-6 sm:px-8">
        {/* Event control */}
        <section className="relative border border-border-default bg-bg-panel p-6 chamfer-lg sm:p-8" aria-labelledby="control-title">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-accent-yellow" />
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <h1 id="control-title" className="font-display text-3xl text-text-primary sm:text-4xl">
                EVENT CONTROL
              </h1>
              <p className="mt-2 max-w-[56ch] font-body text-sm text-text-secondary">
                {event.status === "lobby" &&
                  "Players are waiting in the lobby. Starting launches the 3-2-1 countdown for everyone at once."}
                {event.status === "live" &&
                  "The event is running. Ending it stops all rounds immediately and sends every player to their results."}
                {event.status === "ended" &&
                  "The event has ended. Final standings are locked. Reset to run the event again."}
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
                  <Button variant="secondary" size="lg" icon={<RotateCcw size={16} />} onClick={() => void resetEvent()}>
                    Reset event
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-border-default border border-border-default sm:grid-cols-4">
              {[
                ["Elapsed", formatElapsed(elapsed), "text-text-primary"],
                ["Players", String(overview?.players ?? "—"), "text-accent-yellow"],
                ["Finished", String(overview?.finished ?? "—"), "text-success"],
                ["Open alerts", String(openCount), highOpen ? "text-danger" : "text-text-primary"],
              ].map(([label, val, color]) => (
                <div key={label} className="min-w-[110px] px-4 py-3">
                  <div className="font-label text-[15px] uppercase tracking-[0.04em]r text-text-muted">{label}</div>
                  <div className={cn("mt-1 font-mono text-xl font-bold font-tnum", color)}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <RegistrationApprovals />

        <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-12">
          {/* Violations */}
          <section className="xl:col-span-6" aria-labelledby="alerts-title">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 id="alerts-title" className="flex items-center gap-2 font-display text-3xl text-text-primary">
                <ShieldAlert size={22} className="text-warning" /> Proctoring alerts
                {openCount > 0 && (
                  <span className="rounded-xs bg-fill-danger px-2 py-0.5 font-mono text-xs text-danger">
                    {openCount} open
                  </span>
                )}
              </h2>
              <button
                onClick={acknowledgeAll}
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
                      "px-3 py-2 font-label text-[16px] uppercase tracking-[0.04em]",
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
                      freshIds.has(v.id) && "alert-flash",
                      v.acknowledged && "opacity-60",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-xs border px-1.5 py-0.5 font-label text-[15px] uppercase tracking-[0.04em]", sev.cls)}>
                          {sev.icon} {sev.label}
                        </span>
                        <span className="font-sans text-[15px] font-semibold text-text-primary">
                          {TYPE_LABEL[v.type]}
                        </span>
                        {repeats > 1 && (
                          <span className="rounded-xs bg-bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-warning">
                            {repeats}× this player
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 font-body text-sm text-text-secondary">{v.detail}</p>
                      <p className="mt-1 font-mono text-xs text-text-muted">
                        {v.player} · {v.playerId} · Round {v.round.toString().padStart(2, "0")} · {clock(v.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {v.acknowledged ? (
                        <span className="flex items-center gap-1 font-label text-[16px] uppercase text-success">
                          <Check size={14} /> Reviewed
                        </span>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<Check size={14} />}
                            onClick={() => acknowledge(v.id)}
                          >
                            Acknowledge
                          </Button>
                          <button
                            aria-label="Dismiss alert"
                            title="Dismiss"
                            onClick={() => dismiss(v.id)}
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
          <section className="xl:col-span-6" aria-labelledby="lb-title">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="lb-title" className="font-display text-3xl text-text-primary">
                Leaderboard
              </h2>
              <Link to="/leaderboard" className="font-body text-sm text-accent-cyan hover:underline">
                Full board →
              </Link>
            </div>
            <LeaderboardTable rows={board.entries} />
            <p className="mt-3 font-body text-xs text-text-muted">
              Top 10 of {board.total} players · {event.totalRounds} rounds
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
            {actionError && (
              <p className="mt-3 font-body text-sm text-danger" role="alert">
                {actionError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => { setConfirm(null); setActionError(""); }} disabled={busy}>
                {confirm === "end" ? "Keep running" : "Cancel"}
              </Button>
              {confirm === "start" ? (
                <Button variant="primary" chamfer onClick={() => void runConfirmed()} disabled={busy}>
                  {busy ? (
                    <span className="flex items-center gap-2"><PixelSpinner /> Starting…</span>
                  ) : (
                    "Start now"
                  )}
                </Button>
              ) : (
                <Button variant="danger" onClick={() => void runConfirmed()} disabled={busy}>
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
