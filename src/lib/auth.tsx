import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { AppState, type AppStateStatus } from "react-native";
import { registerDevicePushToken } from "./push-tokens";
import { queryClient } from "./query-client";
import { isSupabaseConfigured, supabase } from "./supabase";

export type AuthError = Error & { code?: string };

function toAuthError(error: { message: string; code?: string }): AuthError {
  const err = new Error(error.message) as AuthError;
  err.code = error.code;
  return err;
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  sendOtp: (email: string) => Promise<{ error: AuthError | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus("unauthenticated");
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setStatus(data.session ? "authenticated" : "unauthenticated");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setStatus(nextSession ? "authenticated" : "unauthenticated");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Register outside onAuthStateChange — calling Supabase from inside that
  // callback can deadlock / run before the session is usable for RLS.
  const userId = user?.id;
  useEffect(() => {
    console.log("[PUSH DEBUG] auth effect", { status, userId: userId?.slice(0, 8) ?? null });
    if (status !== "authenticated" || !userId) return;

    void registerDevicePushToken(userId);

    const onAppState = (next: AppStateStatus) => {
      if (next === "active") {
        void registerDevicePushToken(userId);
      }
    };
    const sub = AppState.addEventListener("change", onAppState);
    return () => sub.remove();
  }, [status, userId]);

  const configError = () =>
    new Error("Supabase is not configured. Add credentials to .env (see .env.example).");

  const sendOtp = useCallback(async (email: string) => {
    if (!isSupabaseConfigured) return { error: configError() as AuthError };
    const { error } = await supabase.auth.signInWithOtp({ email: normalizeEmail(email) });
    return { error: error ? toAuthError(error) : null };
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    if (!isSupabaseConfigured) return { error: configError() as AuthError };
    const { error } = await supabase.auth.verifyOtp({
      email: normalizeEmail(email),
      token,
      type: "email",
    });
    return { error: error ? toAuthError(error) : null };
  }, []);

  const signOut = useCallback(async () => {
    // Optimistic: flip UI immediately so we never sit on a loader waiting for network.
    setSession(null);
    setUser(null);
    setStatus("unauthenticated");
    queryClient.clear();

    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
  }, []);

  const value = useMemo(
    () => ({
      status,
      session,
      user,
      sendOtp,
      verifyOtp,
      signOut,
    }),
    [status, session, user, sendOtp, verifyOtp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
