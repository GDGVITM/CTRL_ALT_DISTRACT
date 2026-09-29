import { Lock } from "lucide-react";
import { Logo } from "../../components/Logo";
import { PLAYER, PROBLEM, EVENT } from "../../lib/data";
import { formatMMSS, padScore, cn } from "../../lib/utils";

export type TimerState = "normal" | "warning" | "critical" | "paused";
export type InterruptState = "standby" | "active" | "cleared" | "missed";

export function ArenaHUD({
  round,
  secondsLeft,
  timerState,
  score,
  interruptState,
  clearedCount,
  solvedRounds,
  expiredRounds,
  connection = "connected",
}: {
  round: number;
  secondsLeft: number;
  timerState: TimerState;
  score: number;
  interruptState: InterruptState;
  clearedCount: number;
  solvedRounds: number[];
  expiredRounds: number[];
  connection?: "connected" | "reconnecting" | "offline";
}) {
  const timerLabel =
    timerState === "paused"
      ? "PAUSED"
      : timerState === "critical"
        ? secondsLeft <= 10
          ? "FINAL SECONDS"
          : "FINAL MINUTE"
        : timerState === "warning"
          ? "HURRY"
          : "TIME";

  const timerColor =
    timerState === "critical"
      ? "text-danger"
      : timerState === "warning"
        ? "text-warning"
        : timerState === "paused"
          ? "text-text-muted"
          : "text-text-primary";

  const frameColor =
    timerState === "critical"
      ? "border-danger"
      : timerState === "warning"
        ? "border-warning"
        : timerState === "paused"
          ? "border-border-strong border-dashed"
          : "border-border-strong";

  return (
    <header className="relative z-sticky flex h-14 items-stretch border-b border-border-default bg-bg-base sm:h-[72px]">
      {/* Brand */}
      <div className="hidden items-center gap-2 border-r border-border-default px-4 xl:flex">
        <Logo size={22} wordmarkClassName="text-[10px]" />
      </div>

      {/* Round */}
      <div className="flex flex-col justify-center gap-1 border-r border-border-default px-4">
        <span className="font-label text-[10px] uppercase tracking-wide text-text-muted">
          Round
        </span>
        <span className="font-mono text-lg font-bold text-text-primary font-tnum sm:text-xl">
          {round.toString().padStart(2, "0")}
          <span className="text-text-muted">/{EVENT.totalRounds}</span>
        </span>
        <div className="hidden gap-[3px] sm:flex" aria-hidden="true">
          {Array.from({ length: EVENT.totalRounds }).map((_, i) => {
            const n = i + 1;
            const solved = solvedRounds.includes(n);
            const expired = expiredRounds.includes(n);
            const current = n === round;
            return (
              <span
                key={n}
                className={cn(
                  "h-2 w-2",
                  solved && "bg-success",
                  expired && "bg-danger/60",
                  current && !solved && !expired && "border-2 border-accent-cyan",
                  !solved && !expired && !current && "border border-border-strong",
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Problem meta */}
      <div className="hidden min-w-0 items-center gap-2 border-r border-border-default px-4 xl:flex">
        <span className="rounded-xs bg-fill-warning px-1.5 py-0.5 font-label text-[10px] text-warning">
          ▲ {PROBLEM.difficulty}
        </span>
        <span className="truncate font-body text-sm text-text-secondary">{PROBLEM.title}</span>
      </div>

      {/* Timer (centered) */}
      <div className="flex flex-1 items-center justify-center px-2">
        <div className={cn("flex flex-col items-center border-2 px-4 py-1 chamfer", frameColor)}>
          <span className={cn("font-label text-[9px] uppercase tracking-wide sm:text-[10px]", timerColor)}>
            {timerLabel}
          </span>
          <div className="relative font-mono text-2xl font-extrabold font-tnum sm:text-3xl">
            <span className="text-ghost absolute inset-0">88:88</span>
            <span className={timerColor}>{formatMMSS(secondsLeft)}</span>
          </div>
        </div>
      </div>

      {/* Score */}
      <div className="flex flex-col justify-center gap-1 border-l border-border-default px-4">
        <span className="font-label text-[10px] uppercase tracking-wide text-text-muted">
          Score
        </span>
        <div className="relative font-mono text-lg font-bold text-accent-yellow font-tnum sm:text-2xl">
          <span className="text-ghost absolute inset-0">8888</span>
          {padScore(score)}
        </div>
      </div>

      {/* Interrupt */}
      <div className="hidden flex-col justify-center gap-1 border-l border-border-default px-4 sm:flex">
        <span className="font-label text-[10px] uppercase tracking-wide text-text-muted">
          Interrupt
        </span>
        <span
          className={cn(
            "font-mono text-sm font-bold",
            interruptState === "active" && "animate-pulse-fast text-accent-magenta",
            interruptState === "cleared" && "text-success",
            interruptState === "missed" && "text-text-muted",
            interruptState === "standby" && "text-text-muted",
          )}
        >
          {interruptState === "active" && "⚡ ACTIVE"}
          {interruptState === "cleared" && "✓ CLEARED"}
          {interruptState === "missed" && "✕ MISSED"}
          {interruptState === "standby" && "◌ STANDBY"}
        </span>
        <span className="font-body text-[10px] text-text-muted">Cleared {clearedCount}</span>
      </div>

      {/* Player */}
      <div className="flex items-center gap-2 border-l border-border-default px-4">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            connection === "connected" && "bg-success",
            connection === "reconnecting" && "animate-pulse-slow bg-warning",
            connection === "offline" && "bg-danger",
          )}
        />
        <span className="hidden h-7 w-7 items-center justify-center rounded-xs bg-accent-cyan/15 font-mono text-[10px] font-bold text-accent-cyan sm:flex">
          {PLAYER.initials}
        </span>
        {connection === "offline" && <Lock size={14} className="text-danger" />}
      </div>
    </header>
  );
}
