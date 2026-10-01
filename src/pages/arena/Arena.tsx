import { useCallback, useEffect, useRef, useState } from "react";
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
import { PixelSpinner } from "../../components/ui/Button";
import { api, ApiError } from "../../lib/api";
import type { ArenaState, LanguageId, Problem, RunResponse, SubmitResponse } from "../../lib/types";
import type { DistractionResult } from "../../types/distraction";
import { cn } from "../../lib/utils";
import { useEvent } from "../../context/EventContext";
import { useAuth } from "../../context/AuthContext";

const SYNC_MS = 10_000; // state poll; doubles as the connectivity heartbeat
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Arena() {
  const navigate = useNavigate();
  const EVENT = useEvent();
  const { user } = useAuth();
  const eventStatus = EVENT.status;
  const ROUND_SECONDS = EVENT.roundSeconds;

  // ---- server-owned state -------------------------------------------------------------------
  const [state, setState] = useState<ArenaState | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const lastServerTime = useRef(0);

  const round = state?.round?.round ?? Math.max(state?.participant.currentRound ?? 1, 1);
  const roundActive = state?.round?.status === "active";
  const score = state?.participant.totalPts ?? 0;
  const solvedRounds = state?.rounds.filter((r) => r.status === "solved").map((r) => r.round) ?? [];
  const expiredRounds = state?.rounds.filter((r) => r.status === "expired").map((r) => r.round) ?? [];
  const distractionCount = state?.participant.distractionsCleared ?? 0;

  const applyState = useCallback((next: ArenaState, force = false) => {
    if (!force && next.serverTime < lastServerTime.current) return; // an older response lost the race
    lastServerTime.current = next.serverTime;
    setState(next);
    if (next.round?.status === "active") setSecondsLeft(next.round.secondsLeft);
    else if (next.round) setSecondsLeft(0);
  }, []);

  // ---- connectivity -------------------------------------------------------------------------
  const [connection, setConnection] = useState<"connected" | "reconnecting" | "offline">("connected");
  const [reconnected, setReconnected] = useState(false);
  const offlineSince = useRef<number | null>(null);
  const connectionRef = useRef(connection);
  useEffect(() => {
    connectionRef.current = connection;
  }, [connection]);

  const markOffline = useCallback(() => {
    if (offlineSince.current === null) offlineSince.current = Date.now();
    setConnection("offline");
    setReconnected(false);
  }, []);

  const markOnline = useCallback(() => {
    if (connectionRef.current !== "connected") {
      setConnection("connected");
      setReconnected(true);
      setTimeout(() => setReconnected(false), 2500);
    }
    if (offlineSince.current !== null) {
      const seconds = Math.round((Date.now() - offlineSince.current) / 1000);
      offlineSince.current = null;
      if (seconds >= 10) api.reportProctor("DISCONNECT", seconds).catch(() => undefined);
    }
  }, []);

  const syncState = useCallback(async () => {
    try {
      applyState(await api.arena.state());
      markOnline();
    } catch (err) {
      if (err instanceof ApiError && err.isNetwork) markOffline();
    }
  }, [applyState, markOffline, markOnline]);

  useEffect(() => {
    const t = setInterval(() => void syncState(), SYNC_MS);
    const goOffline = () => markOffline();
    const goOnline = () => {
      setConnection("reconnecting");
      void syncState();
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      clearInterval(t);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [syncState, markOffline]);

  // ---- UI state -----------------------------------------------------------------------------
  const [runResult, setRunResult] = useState<RunResult>("idle");
  const [submitResult, setSubmitResult] = useState<SubmitResult>("idle");
  const [runData, setRunData] = useState<RunResponse | null>(null);
  const [submitData, setSubmitData] = useState<SubmitResponse | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [distraction, setDistraction] = useState<number | null>(null);
  const [interruptState, setInterruptState] = useState<InterruptState>("standby");

  const [transition, setTransition] = useState<{ variant: "clear" | "time-up"; isFinal: boolean } | null>(null);
  const [resultH, setResultH] = useState(240);
  const [resultCollapsed, setResultCollapsed] = useState(false);
  const editorColRef = useRef<HTMLDivElement>(null);
  const [mobileTab, setMobileTab] = useState<"PROBLEM" | "CODE" | "RESULTS">("PROBLEM");

  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [focusLine, setFocusLine] = useState<{ line: number; nonce: number } | null>(null);
  const editorRef = useRef<{ code: string; language: LanguageId }>({ code: "", language: EVENT.languages[0].id });

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // ---- bootstrap: enter (or resume) the run -------------------------------------------------
  useEffect(() => {
    void (async () => {
      for (let attempt = 0; alive.current; attempt++) {
        try {
          const s = await api.arena.start();
          if (!alive.current) return;
          if (s.finished) {
            navigate(s.eventStatus === "ended" ? "/complete?ended=1" : "/complete", { replace: true });
            return;
          }
          applyState(s, true);
          markOnline();
          if (s.round?.distraction.state === "active") {
            setDistraction(s.round.distraction.index);
            setInterruptState("active");
          }
          return;
        } catch (err) {
          if (err instanceof ApiError && !err.isNetwork) {
            // Not joined, or the event is not running: the dashboard explains and routes from there.
            navigate(err.code === "event_not_live" && eventStatus === "ended" ? "/complete?ended=1" : "/dashboard", { replace: true });
            return;
          }
          markOffline();
          await sleep(Math.min(1000 * (attempt + 1), 5000));
        }
      }
    })();
  }, [navigate, applyState, markOnline, markOffline, eventStatus]);

  // The problem for the round in progress.
  const activeRound = state?.round?.round;
  useEffect(() => {
    if (!activeRound) return;
    let cancelled = false;
    setProblem(null);
    const load = async () => {
      for (let attempt = 0; !cancelled; attempt++) {
        try {
          const p = await api.arena.problem(activeRound);
          if (!cancelled) setProblem(p);
          return;
        } catch {
          await sleep(Math.min(1000 * (attempt + 1), 5000));
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [activeRound]);

  // ---- event ended by the admin -------------------------------------------------------------
  const [eventEnded, setEventEnded] = useState(false);
  const prevEventStatus = useRef(eventStatus);
  useEffect(() => {
    const endedNow =
      (prevEventStatus.current === "live" && eventStatus === "ended") || state?.eventStatus === "ended";
    prevEventStatus.current = eventStatus;
    if (!endedNow || eventEnded) return;
    setEventEnded(true);
    const t = setTimeout(() => navigate("/complete?ended=1"), 2000);
    return () => clearTimeout(t);
  }, [eventStatus, state?.eventStatus, eventEnded, navigate]);

  // ---- the clock ----------------------------------------------------------------------------
  const timerFrozen = distraction !== null;
  useEffect(() => {
    const tick = setInterval(() => {
      if (!roundActive || distraction !== null || transition) return;
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, [roundActive, distraction, transition]);

  // At 0:00 ask the server to confirm. It closes the round once its own clock agrees (small grace).
  const expiring = useRef(false);
  useEffect(() => {
    if (secondsLeft > 0 || !roundActive || transition || distraction !== null || expiring.current) return;
    expiring.current = true;
    void (async () => {
      for (let i = 0; i < 12 && alive.current; i++) {
        try {
          const s = await api.arena.expire();
          applyState(s);
          markOnline();
          if (s.round?.status !== "active") break;
        } catch (err) {
          if (err instanceof ApiError && err.isNetwork) markOffline();
        }
        await sleep(1000);
      }
      expiring.current = false;
    })();
  }, [secondsLeft, roundActive, transition, distraction, applyState, markOnline, markOffline]);

  const timerState: TimerState = timerFrozen
    ? "paused"
    : secondsLeft <= 60
      ? "critical"
      : secondsLeft <= 180
        ? "warning"
        : "normal";

  // ---- round transitions (driven by the server's verdict on the round) ----------------------
  const resetRoundUi = useCallback(() => {
    setRunResult("idle");
    setSubmitResult("idle");
    setRunData(null);
    setSubmitData(null);
    setNotice(null);
    setErrorLine(null);
    setInterruptState("standby");
  }, []);

  const advance = useCallback(async () => {
    for (let attempt = 0; alive.current; attempt++) {
      try {
        const s = await api.arena.start();
        if (!alive.current) return;
        if (s.finished) {
          navigate("/complete", { replace: true });
          return;
        }
        applyState(s, true);
        resetRoundUi();
        setTransition(null);
        markOnline();
        return;
      } catch (err) {
        if (err instanceof ApiError && !err.isNetwork) {
          navigate("/complete?ended=1", { replace: true });
          return;
        }
        markOffline();
        await sleep(Math.min(1000 * (attempt + 1), 5000));
      }
    }
  }, [navigate, applyState, resetRoundUi, markOnline, markOffline]);

  const transitioned = useRef(0);
  useEffect(() => {
    const r = state?.round;
    if (!r || r.status === "active" || transition || transitioned.current === r.round) return;
    transitioned.current = r.round;
    const variant = r.status === "solved" ? "clear" : "time-up";
    const closedRound = r.round;
    const t = setTimeout(
      () => {
        const isFinal = closedRound >= EVENT.totalRounds;
        setTransition({ variant, isFinal });
        if (variant === "time-up") setSubmitResult("expired");
        setTimeout(() => {
          if (isFinal) navigate("/complete");
          else void advance();
        }, isFinal ? 1600 : 2000);
      },
      variant === "clear" ? 600 : 400,
    );
    return () => clearTimeout(t);
  }, [state?.round, transition, EVENT.totalRounds, navigate, advance]);

  // ---- run / submit -------------------------------------------------------------------------
  const busy =
    distraction !== null ||
    !!transition ||
    connection === "offline" ||
    !roundActive ||
    runResult === "running" ||
    submitResult === "submitting" ||
    submitResult === "accepted" ||
    submitResult === "expired";

  function handleActionError(err: unknown) {
    setRunResult("idle");
    setSubmitResult("idle");
    if (err instanceof ApiError) {
      if (err.isNetwork) {
        markOffline();
        return;
      }
      if (err.code === "round_closed" || err.code === "event_not_live") void syncState();
      setNotice(err.message);
      return;
    }
    setNotice("Something went wrong. Please try again.");
  }

  async function handleRun() {
    if (busy) return;
    const { code, language } = editorRef.current;
    setErrorLine(null);
    setNotice(null);
    setSubmitResult("idle"); // only the latest action's result is shown
    setSubmitData(null);
    setRunResult("running");
    try {
      const r = await api.arena.run(language, code);
      setRunData(r);
      setRunResult(r.result);
      setErrorLine(r.compile?.line ?? null);
    } catch (err) {
      handleActionError(err);
    }
  }

  async function handleSubmit() {
    if (busy) return;
    const { code, language } = editorRef.current;
    setErrorLine(null);
    setNotice(null);
    setRunResult("idle"); // only the latest action's result is shown
    setRunData(null);
    setSubmitResult("submitting");
    try {
      const r = await api.arena.submit(language, code);
      setSubmitData(r);
      setSubmitResult(r.result === "accepted" ? "accepted" : r.result === "compile-error" ? "compile-error" : r.result === "expired" ? "expired" : "wrong");
      setErrorLine(r.compile?.line ?? null);
      setState((prev) =>
        prev
          ? {
              ...prev,
              participant: r.participant,
              round: prev.round && r.result === "accepted" ? { ...prev.round, status: "solved" } : prev.round,
            }
          : prev,
      );
      if (r.result === "expired") void syncState();
    } catch (err) {
      handleActionError(err);
    }
  }

  const runRef = useRef(handleRun);
  const submitRef = useRef(handleSubmit);
  useEffect(() => {
    runRef.current = handleRun;
    submitRef.current = handleSubmit;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "Enter") {
        e.preventDefault();
        void submitRef.current();
      } else if (e.key === "'") {
        e.preventDefault();
        void runRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---- distractions -------------------------------------------------------------------------
  const startingDistraction = useRef(false);
  const distractionCooldown = useRef(0);
  const dState = state?.round?.distraction;
  useEffect(() => {
    if (!dState || dState.state !== "pending" || !roundActive || distraction !== null || transition || eventEnded) return;
    if (startingDistraction.current || Date.now() < distractionCooldown.current) return;
    if (ROUND_SECONDS - secondsLeft < dState.atSeconds) return;
    startingDistraction.current = true;
    void (async () => {
      try {
        const s = await api.arena.distractionStart();
        applyState(s);
        if (s.round?.distraction.state === "active") {
          setInterruptState("active");
          setDistraction(s.round.distraction.index);
        }
      } catch (err) {
        distractionCooldown.current = Date.now() + 3000; // "too early" etc.: try again shortly
        if (err instanceof ApiError && err.isNetwork) markOffline();
      } finally {
        startingDistraction.current = false;
      }
    })();
  }, [secondsLeft, dState, roundActive, distraction, transition, eventEnded, ROUND_SECONDS, applyState, markOffline]);

  async function handleDistractionResolved(cleared: boolean, result: DistractionResult | null) {
    setDistraction(null);
    setInterruptState(cleared ? "cleared" : "missed");
    setTimeout(() => setInterruptState("standby"), 2000);
    try {
      const r = await api.arena.distractionResolve({
        result: result?.result ?? "timeout",
        timeTaken: Math.round(result?.timeTaken ?? EVENT.distractionSeconds),
        distractionId: result?.distractionId,
        metrics: result?.metrics,
      });
      setState((prev) => (prev ? { ...prev, participant: r.participant } : prev));
      if (!r.cleared) setInterruptState("missed");
    } catch (err) {
      if (err instanceof ApiError && err.isNetwork) markOffline();
    }
    void syncState(); // pick up the resumed clock from the server
  }

  const locked = distraction !== null;

  // ---- proctoring: report leaving the tab / full screen -------------------------------------
  useEffect(() => {
    if (eventStatus !== "live") return;
    let awayAt: number | null = null;
    let wasFullscreen = !!document.fullscreenElement;
    const away = () => {
      if (awayAt === null) awayAt = Date.now();
    };
    const back = () => {
      if (awayAt === null) return;
      const seconds = Math.round((Date.now() - awayAt) / 1000);
      awayAt = null;
      if (seconds >= 2) api.reportProctor("TAB_SWITCH", seconds).catch(() => undefined);
    };
    const onVisibility = () => (document.visibilityState === "hidden" ? away() : back());
    const onFullscreen = () => {
      if (wasFullscreen && !document.fullscreenElement) api.reportProctor("FULLSCREEN_EXIT").catch(() => undefined);
      wasFullscreen = !!document.fullscreenElement;
    };
    window.addEventListener("blur", away);
    window.addEventListener("focus", back);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      window.removeEventListener("blur", away);
      window.removeEventListener("focus", back);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, [eventStatus]);

  if (!state) {
    return (
      <div className="crt-grid crt-scanlines fixed inset-0 flex flex-col items-center justify-center bg-bg-canvas text-accent-cyan">
        <div className="border border-accent-cyan/30 bg-bg-base/80 p-6 text-center font-mono shadow-[0_0_20px_rgba(56,225,255,0.15)]">
          <div className="mb-3 flex justify-center">
            <PixelSpinner />
          </div>
          <p className="text-xs uppercase tracking-widest text-text-secondary">LOADING ARENA...</p>
        </div>
      </div>
    );
  }

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
        problem={problem}
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
            <ProblemPanel key={round} problem={problem} round={round} />
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
                problem={problem}
                draftKey={`cad:code:${user?.id ?? "anon"}:${round}`}
                onChange={(code, language) => {
                  editorRef.current = { code, language };
                }}
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
                samples={problem?.samples ?? []}
                runData={runData}
                submitData={submitData}
                notice={notice}
                onRun={() => void handleRun()}
                onSubmit={() => void handleSubmit()}
                onCollapseChange={setResultCollapsed}
                onJumpToLine={(line) => {
                  setMobileTab("CODE");
                  setFocusLine({ line, nonce: Date.now() });
                }}
                disabled={connection === "offline" || locked || !!transition || !roundActive}
              />
            </div>
          </div>
        </div>

        {locked && <LockOverlay />}
        {distraction !== null && (
          <DistractionModal index={distraction} onResolved={(cleared, result) => void handleDistractionResolved(cleared, result)} />
        )}
        {transition && (
          <RoundTransition round={round} variant={transition.variant} isFinal={transition.isFinal} />
        )}
      </div>

      <StatusBar connection={connection === "offline" ? "Offline" : connection === "reconnecting" ? "Reconnecting" : "Connected"} />

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
