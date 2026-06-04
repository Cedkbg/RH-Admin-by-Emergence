import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns whether the current user has executive access to a direction.
 * Allowed: admin, dg (everywhere), dga (everywhere except DG),
 * or a direct direction_executives assignment to that direction.
 */
export function useDirectionAccess(directionCode: string | undefined) {
  const { user, isAdmin, loading: authLoading, rolesLoading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading || rolesLoading) return;
    if (!directionCode) { setAllowed(false); return; }
    if (!user) { setAllowed(false); return; }
    if (isAdmin) { setAllowed(true); return; }

    (async () => {
      const { data, error } = await supabase.rpc("can_access_direction", {
        _user_id: user.id,
        _direction_code: directionCode,
      });
      if (error) { setAllowed(false); return; }
      setAllowed(Boolean(data));
    })();
  }, [user?.id, isAdmin, authLoading, rolesLoading, directionCode]);

  return { allowed, loading: allowed === null };
}
