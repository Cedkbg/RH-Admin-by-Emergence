import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { Clock, ShieldX, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Protected = ({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) => {
  const { session, isAdmin, approvalStatus, loading, signOut, refreshApproval } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Chargement…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // Account approval gate (admin always passes)
  if (!isAdmin && approvalStatus === "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
            <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold">Compte en attente</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Votre compte a bien été créé. L'Admin RH d'EMERGENCE DRC doit l'approuver avant que vous puissiez accéder au logiciel.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Vous serez notifié dès que votre accès sera activé.
          </p>
          <div className="mt-6 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={refreshApproval}>
              <RefreshCw className="mr-2 h-4 w-4" /> Vérifier
            </Button>
            <Button variant="outline" className="flex-1" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" /> Déconnexion
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin && approvalStatus === "rejected") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <ShieldX className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold">Accès refusé</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Votre demande d'accès à EMERGENCE DRC a été refusée par l'Admin RH.
            Veuillez les contacter pour plus d'informations.
          </p>
          <Button variant="outline" className="mt-6 w-full" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </div>
    );
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
