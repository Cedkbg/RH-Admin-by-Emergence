import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useUserRoles() {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attendre que l'auth soit pret
    if (authLoading) return;
    
    // Si pas d'utilisateur, pas de roles
    if (!user) { 
      setRoles([]); 
      setLoading(false); 
      return; 
    }
    
    // Fonction asynchrone pour charger les roles
    const fetchRoles = async () => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        
        if (error) {
          console.error("Erreur chargement roles:", error);
          setRoles([]);
        } else {
          setRoles((data || []).map((r: any) => r.role));
        }
      } catch (err) {
        console.error("Exception chargement roles:", err);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRoles();
  }, [user?.id, authLoading]);

  const hasAny = (allowed: string[]) => roles.some((r) => allowed.includes(r));
  return { roles, loading, hasAny };
}
