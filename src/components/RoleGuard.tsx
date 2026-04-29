import { ReactNode } from "react";
import { useUserRoles } from "@/hooks/useUserRoles";
import { AccessDenied } from "@/components/AccessDenied";

interface Props {
  allowed: string[];
  children: ReactNode;
}

/**
 * Restreint l'accès d'une page aux rôles listés.
 * Les utilisateurs sans rôle autorisé voient un écran "Accès restreint".
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

  if (!hasAny(allowed)) {
    return (
      <AccessDenied
        title="Accès restreint"
        message="Cette section est réservée à la Direction, au Manager, à la RH et à l'Assistant de direction. Vous n'êtes pas autorisé à y accéder."
      />
    );
  }

  return <>{children}</>;
}
