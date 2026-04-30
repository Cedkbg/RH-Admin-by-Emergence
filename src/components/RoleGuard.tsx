import { ReactNode, useEffect, useState } from "react";
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
  const [timeoutReached, setTimeoutReached] = useState(false);

  // Timeout de 8 secondes - après ça on traite comme agent simple
  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeoutReached(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  // Si loading et pas encore timeout, on affiche le message
  if (loading && !timeoutReached) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        Vérification des accès…
      </div>
    );
  }

  // Si timeout atteint ou pas de rôle, on autorise (sinon ça bloque tout)
  const canAccess = !loading && hasAny(allowed);
  
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
