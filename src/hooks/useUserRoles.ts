import { useAuth } from "@/contexts/AuthContext";

export function useUserRoles() {
  const { roles, rolesLoading } = useAuth();

  const hasAny = (allowed: string[]) => roles.some((r) => allowed.includes(r));
  return { roles, loading: rolesLoading, hasAny };
}
