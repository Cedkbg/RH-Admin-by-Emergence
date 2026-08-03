import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Organization = {
  id: string;
  name: string;
  legal_name: string | null;
  slug: string | null;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  rccm: string | null;
  id_national: string | null;
  tax_number: string | null;
  currency: string;
  active: boolean;
};

/**
 * Entreprise (tenant) de l'utilisateur connecté + statut super-admin plateforme.
 */
export function useOrganization() {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setOrganization(null);
      setIsPlatformAdmin(false);
      setLoading(false);
      return;
    }
    try {
      const [{ data: member }, { data: platform }] = await Promise.all([
        supabase.from("organization_members").select("organization_id").eq("user_id", user.id).maybeSingle(),
        supabase.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
      ]);
      setIsPlatformAdmin(Boolean(platform));

      const orgId = (member as any)?.organization_id;
      if (orgId) {
        const { data: org } = await supabase.from("organizations").select("*").eq("id", orgId).maybeSingle();
        setOrganization((org as any) ?? null);
      } else {
        setOrganization(null);
      }
    } catch (e) {
      console.error("useOrganization:", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  return { organization, isPlatformAdmin, loading, refresh: load };
}
