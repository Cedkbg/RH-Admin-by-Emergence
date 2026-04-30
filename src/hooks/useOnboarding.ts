import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Determine si l'utilisateur courant doit passer par le wizard d'onboarding.
 * Timeout de securite pour eviter le blocage infini.
 */
export function useOnboarding() {
  const { user, loading: authLoading } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) {
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    
    try {
      const [{ data: settings }, { data: profile }] = await Promise.all([
        supabase.from("app_settings").select("key,value").eq("key", "company_onboarded").maybeSingle(),
        supabase.from("profiles").select("onboarding_completed").eq("id", user.id).maybeSingle(),
      ]);
      
      const companyDone = (() => {
        const v: any = settings?.value;
        if (v === true) return true;
        if (typeof v === "object" && v?.value === true) return true;
        return false;
      })();
      
      const userDone = !!profile?.onboarding_completed;
      setNeedsOnboarding(!(companyDone && userDone));
    } catch (e) {
      console.error("Erreur useOnboarding:", e);
      setNeedsOnboarding(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    
    // Timeout de 4 secondes
    const timer = setTimeout(() => {
      setLoading(false);
    }, 4000);
    
    refresh();
    
    return () => clearTimeout(timer);
  }, [user?.id, authLoading]);

  return { needsOnboarding, loading, refresh };
}
