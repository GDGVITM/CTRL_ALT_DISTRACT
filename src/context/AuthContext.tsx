import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, getUserProfile, type UserProfile, type UserRole } from "../lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole;
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

  const fetchProfile = async (currentUser: User) => {
    const prof = await getUserProfile(currentUser.id);
    if (prof) {
      setProfile(prof);
    } else {
      // Fallback to app_metadata or user_metadata
      const metaRole = (currentUser.app_metadata?.role || currentUser.user_metadata?.role || "participant") as UserRole;
      setProfile({
        id: currentUser.id,
        email: currentUser.email || "",
        role: metaRole,
        full_name: currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "Player",
      });
    }
  };

  useEffect(() => {
    // Initial session retrieval
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await fetchProfile(newSession.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  const role: UserRole = profile?.role || (user?.app_metadata?.role as UserRole) || (user?.user_metadata?.role as UserRole) || "participant";
  const fullName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Player";
  const firstName = fullName.trim().split(/\s+/)[0] || "Player";
  const initials = fullName
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
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
