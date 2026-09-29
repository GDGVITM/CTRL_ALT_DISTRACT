import { EVENT } from "../../lib/data";
import { cn } from "../../lib/utils";

export function RoundTransition({
  round,
  variant,
  isFinal,
}: {
  round: number;
  variant: "clear" | "time-up";
  isFinal: boolean;
}) {
  return (
    <div className="crt-scanlines absolute inset-0 z-transition flex flex-col items-center justify-center bg-black/94" role="status" aria-live="assertive">
      <span className="font-label text-base uppercase tracking-wide text-text-muted">
        Round {round.toString().padStart(2, "0")}
      </span>
      <span
        className={cn(
          "mt-3 font-pixel text-2xl sm:text-4xl",
          variant === "clear" ? "text-success" : "text-danger",
        )}
      >
        {variant === "clear" ? "CLEAR" : "TIME'S UP"}
      </span>
      {variant === "clear" ? (
        <span className="mt-3 font-mono text-2xl font-bold text-accent-yellow">
          +{EVENT.dsaPoints}
        </span>
      ) : (
        <span className="mt-3 font-body text-text-secondary">No points for this round.</span>
      )}

      {isFinal ? (
        <span className="mt-8 font-pixel text-lg text-accent-yellow">FINAL ROUND COMPLETE</span>
      ) : (
        <span className="mt-8 flex items-center gap-2 font-label text-sm uppercase tracking-wide text-text-secondary">
          Loading round {(round + 1).toString().padStart(2, "0")}
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 animate-pulse-slow bg-accent-cyan"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </span>
        </span>
      )}
    </div>
  );
}
