import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useUserRoles() {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setRoles([]); setLoading(false); return; }
    (async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      setRoles((data || []).map((r: any) => r.role));
      setLoading(false);
    })();
  }, [user?.id, authLoading]);

  const hasAny = (allowed: string[]) => roles.some((r) => allowed.includes(r));
  return { roles, loading, hasAny };
}
