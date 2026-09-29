import { cn, padScore } from "../../lib/utils";

interface Row {
  rank: number;
  id: string;
  name: string;
  roundPts: number;
  bonus: number;
  total: number;
  time: string;
  self?: boolean;
}

export function LeaderboardTable({
  rows,
  compact = false,
}: {
  rows: Row[];
  compact?: boolean;
}) {
  return (
    <div className="border border-border-default bg-bg-panel">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border-default bg-bg-base">
            <th className="w-16 px-3 py-2.5 text-left font-label text-[11px] uppercase tracking-wide text-text-muted">
              Rank
            </th>
            <th className="px-3 py-2.5 text-left font-label text-[11px] uppercase tracking-wide text-text-muted">
              Player
            </th>
            {!compact && (
              <th className="px-3 py-2.5 text-right font-label text-[11px] uppercase tracking-wide text-text-muted">
                Round pts
              </th>
            )}
            {!compact && (
              <th className="px-3 py-2.5 text-right font-label text-[11px] uppercase tracking-wide text-accent-magenta">
                Bonus
              </th>
            )}
            <th className="px-3 py-2.5 text-right font-label text-[11px] uppercase tracking-wide text-accent-yellow">
              Total
            </th>
            {!compact && (
              <th className="px-3 py-2.5 text-right font-label text-[11px] uppercase tracking-wide text-text-muted">
                Time taken
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className={cn(
                "border-b border-border-hairline last:border-0 hover:bg-bg-hover",
                r.self && "relative bg-fill-brand",
              )}
              style={r.self ? { boxShadow: "inset 3px 0 0 0 #FFD23F" } : undefined}
              aria-current={r.self ? "true" : undefined}
            >
              <td className="px-3 py-3 font-mono text-sm font-bold text-text-primary">
                {r.rank <= 3 ? (
                  <span className="font-pixel text-[11px]">{padScore(r.rank, 2)}</span>
                ) : (
                  padScore(r.rank, 2)
                )}
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xs bg-bg-elevated font-mono text-[10px] font-bold text-text-secondary">
                    {r.id.slice(0, 2)}
                  </span>
                  <span className="font-body text-sm font-medium text-text-primary">
                    {r.name}
                  </span>
                  {r.self && (
                    <span className="rounded-xs border border-accent-yellow px-1.5 py-0.5 font-label text-[9px] text-accent-yellow">
                      YOU
                    </span>
                  )}
                </div>
              </td>
              {!compact && (
                <td className="px-3 py-3 text-right font-mono text-sm text-text-primary font-tnum">
                  {r.roundPts}
                </td>
              )}
              {!compact && (
                <td className="px-3 py-3 text-right font-mono text-sm text-accent-magenta font-tnum">
                  +{r.bonus}
                </td>
              )}
              <td className="px-3 py-3 text-right font-mono text-sm font-bold text-accent-yellow font-tnum">
                {r.total}
              </td>
              {!compact && (
                <td className="px-3 py-3 text-right font-mono text-sm text-text-secondary font-tnum">
                  {r.time}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
