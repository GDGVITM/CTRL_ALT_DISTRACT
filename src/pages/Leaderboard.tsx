import { ArcadeSides } from "../components/ArcadeSides";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { AppHeader } from "../components/headers/AppHeader";
import { StatusBadge } from "../components/ui/Badge";
import { Podium } from "../components/leaderboard/Podium";
import { api } from "../lib/api";
import type { LeaderboardEntry } from "../lib/types";
import { cn, padScore } from "../lib/utils";
import { useEvent } from "../context/EventContext";

const PAGE_SIZE = 15;

export default function Leaderboard() {
  const { status } = useEvent();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [query, setQuery] = useState("");
  const [filterTop10, setFilterTop10] = useState(false);
  const [page, setPage] = useState(1);
  const selfRef = useRef<HTMLTableRowElement>(null);
  const pendingJump = useRef(false);

  // Live standings: refresh every few seconds while the event runs, slowly once it has ended.
  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .leaderboard()
        .then((r) => alive && setEntries(r.entries))
        .catch(() => undefined);
    void load();
    const t = setInterval(load, status === "ended" ? 30_000 : 5_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [status]);

  const rows = useMemo(() => {
    let r = entries;
    if (query) r = r.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
    if (filterTop10) r = r.slice(0, 10);
    return r;
  }, [entries, query, filterTop10]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = rows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, rows.length);

  const podium = entries.slice(0, 3);
  const self = entries.find((p) => p.self);

  const goTo = (p: number) => {
    setPage(Math.min(Math.max(1, p), totalPages));
    document.getElementById("leaderboard-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const jumpToSelf = () => {
    const idx = rows.findIndex((r) => r.self);
    if (idx === -1) return;
    const target = Math.floor(idx / PAGE_SIZE) + 1;
    if (target !== currentPage) {
      pendingJump.current = true;
      setPage(target);
    } else {
      selfRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  useEffect(() => {
    if (pendingJump.current) {
      pendingJump.current = false;
      selfRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentPage]);

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1,
  );

  return (
    <div className="min-h-screen bg-bg-canvas isolate">
      <ArcadeSides contentMax={1120} />
      <AppHeader eventState={status === "ended" ? "ended" : status === "live" ? "live" : "waiting"} />

      <div className="crt-scanlines relative border-b border-border-hairline bg-bg-base px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl leading-none text-text-primary sm:text-4xl">High scores</h1>
            {status === "ended" ? (
              <StatusBadge tone="yellow" icon="■">
                Final
              </StatusBadge>
            ) : status === "live" ? (
              <StatusBadge tone="danger" pulse="fast" icon="●">
                Live
              </StatusBadge>
            ) : (
              <StatusBadge tone="warning" pulse="slow" icon="◌">
                Not started
              </StatusBadge>
            )}
            <span className="hidden font-body text-sm text-text-muted sm:inline">
              {entries.length} players
            </span>
          </div>

          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search player…"
                className="h-10 w-full rounded-xs border border-border-default bg-bg-inset pl-9 pr-3 font-body text-sm text-text-primary placeholder:text-text-muted focus:border-accent-cyan focus:outline-none"
              />
            </div>
            <div className="flex border border-border-default bg-bg-inset">
              {[
                ["All", false],
                ["Top 10", true],
              ].map(([label, val]) => (
                <button
                  key={label as string}
                  onClick={() => {
                    setFilterTop10(val as boolean);
                    setPage(1);
                  }}
                  className={cn(
                    "px-4 py-2 font-label text-[16px] uppercase tracking-[0.04em]",
                    filterTop10 === val ? "bg-bg-elevated text-accent-cyan" : "text-text-secondary",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1120px] px-4 py-6 sm:px-8">
        {/* Podium */}
        {!query && currentPage === 1 && podium.length > 0 && <Podium entries={podium} />}

        {/* Table */}
        <div id="leaderboard-table" className="scroll-mt-20 overflow-x-auto border border-border-default bg-bg-panel">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="sticky top-0 border-b border-border-default bg-bg-base">
                <th className="w-20 px-4 py-3 text-left font-label text-[16px] uppercase tracking-[0.04em] text-text-muted">
                  Rank
                </th>
                <th className="px-4 py-3 text-left font-label text-[16px] uppercase tracking-[0.04em] text-text-muted">
                  Player
                </th>
                <th className="px-4 py-3 text-right font-label text-[16px] uppercase tracking-[0.04em] text-text-muted">
                  Round pts
                </th>
                <th className="px-4 py-3 text-right font-label text-[16px] uppercase tracking-[0.04em] text-accent-magenta">
                  Bonus
                </th>
                <th className="px-4 py-3 text-right font-label text-[16px] uppercase tracking-[0.04em] text-accent-yellow">
                  Total
                </th>
                <th className="px-4 py-3 text-right font-label text-[16px] uppercase tracking-[0.04em] text-text-muted">
                  Time taken
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr
                  key={r.id}
                  ref={r.self ? selfRef : undefined}
                  aria-current={r.self ? "true" : undefined}
                  className={cn(
                    "border-b border-border-hairline last:border-0 hover:bg-bg-hover",
                    r.self && "bg-fill-brand",
                  )}
                  style={r.self ? { boxShadow: "inset 3px 0 0 0 #FFD23F" } : undefined}
                >
                  <td className="px-4 py-3.5 font-mono text-sm font-bold text-text-primary">
                    {r.self && <span className="mr-1 text-accent-yellow">▶</span>}
                    {r.rank <= 3 ? (
                      <span className="font-display text-[14px]">{padScore(r.rank, 2)}</span>
                    ) : (
                      padScore(r.rank, 2)
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-xs bg-bg-elevated font-mono text-[10px] font-bold text-text-secondary">
                        {r.initials}
                      </span>
                      <span className="font-body text-sm font-medium text-text-primary">{r.name}</span>
                      {r.self && (
                        <span className="rounded-xs border border-accent-yellow px-1.5 py-0.5 font-label text-[14px] text-accent-yellow">
                          YOU
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-sm text-text-primary font-tnum">
                    {r.roundPts}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-sm text-accent-magenta font-tnum">
                    +{r.bonus}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-sm font-bold text-accent-yellow font-tnum">
                    {r.total}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-sm text-text-secondary font-tnum">
                    {r.time}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center font-body text-sm text-text-muted">
                    {entries.length === 0 ? (
                      "No scores yet. Players appear here once they start a round."
                    ) : (
                      <>
                        No player named "{query}".{" "}
                        <button onClick={() => setQuery("")} className="text-accent-cyan hover:underline">
                          Clear search
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {rows.length > 0 && (
          <nav
            aria-label="Leaderboard pages"
            className="mt-4 flex flex-col items-center justify-between gap-3 border border-border-default bg-bg-panel px-4 py-3 sm:flex-row"
          >
            <p className="font-body text-sm text-text-muted" aria-live="polite">
              Showing {rangeStart}–{rangeEnd} of {rows.length} players
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => goTo(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className="flex h-9 items-center gap-1 rounded-xs border border-border-strong px-3 font-label text-[16px] uppercase tracking-[0.04em] text-text-primary hover:bg-bg-hover disabled:cursor-not-allowed disabled:border-border-default disabled:text-text-disabled disabled:hover:bg-transparent"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              {pageNumbers.map((n, i) => (
                <span key={n} className="flex items-center gap-1.5">
                  {i > 0 && n - pageNumbers[i - 1] > 1 && (
                    <span className="px-1 font-mono text-text-muted">…</span>
                  )}
                  <button
                    onClick={() => goTo(n)}
                    aria-label={`Page ${n}`}
                    aria-current={n === currentPage ? "page" : undefined}
                    className={cn(
                      "h-9 min-w-9 rounded-xs border px-2 font-mono text-sm",
                      n === currentPage
                        ? "border-accent-cyan bg-fill-info text-accent-cyan"
                        : "border-border-default text-text-secondary hover:bg-bg-hover hover:text-text-primary",
                    )}
                  >
                    {n}
                  </button>
                </span>
              ))}
              <button
                onClick={() => goTo(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Next page"
                className="flex h-9 items-center gap-1 rounded-xs border border-border-strong px-3 font-label text-[16px] uppercase tracking-[0.04em] text-text-primary hover:bg-bg-hover disabled:cursor-not-allowed disabled:border-border-default disabled:text-text-disabled disabled:hover:bg-transparent"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </nav>
        )}

        {self && (
          <div className="sticky bottom-4 mt-6 flex items-center justify-between border-t-2 border-accent-yellow bg-bg-elevated px-4 py-3">
            <span className="font-body text-sm text-text-primary">
              YOU · #{self.rank} · {self.total} · {self.time}
            </span>
            <button
              onClick={jumpToSelf}
              className="font-body text-sm text-accent-cyan hover:underline"
            >
              Jump to my row
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
