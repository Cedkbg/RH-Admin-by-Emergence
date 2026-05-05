import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Navigate, useLocation } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Protected = ({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) => {
  const { session, loading } = useAuth();
  const { needsOnboarding, loading: onboardingLoading } = useOnboarding();
  const location = useLocation();
  const [companyChecked, setCompanyChecked] = useState(false);
  const [companyConfigured, setCompanyConfigured] = useState(true);
  const [forceReady, setForceReady] = useState(false);

  // Filet de sécurité : 3s max, sinon on débloque l'UI
  useEffect(() => {
    const timer = setTimeout(() => {
      console.warn("Protected: timeout atteint, continuation forcee");
      setForceReady(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (session) { setCompanyChecked(true); return; }
    
    const checkCompany = async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "company_onboarded")
          .maybeSingle();
        
        const v: any = data?.value;
        const done = v === true || (typeof v === "object" && v?.value === true);
        
        if (done) {
          setCompanyConfigured(true);
        } else {
          const { count } = await supabase
            .from("user_roles")
            .select("id", { count: "exact", head: true })
            .eq("role", "admin");
          setCompanyConfigured((count ?? 0) > 0);
        }
      } catch (e) {
        console.error("Erreur Protected:", e);
        setCompanyConfigured(true); // En cas d'erreur, on considere configure
      } finally {
        setCompanyChecked(true);
      }
    };
    
    checkCompany();
  }, [session]);

  // Si timeout atteint, autoriser l'acces
  if (forceReady) {
    if (!session) {
      if (!companyConfigured) {
        return <Navigate to="/onboarding" replace />;
      }
      return <Navigate to="/agent/login" replace state={{ from: location }} />;
    }
    return <>{children}</>;
  }

  // Si loading auth ou onboarding en cours
  if (loading || (session && onboardingLoading) || (!session && !companyChecked)) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Chargement...
      </div>
    );
  }

  if (!session) {
    if (!companyConfigured) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/agent/login" replace state={{ from: location }} />;
  }

  if (needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
