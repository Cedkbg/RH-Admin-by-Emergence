import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";

export const Protected = ({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) => {
  const { session, loading } = useAuth();
  const { needsOnboarding, loading: onboardingLoading } = useOnboarding();
  const location = useLocation();

  if (loading || (session && onboardingLoading)) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Chargement…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  if (needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
