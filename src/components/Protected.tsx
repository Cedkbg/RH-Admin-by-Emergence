import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";

export const Protected = ({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) => {
  const { session, loading } = useAuth();
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

  // No more approval gate, no more admin-only gate — every signed-in user has full access.
  return <>{children}</>;
};
