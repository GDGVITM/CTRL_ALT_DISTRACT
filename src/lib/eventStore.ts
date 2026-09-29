import { useMemo, useSyncExternalStore } from "react";

export type EventStatus = "lobby" | "live" | "ended";

interface EventState {
  status: EventStatus;
  startedAt: number | null;
  endedAt: number | null;
}

const KEY = "cao-event-state";
const DEFAULT: EventState = { status: "lobby", startedAt: null, endedAt: null };
const listeners = new Set<() => void>();

function readRaw(): string {
  try {
    return localStorage.getItem(KEY) ?? JSON.stringify(DEFAULT);
  } catch {
    return JSON.stringify(DEFAULT);
  }
}

function write(state: EventState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable: demo state just won't persist */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useEventState(): EventState {
  const raw = useSyncExternalStore(subscribe, readRaw, () => JSON.stringify(DEFAULT));
  return useMemo(() => JSON.parse(raw) as EventState, [raw]);
}

export const eventActions = {
  start: () => write({ status: "live", startedAt: Date.now(), endedAt: null }),
  end: () => {
    const cur = JSON.parse(readRaw()) as EventState;
    write({ ...cur, status: "ended", endedAt: Date.now() });
  },
  reset: () => write(DEFAULT),
};
