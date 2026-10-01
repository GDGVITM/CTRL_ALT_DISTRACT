import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import type { EventInfo, EventStatus } from "../lib/types";
import { useAuth } from "./AuthContext";
import { PixelSpinner } from "../components/ui/Button";

interface EventContextType {
  event: EventInfo;
  refresh: () => Promise<void>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

const POLL_MS = 15_000;

/**
 * Loads the event configuration + status from the backend, keeps it fresh through Supabase Realtime
 * (pushes lobby -> live -> ended to every client at once) and a slow poll as a safety net.
 * Children only render once the first load succeeds, so no page ever sees placeholder event data.
 */
export function EventProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [failed, setFailed] = useState(false);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const next = await api.event();
      if (!alive.current) return;
      setEvent((prev) => (prev && JSON.stringify({ ...prev, serverTime: 0 }) === JSON.stringify({ ...next, serverTime: 0 }) ? prev : next));
      setFailed(false);
    } catch {
      if (alive.current) setFailed(true);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    return () => {
      alive.current = false;
      clearInterval(timer);
    };
  }, [refresh]);

  // Realtime requires an authenticated session (event_config is readable by `authenticated` only).
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("event-config")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_config" }, () => void refresh())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  const value = useMemo(() => (event ? { event, refresh } : null), [event, refresh]);

  if (!value) {
    return (
      <div className="crt-grid crt-scanlines flex min-h-screen flex-col items-center justify-center bg-bg-canvas text-accent-cyan">
        <div className="border border-accent-cyan/30 bg-bg-base/80 p-6 text-center font-mono shadow-[0_0_20px_rgba(56,225,255,0.15)]">
          {failed ? (
            <>
              <p className="text-xs uppercase tracking-widest text-danger">CAN'T REACH THE COMPETITION SERVER</p>
              <button
                onClick={() => void refresh()}
                className="mt-4 border border-accent-cyan px-4 py-2 text-xs uppercase tracking-widest text-accent-cyan hover:bg-accent-cyan/10"
              >
                Retry
              </button>
            </>
          ) : (
            <>
              <div className="mb-3 flex justify-center">
                <PixelSpinner />
              </div>
              <p className="text-xs uppercase tracking-widest text-text-secondary">CONNECTING...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

function useEventContext() {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error("useEvent must be used within an EventProvider");
  return ctx;
}

/** Event configuration (name, rounds, points, timings, languages) and live status. */
export function useEvent(): EventInfo {
  return useEventContext().event;
}

/** Re-fetch the event right now (after an admin action, for instance). */
export function useRefreshEvent() {
  return useEventContext().refresh;
}

export function useEventState(): { status: EventStatus; startedAt: number | null; endedAt: number | null } {
  const { status, startedAt, endedAt } = useEvent();
  return useMemo(() => ({ status, startedAt, endedAt }), [status, startedAt, endedAt]);
}
