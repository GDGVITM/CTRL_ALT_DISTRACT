import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, getUserProfile, type ApprovalStatus, type UserProfile, type UserRole } from "../lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  fullName: string;
  firstName: string;
  initials: string;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileRequest = useRef(0);
  const activeUserId = useRef<string | null>(null);

  const fetchProfile = async (currentUser: User) => {
    const request = ++profileRequest.current;
    const prof = await getUserProfile(currentUser.id);
    if (request === profileRequest.current) {
      setProfile(prof);
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    const syncSession = (next: Session | null) => {
      const request = ++profileRequest.current;
      const changedUser = activeUserId.current !== (next?.user.id ?? null);
      activeUserId.current = next?.user.id ?? null;
      setSession(next);
      setUser(next?.user ?? null);
      if (changedUser || !next?.user) {
        setProfile(null);
        setLoading(!!next?.user);
      }
      if (!next?.user) return;
      // Supabase auth callbacks hold an internal lock. Fetch after the callback returns.
      window.setTimeout(() => {
        void getUserProfile(next.user.id).then((prof) => {
          if (alive && request === profileRequest.current) {
            setProfile(prof);
            setLoading(false);
          }
        });
      }, 0);
    };
    const initialRequest = profileRequest.current;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (alive && initialRequest === profileRequest.current) syncSession(session);
    }).catch(() => {
      if (alive && initialRequest === profileRequest.current) syncSession(null);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (alive) syncSession(newSession);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      ++profileRequest.current;
      activeUserId.current = null;
      setUser(null);
      setSession(null);
      setProfile(null);
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  const role: UserRole = profile?.role ?? "participant";
  const approvalStatus: ApprovalStatus = profile?.approval_status ?? "pending";
  const fullName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Player";
  const firstName = fullName.trim().split(/\s+/)[0] || "Player";
  const initials = fullName
    .trim()
    .split(/\s+/)
    .map((w: string) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "P1";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        approvalStatus,
        fullName,
        firstName,
        initials,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
