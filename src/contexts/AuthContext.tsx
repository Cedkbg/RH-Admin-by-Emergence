import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
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

/**
 * AuthProvider robuste :
 *  - Ne bloque JAMAIS l'UI plus de 3s sur le check initial
 *  - Détecte et purge les tokens JWT orphelins (user supprimé en BDD)
 *  - Charge les rôles en arrière-plan SANS bloquer le rendu
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSecretary, setIsSecretary] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const refreshUserData = async (uid: string | undefined) => {
    if (!uid) {
      if (!mountedRef.current) return;
      setIsAdmin(false);
      setIsSecretary(false);
      setApprovalStatus(null);
      return;
    }
    try {
      const [{ data: roles }, { data: profileData }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("profiles").select("approval_status").eq("id", uid).maybeSingle(),
      ]);
      if (!mountedRef.current) return;
      const roleSet = new Set((roles || []).map((r: any) => r.role));
      setIsAdmin(roleSet.has("admin"));
      setIsSecretary(roleSet.has("secretaire") || roleSet.has("admin"));
      setApprovalStatus((profileData?.approval_status as any) ?? "pending");
    } catch (e) {
      console.error("Erreur refreshUserData:", e);
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    // Filet de sécurité ABSOLU : après 3s, on débloque l'UI quoi qu'il arrive
    const safety = setTimeout(() => {
      if (mountedRef.current) {
        console.warn("[Auth] Safety timeout — déblocage forcé");
        setLoading(false);
      }
    }, 3000);

    // Listener — IMPORTANT: ne JAMAIS faire d'await ici (sinon deadlock Supabase)
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mountedRef.current) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
      clearTimeout(safety);

      // Charger les rôles en arrière-plan (différé)
      if (newSession?.user?.id) {
        setTimeout(() => { refreshUserData(newSession.user.id); }, 0);
      } else {
        setIsAdmin(false);
        setIsSecretary(false);
        setApprovalStatus(null);
      }
    });

    // Initial check + validation du token (purge si user orphelin)
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mountedRef.current) return;

        if (!data.session) {
          setSession(null);
          setUser(null);
          setLoading(false);
          clearTimeout(safety);
          return;
        }

        // Vérifier que le user existe toujours (sub claim valide)
        const { data: userData, error } = await supabase.auth.getUser();
        if (!mountedRef.current) return;

        if (error || !userData?.user) {
          console.warn("[Auth] Token JWT orphelin détecté — purge");
          // Purge locale uniquement (signOut serveur échouerait)
          await supabase.auth.signOut({ scope: "local" }).catch(() => {});
          setSession(null);
          setUser(null);
          setLoading(false);
          clearTimeout(safety);
          return;
        }

        setSession(data.session);
        setUser(userData.user);
        setLoading(false);
        clearTimeout(safety);
        setTimeout(() => { refreshUserData(userData.user.id); }, 0);
      } catch (e) {
        console.error("[Auth] Erreur init:", e);
        if (mountedRef.current) {
          setLoading(false);
          clearTimeout(safety);
        }
      }
    })();

    return () => {
      mountedRef.current = false;
      clearTimeout(safety);
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
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName },
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    setSession(null);
    setUser(null);
    setIsAdmin(false);
    setIsSecretary(false);
    setApprovalStatus(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, isAdmin, isSecretary, approvalStatus, loading, signIn, signUp, signOut, refreshApproval }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
