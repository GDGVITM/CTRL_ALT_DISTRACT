import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { api, ApiError } from "../../lib/api";
import type { ScreenGuardReason } from "./CompetitionScreenGuard";

const MAX_PENDING = 64;
const MAX_ATTEMPTS = 6;
const MAX_AGE_MS = 10 * 60_000;
const RETRY_TICK_MS = 5_000;
const SAME_REASON_GAP_MS = 3_100;

interface PendingIncident {
  id: number;
  reason: ScreenGuardReason;
  createdAt: number;
  attempts: number;
  nextAttemptAt: number;
}

/** Best-effort warning delivery survives brief disconnects without locking coding. */
export function usePolicyRiskLog(userId: string | null) {
  const owner = useRef<string | null>(userId);
  const pending = useRef<PendingIncident[]>([]);
  const sending = useRef(false);
  const nextId = useRef(0);
  const lastDelivered = useRef(new Map<ScreenGuardReason, number>());
  const mounted = useRef(true);
  const [pendingCount, setPendingCount] = useState(0);

  useLayoutEffect(() => {
    if (owner.current === userId) return;
    owner.current = userId;
    pending.current = [];
    lastDelivered.current.clear();
    setPendingCount(0);
  }, [userId]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const flush = useCallback(async () => {
    if (sending.current || !owner.current || !navigator.onLine) return;
    const requestOwner = owner.current;
    sending.current = true;
    try {
      while (mounted.current && owner.current === requestOwner && navigator.onLine) {
        const now = Date.now();
        pending.current = pending.current.filter((item) =>
          item.attempts < MAX_ATTEMPTS && now - item.createdAt < MAX_AGE_MS,
        );
        const item = pending.current.find((incident) =>
          incident.nextAttemptAt <= now
          && now - (lastDelivered.current.get(incident.reason) ?? 0) >= SAME_REASON_GAP_MS,
        );
        if (!item) break;
        item.attempts += 1;
        try {
          await api.reportProctor("RISK_CHEATING", undefined, item.reason);
          if (owner.current !== requestOwner || !mounted.current) break;
          lastDelivered.current.set(item.reason, Date.now());
          pending.current = pending.current.filter((incident) => incident.id !== item.id);
        } catch (error) {
          if (owner.current !== requestOwner || !mounted.current) break;
          const transient = !(error instanceof ApiError) || error.isNetwork
            || error.status === 429 || error.status >= 500;
          if (!transient) {
            pending.current = pending.current.filter((incident) => incident.id !== item.id);
          } else {
            item.nextAttemptAt = Date.now() + Math.min(60_000, RETRY_TICK_MS * 2 ** (item.attempts - 1));
          }
        }
      }
    } finally {
      sending.current = false;
      if (mounted.current) setPendingCount(pending.current.length);
    }
  }, []);

  const logViolation = useCallback((reason: ScreenGuardReason) => {
    if (!owner.current) return;
    const now = Date.now();
    pending.current = pending.current.filter((item) => now - item.createdAt < MAX_AGE_MS);
    // Keep recent incidents in a bounded in-memory queue; nothing persists across accounts.
    if (pending.current.length >= MAX_PENDING) pending.current.shift();
    pending.current.push({ id: ++nextId.current, reason, createdAt: now, attempts: 0, nextAttemptAt: now });
    setPendingCount(pending.current.length);
    void flush();
  }, [flush]);

  useEffect(() => {
    if (!pendingCount || !userId) return;
    const retryOnline = () => {
      for (const item of pending.current) item.nextAttemptAt = 0;
      void flush();
    };
    const timer = window.setInterval(() => void flush(), RETRY_TICK_MS);
    window.addEventListener("online", retryOnline);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", retryOnline);
    };
  }, [pendingCount, userId, flush]);

  return logViolation;
}
