import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArenaHUD, type TimerState, type InterruptState } from "./ArenaHUD";
import { ProblemPanel } from "./ProblemPanel";
import { CodeEditor } from "./CodeEditor";
import { ResultPanel, type RunResult, type SubmitResult } from "./ResultPanel";
import { LockOverlay } from "./LockOverlay";
import { DistractionModal } from "./DistractionModal";
import { RoundTransition } from "./RoundTransition";
import { StatusBar } from "./StatusBar";
import { ResizeHandle } from "./ResizeHandle";
import { DevConsole } from "./DevConsole";
import { EVENT } from "../../lib/data";
import { cn } from "../../lib/utils";
import { useEventState } from "../../lib/eventStore";

const ROUND_SECONDS = EVENT.roundMinutes * 60;

export default function Arena() {
  const navigate = useNavigate();
  const { status: eventStatus } = useEventState();
  // Entered from a real (admin-started) event: begin fresh. Otherwise open a mid-run demo state.
  const fresh = eventStatus === "live";
  const [round, setRound] = useState(fresh ? 1 : 4);
  const [secondsLeft, setSecondsLeft] = useState(fresh ? ROUND_SECONDS : 522);
  const [score, setScore] = useState(fresh ? 0 : 420);
  const [solvedRounds, setSolvedRounds] = useState<number[]>(fresh ? [] : [1, 2, 3]);
  const [expiredRounds, setExpiredRounds] = useState<number[]>([]);
  const [connection, setConnection] = useState<"connected" | "reconnecting" | "offline">("connected");

  const [runResult, setRunResult] = useState<RunResult>("idle");
  const [submitResult, setSubmitResult] = useState<SubmitResult>("idle");

  const [distraction, setDistraction] = useState<number | null>(null);
  const [distractionCount, setDistractionCount] = useState(0);
  const [interruptState, setInterruptState] = useState<InterruptState>("standby");

  const [transition, setTransition] = useState<{ variant: "clear" | "time-up"; isFinal: boolean } | null>(null);
  const [timerFrozen, setTimerFrozen] = useState(false);
  const [resultH, setResultH] = useState(240);
  const [resultCollapsed, setResultCollapsed] = useState(false);
  const editorColRef = useRef<HTMLDivElement>(null);
  const [mobileTab, setMobileTab] = useState<"PROBLEM" | "CODE" | "RESULTS">("PROBLEM");

  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [focusLine, setFocusLine] = useState<{ line: number; nonce: number } | null>(null);
  const [reconnected, setReconnected] = useState(false);

  const [eventEnded, setEventEnded] = useState(false);
  const prevEventStatus = useRef(eventStatus);
  useEffect(() => {
    if (prevEventStatus.current === "live" && eventStatus === "ended") {
      setEventEnded(true);
      const t = setTimeout(() => navigate("/complete?ended=1"), 2000);
      prevEventStatus.current = eventStatus;
      return () => clearTimeout(t);
    }
    prevEventStatus.current = eventStatus;
  }, [eventStatus, navigate]);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    tickRef.current = setInterval(() => {
      if (distraction !== null || transition || timerFrozen) return;
      setSecondsLeft((s) => {
        if (s <= 0) return 0;
        return s - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [distraction, transition, timerFrozen]);

  useEffect(() => {
    if (secondsLeft === 0 && !transition && !timerFrozen) {
      setSubmitResult("expired");
      setTimeout(() => triggerTransition("time-up"), 400);
    }
  }, [secondsLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  const timerState: TimerState = timerFrozen
    ? "paused"
    : secondsLeft <= 60
      ? "critical"
      : secondsLeft <= 180
        ? "warning"
        : "normal";

  function triggerTransition(variant: "clear" | "time-up") {
    const isFinal = round >= EVENT.totalRounds;
    setTransition({ variant, isFinal });
    if (variant === "clear") {
      setSolvedRounds((r) => [...r, round]);
    } else {
      setExpiredRounds((r) => [...r, round]);
    }
    const delay = isFinal ? 1600 : 2000;
    setTimeout(() => {
      if (isFinal) {
        navigate("/complete");
        return;
      }
      setRound((r) => r + 1);
      setSecondsLeft(ROUND_SECONDS);
      setRunResult("idle");
      setSubmitResult("idle");
      setTransition(null);
    }, delay);
  }

  const busy =
    distraction !== null ||
    !!transition ||
    connection === "offline" ||
    runResult === "running" ||
    submitResult === "submitting" ||
    submitResult === "accepted" ||
    submitResult === "expired";

  function handleRun(forced: RunResult = "passed") {
    if (busy) return;
    setErrorLine(null);
    setSubmitResult("idle"); // only the latest action's result is shown
    setRunResult("running");
    setTimeout(() => {
      setRunResult(forced);
      setErrorLine(forced === "compile-error" ? 3 : null);
    }, 1000);
  }

  function handleSubmit(outcome: SubmitResult = "accepted") {
    if (busy) return;
    setErrorLine(null);
    setRunResult("idle"); // only the latest action's result is shown
    setSubmitResult("submitting");
    setTimeout(() => {
      setSubmitResult(outcome);
      if (outcome === "accepted") {
        setScore((s) => s + EVENT.dsaPoints);
        setTimeout(() => triggerTransition("clear"), 600);
      }
    }, 1000);
  }

  const triggerRef = useRef<() => void>(() => {});

  function triggerDistraction() {
    if (distraction !== null || transition || submitResult === "accepted" || submitResult === "expired") return;
    setInterruptState("active");
    // Cycle through all 10 distraction challenges
    setDistraction((distractionCount % 10) + 1);
  }

  triggerRef.current = triggerDistraction;

  // Interrupt after 3 to 5 minutes (180s to 300s) during a round (or after ~20-30s in demo start if user jumps straight in)
  useEffect(() => {
    if (distraction !== null || transition || eventEnded) return;

    // Random trigger time between 3 and 5 minutes (180s - 300s) into the 10-minute round
    // For fast testing or initial demo round, allow trigger between 180s - 300s
    const randomDelay = (180 + Math.random() * 120) * 1000;
    const t = setTimeout(() => {
      triggerRef.current();
    }, randomDelay);

    return () => clearTimeout(t);
  }, [eventStatus, distraction, transition, eventEnded, round]);

  function handleDistractionResolved(cleared: boolean) {
    if (cleared) {
      setScore((s) => s + EVENT.bonusPoints);
      setDistractionCount((c) => c + 1);
      setInterruptState("cleared");
    } else {
      setInterruptState("missed");
    }
    setDistraction(null);
    setTimeout(() => setInterruptState("standby"), 2000);
  }

  const locked = distraction !== null;

  function changeConnection() {
    if (connection === "connected") {
      setConnection("offline");
      setReconnected(false);
    } else {
      setConnection("connected");
      setReconnected(true);
      setTimeout(() => setReconnected(false), 2500);
    }
  }

  function resetArena() {
    setRound(4);
    setSecondsLeft(522);
    setScore(420);
    setSolvedRounds([1, 2, 3]);
    setExpiredRounds([]);
    setRunResult("idle");
    setSubmitResult("idle");
    setErrorLine(null);
    setTimerFrozen(false);
    setConnection("connected");
    setInterruptState("standby");
    setDistractionCount(0);
  }

  const devActions = [
    { label: "⚡ Trigger distraction", onClick: triggerDistraction },
    { label: "▶ Run — pass", onClick: () => handleRun("passed") },
    { label: "▶ Run — fail", onClick: () => handleRun("failed") },
    { label: "▶ Run — compile error", onClick: () => handleRun("compile-error") },
    { label: "⏎ Submit — accepted", onClick: () => handleSubmit("accepted") },
    { label: "⏎ Submit — wrong answer", onClick: () => handleSubmit("wrong") },
    { label: "⏱ Set timer critical (00:47)", onClick: () => setSecondsLeft(47) },
    { label: "⏱ Set timer warning (02:30)", onClick: () => setSecondsLeft(150) },
    { label: "⏱ Time's up in 5s", onClick: () => setSecondsLeft(5) },
    { label: "⏱ Reset timer (08:42)", onClick: () => setSecondsLeft(522) },
    {
      label: connection === "connected" ? "📡 Go offline" : "📡 Reconnect",
      onClick: changeConnection,
    },
    {
      label: timerFrozen ? "🕒 Resume timer" : "🕒 Pause timer (distraction cfg)",
      onClick: () => setTimerFrozen((v) => !v),
    },
    { label: "⏭ Skip to final round (10)", onClick: () => setRound(10) },
    { label: "↺ Reset arena", onClick: resetArena },
  ];

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-bg-canvas">
      <ArenaHUD
        round={round}
        secondsLeft={secondsLeft}
        timerState={timerState}
        score={score}
        interruptState={interruptState}
        clearedCount={distractionCount}
        solvedRounds={solvedRounds}
        expiredRounds={expiredRounds}
        connection={connection}
      />

      {connection === "offline" && (
        <div className="flex h-10 items-center justify-center border-b border-danger/40 bg-fill-danger px-4 text-center font-body text-sm text-danger">
          Connection lost. Keep coding — your work is saved on this device. Run and Submit are paused.
        </div>
      )}

      {reconnected && (
        <div className="flex h-10 items-center justify-center border-b border-success/40 bg-fill-success px-4 text-center font-body text-sm text-success">
          ✓ Reconnected. Run and Submit are back.
        </div>
      )}

      {/* Mobile / tablet segmented workspace tabs */}
      <div className="flex h-11 shrink-0 border-b border-border-hairline bg-bg-base lg:hidden">
        {(["PROBLEM", "CODE", "RESULTS"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setMobileTab(t)}
            className={cn(
              "flex-1 font-label text-[16px] uppercase tracking-[0.04em]",
              mobileTab === t ? "bg-bg-elevated text-accent-cyan" : "text-text-muted",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        <div
          className={cn(
            "w-full flex-col overflow-hidden lg:flex lg:w-[40%] lg:min-w-[380px] lg:max-w-[640px]",
            mobileTab === "PROBLEM" ? "flex" : "hidden",
            locked && "pointer-events-none",
          )}
        >
          <div className={cn("h-full", locked && "blur-[8px] saturate-[0.6]")}>
            <ProblemPanel round={round} />
          </div>
        </div>

        <div className="hidden w-[1px] bg-border-default lg:block" />

        <div
          className={cn(
            "min-w-0 flex-1 flex-col overflow-hidden lg:flex",
            mobileTab === "CODE" || mobileTab === "RESULTS" ? "flex" : "hidden",
            locked && "pointer-events-none",
          )}
        >
          <div ref={editorColRef} className={cn("flex min-h-0 flex-1 flex-col", locked && "blur-[8px] saturate-[0.6]")}>
            <div className={cn("min-h-0 flex-1", mobileTab === "RESULTS" && "hidden lg:block")}>
              <CodeEditor
                key={round}
                locked={submitResult === "submitting"}
                errorLine={errorLine}
                focusLine={focusLine}
              />
            </div>
            <div
              className={cn(
                "relative h-[240px] shrink-0 lg:h-[var(--result-h)]",
                mobileTab === "RESULTS" && "!h-full lg:!h-[var(--result-h)]",
              )}
              style={{ "--result-h": `${resultCollapsed ? 40 : resultH}px` } as React.CSSProperties}
            >
              {!resultCollapsed && (
                <ResizeHandle
                  containerRef={editorColRef}
                  height={resultH}
                  onChange={setResultH}
                  disabled={locked}
                />
              )}
              <ResultPanel
                runResult={runResult}
                submitResult={submitResult}
                onRun={() => handleRun()}
                onSubmit={() => handleSubmit()}
                onCollapseChange={setResultCollapsed}
                compileErrorLine={errorLine ?? 3}
                onJumpToLine={(line) => {
                  setMobileTab("CODE");
                  setFocusLine({ line, nonce: Date.now() });
                }}
                disabled={connection === "offline" || locked || !!transition}
              />
            </div>
          </div>
        </div>

        {locked && <LockOverlay />}
        {distraction !== null && (
          <DistractionModal index={distraction} onResolved={handleDistractionResolved} />
        )}
        {transition && (
          <RoundTransition round={round} variant={transition.variant} isFinal={transition.isFinal} />
        )}
      </div>

      <StatusBar connection={connection === "offline" ? "Offline" : connection === "reconnecting" ? "Reconnecting" : "Connected"} />

      <DevConsole actions={devActions} />

      {eventEnded && (
        <div
          className="crt-scanlines fixed inset-0 z-system flex flex-col items-center justify-center bg-black/95 px-4 text-center"
          role="alert"
        >
          <span className="font-display text-3xl text-text-primary sm:text-5xl">EVENT ENDED</span>
          <p className="mt-4 font-body text-text-secondary">
            The admin has ended the event. Your progress is saved.
          </p>
        </div>
      )}
    </div>
  );
}
