import { cn, padScore } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";

interface Row {
  rank: number;
  id: string;
  name: string;
  email?: string | null;
  initials: string;
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
  const { user, role, approvalStatus } = useAuth();
  const canViewEmails = !!user && (role === "admin" || approvalStatus === "approved");

  return (
    <div className="overflow-x-auto border border-border-default bg-bg-panel">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border-default bg-bg-base">
            <th className="w-16 px-3 py-2.5 text-left font-label text-[16px] uppercase tracking-[0.04em] text-text-muted">
              Rank
            </th>
            <th className="min-w-[180px] px-3 py-2.5 text-left font-label text-[16px] uppercase tracking-[0.04em] text-text-muted">
              Player
            </th>
            {!compact && (
              <th className="px-3 py-2.5 text-right font-label text-[16px] uppercase tracking-[0.04em] text-text-muted">
                Round pts
              </th>
            )}
            {!compact && (
              <th className="px-3 py-2.5 text-right font-label text-[16px] uppercase tracking-[0.04em] text-accent-magenta">
                Bonus
              </th>
            )}
            <th className="px-3 py-2.5 text-right font-label text-[16px] uppercase tracking-[0.04em] text-accent-yellow">
              Total
            </th>
            {!compact && (
              <th className="px-3 py-2.5 text-right font-label text-[16px] uppercase tracking-[0.04em] text-text-muted">
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
                  <span className="font-display text-[14px]">{padScore(r.rank, 2)}</span>
                ) : (
                  padScore(r.rank, 2)
                )}
              </td>
              <td className="min-w-[180px] px-3 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xs bg-bg-elevated font-mono text-[10px] font-bold text-text-secondary">
                    {r.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-body text-sm font-medium text-text-primary">{r.name}</p>
                    {canViewEmails && r.email && <p className="mt-0.5 break-all font-body text-xs text-text-secondary">{r.email}</p>}
                  </div>
                  {r.self && (
                    <span className="shrink-0 rounded-xs border border-accent-yellow px-1.5 py-0.5 font-label text-[14px] text-accent-yellow">
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
