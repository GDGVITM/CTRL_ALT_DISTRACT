import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { LobbyHeader } from "../components/headers/LobbyHeader";
import { Button } from "../components/ui/Button";
import { PLAYERS, PLAYER, EVENT } from "../lib/data";
import { cn } from "../lib/utils";
import { useEventState } from "../lib/eventStore";

export default function Lobby() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [countdown, setCountdown] = useState<null | number | "GO">(null);

  const filtered = useMemo(
    () =>
      PLAYERS.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  const startEvent = () => setCountdown(3);

  const { status } = useEventState();
  const prevStatus = useRef(status);
  useEffect(() => {
    if (prevStatus.current !== "live" && status === "live") setCountdown(3);
    prevStatus.current = status;
  }, [status]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === "GO") {
      const t = setTimeout(() => navigate("/arena"), 900);
      return () => clearTimeout(t);
    }
    if (countdown === 0) {
      setCountdown("GO");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (typeof c === "number" ? c - 1 : c)), 1000);
    return () => clearTimeout(t);
  }, [countdown, navigate]);

  return (
    <div className="min-h-screen bg-bg-canvas">
      <LobbyHeader />

      <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-8">
        {/* Status panel */}
        <div className="relative flex flex-col items-start justify-between gap-6 border border-border-default bg-bg-panel p-6 chamfer-lg sm:flex-row sm:items-center sm:p-8">
          <div>
            <span className="flex items-center gap-2 font-label text-base font-bold uppercase tracking-wide text-warning">
              <span className="inline-block h-2 w-2 animate-pulse-slow rounded-full bg-warning" />
              Waiting for admin
            </span>
            <p className="mt-2 max-w-md font-body text-text-secondary">
              The event starts when the admin launches it. Stay on this screen.
            </p>
            <p className="mt-1 font-body text-xs text-text-muted">
              Scheduled {EVENT.eventTime}
            </p>
            <div className="mt-4 flex gap-1" aria-hidden="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <span
                  key={i}
                  className="h-3 w-3 animate-pulse-slow bg-accent-cyan"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="font-label text-[11px] uppercase tracking-wide text-text-muted">
              Players in lobby
            </span>
            <div className="relative mt-1 font-mono text-5xl font-extrabold text-accent-yellow font-tnum sm:text-6xl">
              <span className="text-ghost absolute inset-0">8888</span>
              {(PLAYERS.length + 1).toString().padStart(3, "0")}
            </div>
          </div>

          {/* dev trigger */}
          <button
            onClick={startEvent}
            className="absolute right-4 top-4 rounded-xs border border-accent-cyan/40 px-2 py-1 font-label text-[9px] uppercase tracking-wide text-accent-cyan"
          >
            (demo) start event
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Player list */}
          <div className="lg:col-span-8">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="relative w-full max-w-xs">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search players…"
                  className="h-10 w-full rounded-xs border border-border-default bg-bg-inset pl-9 pr-3 font-body text-sm text-text-primary placeholder:text-text-muted focus:border-accent-cyan focus:outline-none"
                />
              </div>
              <span className="whitespace-nowrap font-body text-sm text-text-muted">
                {PLAYERS.length + 1} total
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div className="flex h-[88px] flex-col items-center justify-center gap-1.5 border-2 border-accent-yellow bg-bg-panel px-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xs bg-accent-cyan/15 font-mono text-[11px] font-bold text-accent-cyan">
                  {PLAYER.initials}
                </span>
                <span className="max-w-full truncate font-body text-xs text-text-primary">
                  {PLAYER.fullName}
                </span>
                <span className="rounded-xs border border-accent-yellow px-1 font-label text-[8px] text-accent-yellow">
                  YOU
                </span>
              </div>
              {filtered.map((p) => (
                <div
                  key={p.id}
                  className="flex h-[88px] flex-col items-center justify-center gap-1.5 border border-border-default bg-bg-panel px-2 hover:bg-bg-hover"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xs bg-bg-elevated font-mono text-[11px] font-bold text-text-secondary">
                    {p.id}
                  </span>
                  <span className="max-w-full truncate font-body text-xs text-text-secondary">
                    {p.name}
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="col-span-full font-body text-sm text-text-muted">
                  No players match "{query}".
                </p>
              )}
            </div>
          </div>

          {/* Quick rules */}
          <div className="lg:col-span-4">
            <div className="border border-border-default bg-bg-panel p-5">
              <span className="mb-3 block font-label text-[11px] uppercase tracking-wide text-text-muted">
                Quick rules
              </span>
              <div className="flex flex-col divide-y divide-border-hairline">
                {[
                  ["Rounds", "10 · 10:00 each"],
                  ["Distractions", "00:30"],
                  ["Clear", `+${EVENT.bonusPoints}`],
                  ["Timeout", "No bonus"],
                  ["Langs", "C C++ JAVA PY"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-2.5">
                    <span className="font-label text-[10px] uppercase tracking-wide text-text-muted">
                      {k}
                    </span>
                    <span className="font-mono text-sm font-bold text-text-primary">{v}</span>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="mt-4" fullWidth>
                Leave lobby
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Countdown overlay */}
      {countdown !== null && (
        <div
          className="crt-vignette crt-scanlines fixed inset-0 z-transition flex flex-col items-center justify-center bg-black/92"
          role="status"
          aria-live="assertive"
        >
          <div
            className={cn(
              "font-pixel select-none",
              countdown === "GO" ? "text-accent-yellow" : "text-text-primary",
            )}
            style={{
              fontSize: "min(30vw, 160px)",
              lineHeight: 1,
              textShadow: "6px 6px 0 #FFD23F55",
            }}
          >
            {countdown}
          </div>
          {countdown !== "GO" && (
            <p className="mt-6 font-label text-base uppercase tracking-wide text-text-secondary">
              Round 01 starts in
            </p>
          )}
        </div>
      )}
    </div>
  );
}
