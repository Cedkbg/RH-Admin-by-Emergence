import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Navigate, useLocation } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";
import { getSetupStatus } from "@/lib/setupStatus";

export const Protected = ({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) => {
  const { session, loading, rolesLoading, isAdmin } = useAuth();
  const { needsOnboarding, loading: onboardingLoading } = useOnboarding();
  const location = useLocation();
  const [companyChecked, setCompanyChecked] = useState(false);
  const [companyConfigured, setCompanyConfigured] = useState(true);
  const [forceReady, setForceReady] = useState(false);

  // Filet de sécurité court : 1.2s max, sinon on débloque l'UI
  useEffect(() => {
    const timer = setTimeout(() => {
      setForceReady(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (session) { setCompanyChecked(true); return; }
    
    const checkCompany = async () => {
      try {
        const setupStatus = await getSetupStatus();
        setCompanyConfigured(setupStatus.adminExists);
      } catch (e) {
        console.error("Erreur Protected:", e);
        setCompanyConfigured(true); // En cas d'erreur, on considere configure
      } finally {
        setCompanyChecked(true);
      }
    };
    
    checkCompany();
  }, [session]);

  // Si timeout atteint, autoriser l'acces
  if (forceReady) {
    if (!session) {
      if (!companyConfigured) {
        return <Navigate to="/onboarding" replace />;
      }
      return <Navigate to="/agent/login" replace state={{ from: location }} />;
    }
    if (adminOnly && rolesLoading) {
      return (
        <div className="flex h-screen items-center justify-center text-muted-foreground">
          Vérification des accès…
        </div>
      );
    }
    if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
    return <>{children}</>;
  }

  // Si loading auth ou onboarding en cours
  if (loading || (session && onboardingLoading) || (!session && !companyChecked)) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Chargement...
      </div>
    );
  }

  if (!session) {
    if (!companyConfigured) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/agent/login" replace state={{ from: location }} />;
  }

  if (needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  if (adminOnly) {
    if (rolesLoading) {
      return (
        <div className="flex h-screen items-center justify-center text-muted-foreground">
          Vérification des accès…
        </div>
      );
    }
    if (!isAdmin) return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
