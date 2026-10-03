import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Maximize, TriangleAlert } from "lucide-react";

export type ScreenGuardReason = "fullscreen" | "focus" | "visibility" | "navigation";
type PromptReason = ScreenGuardReason | "initial";

interface ScreenGuardContextValue {
  active: boolean;
  locked: boolean;
  askToReturn: (reason?: ScreenGuardReason) => void;
  requestWarning: (reason?: ScreenGuardReason) => void;
  /** Suppress screen warnings for an already authorized finish or exit. */
  allowNavigation: (action: () => void) => void;
}

const ScreenGuardContext = createContext<ScreenGuardContextValue>({
  active: false,
  locked: false,
  askToReturn: () => undefined,
  requestWarning: () => undefined,
  allowNavigation: (action) => action(),
});

export function useCompetitionScreenGuard() {
  return useContext(ScreenGuardContext);
}

function challengeIsInView() {
  return !!document.fullscreenElement && document.visibilityState === "visible" && document.hasFocus();
}

function exitChallengeFullscreen() {
  // Browser fullscreen (F11) is separate and cannot be controlled by this API.
  if (document.fullscreenElement === document.documentElement && document.exitFullscreen) {
    void document.exitFullscreen().catch(() => undefined);
  }
}

/** Keeps the live challenge in view without ending or changing participation. */
export function CompetitionScreenGuard({
  enabled,
  onReturn,
  onViolation,
  onAllowNavigation,
  children,
}: {
  enabled: boolean;
  onReturn?: () => void;
  onViolation?: (reason: ScreenGuardReason) => void;
  onAllowNavigation?: () => void;
  children: ReactNode;
}) {
  const [prompt, setPrompt] = useState<PromptReason | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);
  const enabledRef = useRef(enabled);
  const leavingRef = useRef(false);
  const requestingFullscreen = useRef(false);
  const warningEpisode = useRef<PromptReason | null>(null);
  const onViolationRef = useRef(onViolation);
  const onAllowNavigationRef = useRef(onAllowNavigation);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lockedRef = useRef(false);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const wasEnabled = useRef(false);
  const mounted = useRef(true);
  const titleId = useId();
  const descriptionId = useId();
  useLayoutEffect(() => {
    enabledRef.current = enabled;
    onViolationRef.current = onViolation;
    onAllowNavigationRef.current = onAllowNavigation;
  }, [enabled, onViolation, onAllowNavigation]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      leavingRef.current = true;
      if (wasEnabled.current) exitChallengeFullscreen();
    };
  }, []);

  const requestWarning = useCallback((reason: ScreenGuardReason = "navigation") => {
    if (!enabledRef.current || leavingRef.current || requestingFullscreen.current || warningEpisode.current !== null) return;
    // A tab switch often produces blur and visibilitychange together.
    // Set the episode ref immediately so events in the same browser tick cannot double report.
    warningEpisode.current = reason;
    setPrompt(reason);
    onViolationRef.current?.(reason);
  }, []);

  const allowNavigation = useCallback((action: () => void) => {
    leavingRef.current = true;
    try {
      onAllowNavigationRef.current?.();
      action();
      warningEpisode.current = null;
      setPrompt(null);
      exitChallengeFullscreen();
    } catch (cause) {
      leavingRef.current = false;
      requestWarning("navigation");
      throw cause;
    }
  }, [requestWarning]);

  useEffect(() => {
    if (!enabled) {
      const previouslyEnabled = wasEnabled.current;
      wasEnabled.current = false;
      leavingRef.current = false;
      warningEpisode.current = null;
      setPrompt(null);
      setError(null);
      setReturning(false);
      if (previouslyEnabled) exitChallengeFullscreen();
      return;
    }

    const existingEpisode = wasEnabled.current ? warningEpisode.current : null;
    wasEnabled.current = true;
    leavingRef.current = false;
    setError(null);
    const openingPrompt = existingEpisode ?? (challengeIsInView() ? null : document.fullscreenElement ? "focus" : "initial");
    warningEpisode.current = openingPrompt;
    setPrompt(openingPrompt);
    if (openingPrompt === "focus" && existingEpisode === null) onViolationRef.current?.("focus");

    const onFullscreenChange = () => {
      if (!requestingFullscreen.current && !document.fullscreenElement) requestWarning("fullscreen");
    };
    const onBlur = () => {
      if (!requestingFullscreen.current) requestWarning("focus");
    };
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible" && !requestingFullscreen.current) requestWarning("visibility");
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (leavingRef.current || !enabledRef.current) return;
      // Reload/close warnings are browser controlled; custom dialogs cannot block OS actions.
      requestWarning("navigation");
      event.preventDefault();
      event.returnValue = "";
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [enabled, requestWarning]);

  const locked = enabled && prompt !== null;
  useLayoutEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const preventCancel = (event: Event) => event.preventDefault();
    const preventEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !lockedRef.current) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const restorePolicyDialog = () => {
      // Some browser shells close dialogs on Escape without honoring cancel.
      // Reopen only while the controlled policy state still requires the lock.
      queueMicrotask(() => {
        if (!lockedRef.current || !enabledRef.current || !dialog.isConnected || dialog.open) return;
        dialog.showModal();
        primaryRef.current?.focus();
      });
    };
    dialog.addEventListener("cancel", preventCancel);
    dialog.addEventListener("close", restorePolicyDialog);
    document.addEventListener("keydown", preventEscape, true);
    if (locked && !dialog.open) {
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      primaryRef.current?.focus();
    } else if (!locked && dialog.open) {
      dialog.close();
      if (previousFocus.current?.isConnected) previousFocus.current.focus();
      previousFocus.current = null;
    }
    return () => {
      dialog.removeEventListener("cancel", preventCancel);
      dialog.removeEventListener("close", restorePolicyDialog);
      document.removeEventListener("keydown", preventEscape, true);
    };
  }, [locked]);

  const returnToChallenge = async () => {
    if (requestingFullscreen.current || leavingRef.current || !enabledRef.current) return;
    setError(null);
    setReturning(true);
    requestingFullscreen.current = true;
    try {
      if (!document.fullscreenElement) {
        if (!document.documentElement.requestFullscreen || !document.fullscreenEnabled) {
          setError("Fullscreen is unavailable in this browser. Open the competition in a desktop browser that supports fullscreen, then try again.");
          return;
        }
        // Keep this call in the click handler, before any await, for browser user activation.
        await document.documentElement.requestFullscreen();
      }
      if (!mounted.current || !enabledRef.current || leavingRef.current) {
        exitChallengeFullscreen();
        return;
      }
      if (!challengeIsInView()) {
        setError("Bring the competition tab back into view, then select Return to Challenge.");
        return;
      }
      onReturn?.();
      warningEpisode.current = null;
      setPrompt(null);
    } catch {
      if (mounted.current && enabledRef.current) {
        setError("Your browser could not enter fullscreen. Allow fullscreen for this page and try again.");
      }
    } finally {
      requestingFullscreen.current = false;
      if (mounted.current) setReturning(false);
    }
  };

  const initial = prompt === "initial";
  return (
    <ScreenGuardContext.Provider value={{ active: enabled, locked, askToReturn: requestWarning, requestWarning, allowNavigation }}>
      {children}
      <dialog
        ref={dialogRef}
        role="alertdialog"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-modal="true"
        aria-busy={returning}
        onCancel={(event) => event.preventDefault()}
        className="fixed inset-0 m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-[540px] overflow-y-auto rounded-sm border border-accent-yellow/50 bg-bg-panel p-0 text-text-primary shadow-overlay backdrop:bg-black/85 backdrop:backdrop-blur-sm"
      >
        <div className="h-1 bg-accent-yellow" aria-hidden="true" />
        <div className="p-6 sm:p-8">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-warning/40 bg-fill-warning text-warning" aria-hidden="true">
              <TriangleAlert size={23} />
            </span>
            <span className="font-mono text-xs uppercase tracking-[0.16em] text-accent-yellow">Competition policy</span>
          </div>
          <h2 id={titleId} className="font-sans text-2xl font-semibold leading-tight">
            {initial ? "Enter fullscreen to start coding" : "Keep the challenge in view"}
          </h2>
          <div id={descriptionId} className="mt-4 space-y-4 font-body text-sm leading-relaxed text-text-secondary">
            <p>
              {initial
                ? "Keep the challenge open in fullscreen while you code. Leaving fullscreen, switching tabs or apps, or navigating away will show a policy reminder when you return."
                : "Keep the challenge open in fullscreen while you code. Leaving fullscreen, switching tabs or apps, or navigating away triggers this policy reminder."}
            </p>
            <div className="rounded-sm border border-border-default bg-bg-inset p-4">
              <p className="text-text-primary">Your participation stays active and your earned points are preserved.</p>
              <p className="mt-2">Recorded participation time continues while you are away.</p>
              <p className="mt-2">Leaving fullscreen, switching tabs or apps, or trying to navigate away is recorded as <span className="text-warning">Risk: Cheating Practice</span> for organizer review. A warning does not disqualify you.</p>
            </div>
          </div>
          {error && <p className="mt-4 font-body text-sm leading-relaxed text-danger" role="alert">{error}</p>}
          <div className="mt-6">
            <button
              ref={primaryRef}
              type="button"
              onClick={() => void returnToChallenge()}
              disabled={returning}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-accent-yellow px-4 py-3 font-sans text-sm font-bold uppercase tracking-[0.04em] text-black shadow-button transition-colors hover:bg-accent-yellow-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Maximize size={16} aria-hidden="true" />
              {returning ? "Entering fullscreen…" : initial ? "Enter Fullscreen" : "Return to Challenge"}
            </button>
          </div>
        </div>
      </dialog>
    </ScreenGuardContext.Provider>
  );
}
