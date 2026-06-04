import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  roles: string[];
  rolesLoading: boolean;
  isAdmin: boolean;
  isSecretary: boolean;
  approvalStatus: "pending" | "approved" | "rejected" | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshApproval: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const sleep = (ms: number) => new Promise<null>((resolve) => setTimeout(() => resolve(null), ms));

const withTimeout = async <T,>(promise: PromiseLike<T>, ms: number): Promise<T | null> => {
  return Promise.race([promise, sleep(ms)]) as Promise<T | null>;
};

/**
 * Lecture directe de la session depuis localStorage — contourne le
 * "navigator lock" de Supabase qui se bloque sur iOS Safari (Strict Mode +
 * onglets multiples). On évite ainsi tout appel à getSession() au boot.
 */
const readStoredSession = (): Session | null => {
  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const key = `sb-${projectId}-auth-token`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Format Supabase v2 : { access_token, refresh_token, expires_at, user, ... }
    if (parsed?.access_token && parsed?.user) return parsed as Session;
    // Format wrapper { currentSession: {...} }
    if (parsed?.currentSession?.access_token) return parsed.currentSession as Session;
    return null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const initial = readStoredSession();
  const [session, setSession] = useState<Session | null>(initial);
  const [user, setUser] = useState<User | null>(initial?.user ?? null);
  const [roles, setRoles] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState(!!initial);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSecretary, setIsSecretary] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  const refreshUserData = async (uid: string | undefined) => {
    if (!uid) {
      if (!mountedRef.current) return;
      setRoles([]); setRolesLoading(false); setIsAdmin(false);
      setIsSecretary(false); setApprovalStatus(null);
      return;
    }
    setRolesLoading(true);
    let keepLoadingForRetry = false;
    try {
      const result = await withTimeout(
        Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", uid),
          supabase.from("profiles").select("approval_status").eq("id", uid).maybeSingle(),
        ]),
        6000
      );
      if (!mountedRef.current) return;
      if (!result) {
        console.warn("Lecture des rôles trop lente, nouvel essai…");
        keepLoadingForRetry = true;
        window.setTimeout(() => {
          if (mountedRef.current) refreshUserData(uid);
        }, 1200);
        return;
      }
      const [{ data: roleRows }, { data: profileData }] = result;
      const roleSet = new Set<string>(
        (roleRows || [])
          .map((r: { role: string | null }) => r.role)
          .filter((role): role is string => Boolean(role))
      );
      if (roleSet.size === 0) roleSet.add("employee");
      setRoles(Array.from(roleSet));
      setIsAdmin(roleSet.has("admin"));
      setIsSecretary(roleSet.has("secretaire") || roleSet.has("admin"));
      setApprovalStatus((profileData?.approval_status as "pending" | "approved" | "rejected" | null) ?? "pending");
    } catch (e) {
      console.error("Erreur refreshUserData:", e);
      if (mountedRef.current) {
        setRoles((current) => current);
        setApprovalStatus((current) => current ?? "pending");
        keepLoadingForRetry = true;
        window.setTimeout(() => {
          if (mountedRef.current) refreshUserData(uid);
        }, 1500);
      }
    } finally {
      if (mountedRef.current && !keepLoadingForRetry) setRolesLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    // Charger les rôles si on a une session initiale (depuis localStorage)
    if (initial?.user?.id) {
      setTimeout(() => refreshUserData(initial.user.id), 0);
    }

    // Listener : ne JAMAIS await ici (deadlock Supabase)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mountedRef.current) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
      if (newSession?.user?.id) {
        setRolesLoading(true);
        setTimeout(() => refreshUserData(newSession.user.id), 0);
      } else {
        setRoles([]); setRolesLoading(false); setIsAdmin(false);
        setIsSecretary(false); setApprovalStatus(null);
      }
    });

    return () => {
      mountedRef.current = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refreshApproval = async () => { await refreshUserData(user?.id); };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setLoading(false);
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: redirectUrl, data: { full_name: fullName } },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    setSession(null); setUser(null); setRoles([]); setRolesLoading(false);
    setIsAdmin(false); setIsSecretary(false); setApprovalStatus(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, roles, rolesLoading, isAdmin, isSecretary, approvalStatus, loading, signIn, signUp, signOut, refreshApproval }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
