"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { setAnalyticsUser } from "./analytics";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Use onAuthStateChange exclusively — it fires INITIAL_SESSION immediately
    // on subscription with the current cookie-backed session. We intentionally
    // do NOT call getSession() here: getSession() reads from the local cookie
    // cache without server validation and can return a stale session for the
    // previous user after sign-out, which is the root cause of cross-account
    // data leaking between sessions.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
        setAnalyticsUser(session?.user?.id ?? null);
        if (event === "INITIAL_SESSION") {
          setLoading(false);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (!supabase) return;
    // Clear state immediately so no stale data flashes while waiting for
    // onAuthStateChange(SIGNED_OUT) to propagate through React's render cycle.
    setUser(null);
    setSession(null);
    setAnalyticsUser(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
