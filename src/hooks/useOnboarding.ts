import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Détermine si l'utilisateur courant doit passer par le wizard d'onboarding.
 * - Tant que `app_settings.company_onboarded` n'est pas `true`, l'onboarding est requis.
 * - Si le profil de l'utilisateur a déjà `onboarding_completed = true`, on ne le force pas
 *   (utile pour les comptes seed et l'admin déjà passé par là).
 */
export function useOnboarding() {
  const { user, loading: authLoading } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) { setNeedsOnboarding(false); setLoading(false); return; }
    setLoading(true);
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
    setNeedsOnboarding(!companyDone || (profile ? !userDone : false));
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  return { needsOnboarding, loading, refresh };
}
