import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Détermine si l'utilisateur courant doit passer par le wizard d'onboarding.
 * L'onboarding concerne la configuration entreprise, pas un flag de profil :
 * sinon un admin qui confirme son email après la création reste bloqué ici.
 */
export function useOnboarding() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Tant que l'auth charge, on attend
    if (authLoading) return;

    // Pas d'utilisateur connecté → pas d'onboarding
    if (!user) {
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    // Non-admin → JAMAIS d'onboarding (court-circuit instantané)
    if (!isAdmin) {
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    // Admin uniquement : on vérifie l'état de configuration entreprise
    let cancelled = false;
    const safety = setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
      }
    }, 1000);

    (async () => {
      try {
        const { data: settings } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "company_onboarded")
          .maybeSingle();
        if (cancelled) return;
        const v: any = settings?.value;
        const companyDone = v === true || (typeof v === "object" && v?.value === true);
        setNeedsOnboarding(!companyDone);
      } catch (e) {
        console.error("Erreur useOnboarding:", e);
        if (!cancelled) setNeedsOnboarding(false);
      } finally {
        if (!cancelled) {
          setLoading(false);
          clearTimeout(safety);
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(safety);
    };
  }, [user?.id, isAdmin, authLoading]);

  return { needsOnboarding, loading, refresh: async () => {} };
}
