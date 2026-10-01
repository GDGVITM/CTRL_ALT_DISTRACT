import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import type { Me } from "../lib/types";
import { useAuth } from "./AuthContext";

interface MeContextType {
  /** The signed-in player's server-side profile + participation. Null while loading or signed out. */
  me: Me | null;
  loading: boolean;
  refresh: () => Promise<Me | null>;
}

const MeContext = createContext<MeContextType | undefined>(undefined);

export function MeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setMe(null);
      return null;
    }
    try {
      const next = await api.me();
      setMe(next);
      return next;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setMe(null);
      return;
    }
    setLoading(true);
    void refresh();
  }, [userId, refresh]);

  const value = useMemo(() => ({ me, loading, refresh }), [me, loading, refresh]);
  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}

export function useMe() {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error("useMe must be used within a MeProvider");
  return ctx;
}
