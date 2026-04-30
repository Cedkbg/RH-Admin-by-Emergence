import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSecretary, setIsSecretary] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUserData = async (uid: string | undefined) => {
    if (!uid) {
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
      const roleSet = new Set((roles || []).map((r: any) => r.role));
      setIsAdmin(roleSet.has("admin"));
      setIsSecretary(roleSet.has("secretaire") || roleSet.has("admin"));
      setApprovalStatus((profileData?.approval_status as any) ?? "pending");
    } catch (e) {
      console.error("Erreur refreshUserData:", e);
      setIsAdmin(false);
      setIsSecretary(false);
      setApprovalStatus(null);
    }
  };

  // Gestionnaire avec timeout de securite
  useEffect(() => {
    let isMounted = true;
    
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      // Timeout de 5 secondes pour chaque changement d'etat auth
      const timer = setTimeout(() => {
        if (isMounted) setLoading(false);
      }, 5000);
      
      if (newSession?.user?.id) {
        refreshUserData(newSession.user.id).finally(() => {
          if (isMounted) {
            clearTimeout(timer);
            setLoading(false);
          }
        });
      } else {
        clearTimeout(timer);
        if (isMounted) {
          refreshUserData(undefined);
          setLoading(false);
        }
      }
    });

    // Initial session check avec timeout
    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      
      if (!data.session) {
        setSession(null);
        setUser(null);
        await refreshUserData(undefined);
        setLoading(false);
        return;
      }

      const { data: userData, error } = await supabase.auth.getUser();
      if (error || !userData?.user) {
        console.error("Erreur getUser:", error);
        await supabase.auth.signOut({ scope: "local" });
        setSession(null);
        setUser(null);
        await refreshUserData(undefined);
        setLoading(false);
        return;
      }

      setSession(data.session);
      setUser(userData.user);
      refreshUserData(userData.user.id).finally(() => setLoading(false));
    });

    return () => {
      isMounted = false;
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
    if (error) await supabase.auth.signOut({ scope: "local" });
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
