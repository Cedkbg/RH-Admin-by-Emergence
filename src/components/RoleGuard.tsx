import { ReactNode } from "react";
import { useUserRoles } from "@/hooks/useUserRoles";
import { AccessDenied } from "@/components/AccessDenied";

interface Props {
  allowed: string[];
  children: ReactNode;
}

/**
 * Restreint l'accès d'une page aux rôles listés.
 * Timeout de sécurité pour éviter le blocage.
 */
export function RoleGuard({ allowed, children }: Props) {
  const { hasAny, loading } = useUserRoles();

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        Vérification des accès…
      </div>
    );
  }

  const canAccess = hasAny(allowed);
  
  if (!canAccess) {
    return (
      <AccessDenied
        title="Accès restreint"
        message="Cette section est reservée à la Direction, au Manager, à la RH et à l'Assistant de direction. Vous n'etes pas autorisé à y acceder."
      />
    );
  }

  return <>{children}</>;
}
