-- can_access_direction est appelée depuis le client (useDirectionAccess via supabase.rpc),
-- elle a besoin de EXECUTE pour authenticated. Sans ça, tous les agents perdent l'accès
-- à la page de leur direction (refus côté RPC, pas RLS).
GRANT EXECUTE ON FUNCTION public.can_access_direction(uuid, text) TO authenticated;