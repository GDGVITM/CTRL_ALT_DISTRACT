import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { Button, PixelSpinner } from "../../components/ui/Button";
import { EVENT } from "../../lib/data";
import { cn } from "../../lib/utils";

type Phase = "active" | "checking" | "success" | "timeout";

const DURATION = EVENT.distractionSeconds;
const CHALLENGE = { sequence: "2, 4, 8, 16, ?", answer: "32" };

export function DistractionModal({
  index,
  onResolved,
}: {
  index: number;
  onResolved: (cleared: boolean) => void;
}) {
  const [phase, setPhase] = useState<Phase>("active");
  const [seconds, setSeconds] = useState(DURATION);
  const [answer, setAnswer] = useState("");
  const [wrongOnce, setWrongOnce] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resolvedRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (phase !== "active") return;
    if (seconds <= 0) {
      setPhase("timeout");
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, phase]);

  useEffect(() => {
    if (phase === "success" || phase === "timeout") {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      const t = setTimeout(() => onResolved(phase === "success"), phase === "success" ? 1500 : 1000);
      return () => clearTimeout(t);
    }
  }, [phase, onResolved]);

  const submit = () => {
    setPhase("checking");
    setTimeout(() => {
      if (answer.trim() === CHALLENGE.answer) {
        setPhase("success");
      } else if (!wrongOnce) {
        setWrongOnce(true);
        setPhase("active");
        setAnswer("");
        inputRef.current?.focus();
      } else {
        setPhase("timeout");
      }
    }, 500);
  };

  const urgency = seconds <= 5 ? "critical" : seconds <= 15 ? "warning" : "normal";
  const ringColor =
    phase === "success"
      ? "#2EE59D"
      : phase === "timeout"
        ? "#FF4D5E"
        : urgency === "critical"
          ? "#FF4D5E"
          : urgency === "warning"
            ? "#FF9F1C"
            : "#FF3EA5";

  const circumference = 2 * Math.PI * 52;
  const progress = phase === "success" || phase === "timeout" ? 0 : seconds / DURATION;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="distraction-title"
        className="crt-scanlines relative w-full max-w-[600px] overflow-hidden border-2 border-accent-magenta bg-bg-panel chamfer-lg"
        style={{ boxShadow: "0 0 24px rgba(255,62,165,0.45)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-accent-magenta/50 bg-fill-bonus px-5 py-3.5">
          <span id="distraction-title" className="font-label text-base uppercase tracking-[0.04em] text-accent-magenta">
            ⚡ Distraction {index.toString().padStart(2, "0")}
          </span>
          <span className="flex items-center gap-1.5 font-mono text-lg font-bold text-accent-magenta">
            BONUS +{EVENT.bonusPoints}
            <span aria-hidden="true">🪙</span>
          </span>
        </div>

        {/* Timer zone */}
        <div className="flex flex-col items-center border-b border-border-hairline py-6">
          {phase === "success" ? (
            <>
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-success text-4xl text-success">
                ✓
              </div>
              <p className="mt-4 font-display text-2xl text-success">CLEARED</p>
              <p className="mt-2 font-mono text-2xl font-extrabold text-accent-magenta">
                +{EVENT.bonusPoints} BONUS
              </p>
            </>
          ) : phase === "timeout" ? (
            <>
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-danger text-4xl text-danger">
                0
              </div>
              <p className="mt-4 font-display text-2xl text-danger">TIME'S UP</p>
              <p className="mt-2 max-w-xs text-center font-body text-sm text-text-secondary">
                No bonus this time. Back to your problem.
              </p>
            </>
          ) : (
            <>
              <div className="relative flex h-[120px] w-[120px] items-center justify-center">
                <svg width="120" height="120" className="-rotate-90">
                  <circle cx="60" cy="60" r="52" stroke="#1F2129" strokeWidth="8" fill="none" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    stroke={ringColor}
                    strokeWidth={urgency === "warning" || urgency === "critical" ? 10 : 8}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - progress)}
                    strokeLinecap="square"
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
                <span
                  className={cn(
                    "absolute font-mono text-4xl font-extrabold",
                    urgency === "critical" ? "text-danger" : urgency === "warning" ? "text-warning" : "text-accent-magenta",
                  )}
                >
                  {phase === "checking" ? <PixelSpinner size={24} /> : seconds}
                </span>
              </div>
              <p className="mt-3 font-label text-[15px] uppercase tracking-[0.04em] text-text-muted">
                {phase === "checking" ? "Checking…" : urgency === "critical" ? "Hurry" : "Seconds remaining"}
              </p>
              <div className="mt-3 h-1.5 w-full max-w-[360px] bg-bg-inset">
                <div
                  className="h-full transition-all duration-1000 ease-linear"
                  style={{ width: `${progress * 100}%`, background: ringColor }}
                />
              </div>
            </>
          )}
        </div>

        {/* Challenge area */}
        {(phase === "active" || phase === "checking") && (
          <div className="p-6">
            <h4 className="font-sans text-lg font-semibold text-text-primary">Quick challenge</h4>
            <p className="mt-1 max-w-md font-body text-sm text-text-secondary">
              Answer before the timer runs out.
            </p>
            <div className="mt-4 min-h-[96px] border-l-2 border-accent-magenta bg-bg-inset p-4">
              <p className="text-center font-mono text-xl tracking-widest text-text-primary">
                {CHALLENGE.sequence}
              </p>
            </div>
            <input
              ref={inputRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && answer && submit()}
              disabled={phase === "checking"}
              placeholder="Type your answer"
              className="mt-4 h-13 w-full rounded-xs border border-border-default bg-bg-inset px-4 text-center font-mono text-lg text-text-primary placeholder:text-text-muted focus:border-accent-cyan focus:outline-none"
              style={{ height: 52 }}
            />
            <div className="mt-1.5 h-6">
              {wrongOnce && phase === "active" && (
                <p className="font-body text-sm text-danger">✕ Not quite — try again</p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border-hairline px-6 py-4">
          <span className="flex items-center gap-1.5 font-body text-xs text-text-muted">
            <Lock size={12} /> Your code is saved and locked.
          </span>
          {(phase === "active" || phase === "checking") && (
            <Button variant="bonus" onClick={submit} disabled={!answer || phase === "checking"}>
              {phase === "checking" ? (
                <span className="flex items-center gap-2">
                  <PixelSpinner /> Checking…
                </span>
              ) : (
                "Solve"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
