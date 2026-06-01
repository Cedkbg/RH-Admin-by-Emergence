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

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * AuthProvider robuste :
 *  - Ne bloque JAMAIS l'UI plus de 3s sur le check initial
 *  - Détecte et purge les tokens JWT orphelins (user supprimé en BDD)
 *  - Charge les rôles en arrière-plan SANS bloquer le rendu
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSecretary, setIsSecretary] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const currentUserIdRef = useRef<string | null>(null);
  const rolesLoadedRef = useRef(false);

  const applyUserData = (roleRows: any[] | null | undefined, profileData: any, useEmployeeFallback = false) => {
    if (!mountedRef.current) return;
    const roleSet = new Set<string>((roleRows || []).map((r: any) => r.role).filter(Boolean));
    if (useEmployeeFallback && roleSet.size === 0) roleSet.add("employee");
    setRoles(Array.from(roleSet));
    setIsAdmin(roleSet.has("admin"));
    setIsSecretary(roleSet.has("secretaire") || roleSet.has("admin"));
    setApprovalStatus((profileData?.approval_status as any) ?? "pending");
    rolesLoadedRef.current = true;
    setRolesLoading(false);
  };

  const refreshUserData = async (uid: string | undefined) => {
    if (!uid) {
      if (!mountedRef.current) return;
      currentUserIdRef.current = null;
      rolesLoadedRef.current = false;
      setRoles([]);
      setRolesLoading(false);
      setIsAdmin(false);
      setIsSecretary(false);
      setApprovalStatus(null);
      return;
    }
    setRolesLoading(true);
    try {
      const queryPromise = Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("profiles").select("approval_status").eq("id", uid).maybeSingle(),
      ]);

      const result: any = await Promise.race([
        queryPromise.then((data) => ({ type: "data", data })).catch((error) => ({ type: "error", error })),
        wait(3000).then(() => ({ type: "timeout" })),
      ]);

      if (!mountedRef.current) return;

      if (result.type === "timeout") {
        console.warn("[Auth] Roles timeout iPhone/Safari — affichage agent forcé");
        applyUserData([], null, true);
        queryPromise
          .then(([{ data: lateRoles }, { data: lateProfile }]) => {
            if (mountedRef.current && currentUserIdRef.current === uid) {
              applyUserData(lateRoles, lateProfile, true);
            }
          })
          .catch((e) => console.error("Erreur refreshUserData tardive:", e));
        return;
      }

      if (result.type === "error") throw result.error;
      const [{ data: roles }, { data: profileData }] = result.data;
      applyUserData(roles, profileData, true);
    } catch (e) {
      console.error("Erreur refreshUserData:", e);
      if (mountedRef.current) applyUserData([], null, true);
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

      const nextUserId = newSession?.user?.id ?? null;
      const sameUser = currentUserIdRef.current === nextUserId;
      currentUserIdRef.current = nextUserId;

      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
      clearTimeout(safety);

      // Charger les rôles en arrière-plan (différé)
      if (nextUserId) {
        const shouldRefreshRoles = !sameUser || !rolesLoadedRef.current || event === "SIGNED_IN";
        setRolesLoading(shouldRefreshRoles);
        if (shouldRefreshRoles) setTimeout(() => { refreshUserData(nextUserId); }, 0);
      } else {
        rolesLoadedRef.current = false;
        setRoles([]);
        setRolesLoading(false);
        setIsAdmin(false);
        setIsSecretary(false);
        setApprovalStatus(null);
      }
    });

    // Initial check + validation du token (purge si user orphelin)
    (async () => {
      try {
        const sessionResult: any = await Promise.race([
          supabase.auth.getSession().then((result) => ({ type: "data", result })).catch((error) => ({ type: "error", error })),
          wait(2500).then(() => ({ type: "timeout" })),
        ]);
        if (!mountedRef.current) return;

        if (sessionResult.type === "timeout") {
          console.warn("[Auth] getSession timeout — déblocage de l'interface");
          setLoading(false);
          setRolesLoading(false);
          clearTimeout(safety);
          return;
        }

        if (sessionResult.type === "error") throw sessionResult.error;
        const { data } = sessionResult.result;

        if (!data.session) {
          currentUserIdRef.current = null;
          rolesLoadedRef.current = false;
          setSession(null);
          setUser(null);
          setRoles([]);
          setRolesLoading(false);
          setLoading(false);
          clearTimeout(safety);
          return;
        }

        // Vérifier que le user existe toujours (sub claim valide)
        // IMPORTANT : ne purger QUE si l'erreur prouve un token invalide.
        // Une erreur réseau transitoire ne doit JAMAIS déconnecter l'utilisateur.
        const userResult: any = await Promise.race([
          supabase.auth.getUser().then((result) => ({ type: "data", result })).catch((error) => ({ type: "error", error })),
          wait(2500).then(() => ({ type: "timeout" })),
        ]);
        if (!mountedRef.current) return;

        const userData = userResult.type === "data" ? userResult.result.data : { user: data.session.user };
        const error = userResult.type === "error" ? userResult.error : null;

        const isInvalidTokenError = (() => {
          if (!error) return false;
          const status = (error as any)?.status;
          const msg = (error?.message || "").toLowerCase();
          if (status === 401 || status === 403) return true;
          return (
            msg.includes("user not found") ||
            msg.includes("user from sub claim") ||
            msg.includes("invalid jwt") ||
            msg.includes("jwt expired") ||
            msg.includes("bad_jwt") ||
            msg.includes("session_not_found")
          );
        })();

        if (isInvalidTokenError) {
          console.warn("[Auth] Token JWT orphelin détecté — purge");
          await supabase.auth.signOut({ scope: "local" }).catch(() => {});
          setSession(null);
          setUser(null);
          setRoles([]);
          setRolesLoading(false);
          setLoading(false);
          clearTimeout(safety);
          return;
        }

        // Si erreur réseau ou inconnue : on garde la session locale (rester connecté)
        // et on tentera de rafraîchir les données plus tard.


        setSession(data.session);
        setUser(userData?.user ?? data.session.user);
        currentUserIdRef.current = userData?.user?.id ?? data.session.user?.id ?? null;
        setRolesLoading(true);
        setLoading(false);
        clearTimeout(safety);
        const uid = userData?.user?.id ?? data.session.user?.id;
        if (uid) setTimeout(() => { refreshUserData(uid); }, 0);

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
    setRoles([]);
    setRolesLoading(false);
    setIsAdmin(false);
    setIsSecretary(false);
    setApprovalStatus(null);
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
