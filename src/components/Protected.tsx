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

  useEffect(() => {
    if (session) { setCompanyChecked(true); return; }
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "company_onboarded")
        .maybeSingle();
      const v: any = data?.value;
      const done = v === true || (typeof v === "object" && v?.value === true);
      setCompanyConfigured(!!done);
      setCompanyChecked(true);
    })();
  }, [session]);

  if (loading || (session && onboardingLoading) || (!session && !companyChecked)) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Chargement…
      </div>
    );
  }

  if (!session) {
    if (!companyConfigured) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  if (needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
