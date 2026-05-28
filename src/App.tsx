import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Protected } from "@/components/Protected";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AgentAuth from "./pages/AgentAuth";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Organigramme from "./pages/Organigramme";
import DirectionDetail from "./pages/DirectionDetail";
import Employes from "./pages/Employes";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Recrutement from "./pages/modules/Recrutement";
import Taches from "./pages/modules/Taches";
import Performance from "./pages/modules/Performance";
import Formation from "./pages/modules/Formation";
import Paie from "./pages/modules/Paie";
import Presence from "./pages/modules/Presence";
import Documents from "./pages/modules/Documents";
import Juridique from "./pages/modules/Juridique";
import Communication from "./pages/modules/Communication";
import Talents from "./pages/modules/Talents";
import BienEtre from "./pages/modules/BienEtre";
import Rapports from "./pages/modules/Rapports";
import Securite from "./pages/modules/Securite";
import Parametres from "./pages/modules/Parametres";
import Secretariat from "./pages/modules/Secretariat";
import Assistant from "./pages/modules/Assistant";
import ManagerGeneral from "./pages/ManagerGeneral";
import AdminCabinets from "./pages/AdminCabinets";
import PresenceKiosk from "./pages/PresenceKiosk";
import PresenceScan from "./pages/PresenceScan";
import PresenceLocations from "./pages/PresenceLocations";
import Install from "./pages/Install";
import { RoleGuard } from "@/components/RoleGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

/**
 * Détecte un lien d'invitation / réinitialisation Supabase (hash ou query)
 * et redirige IMMÉDIATEMENT vers /reset-password en préservant les tokens.
 * Évite que l'utilisateur soit baladé vers /onboarding ou /auth.
 */
const AuthRedirectGuard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (location.pathname === "/reset-password") return;
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    const isAuthHash =
      /access_token=/.test(hash) ||
      /type=(recovery|invite|signup|magiclink|email_change)/.test(hash) ||
      /type=(recovery|invite|signup|magiclink|email_change)/.test(search) ||
      /code=[\w-]+/.test(search); // PKCE flow
    if (isAuthHash) {
      navigate(`/reset-password${search}${hash}`, { replace: true });
    }
  }, [location.pathname, navigate]);
  return null;
};

// Rôles autorisés à accéder aux modules opérationnels (Recrutement → Paramètres)
// Le secrétaire est inclus pour pouvoir accéder à son espace (/secretariat) et aux modules
// transversaux (documents, juridique, communication, paramètres) — sinon écran blanc/refusé.
const OPS_ROLES = ["admin", "dg", "dga", "manager", "rh", "assistant_direction", "secretaire"];
const Ops = ({ children }: { children: JSX.Element }) => (
  <RoleGuard allowed={OPS_ROLES}>{children}</RoleGuard>
);

// Modules opérationnels terrain : masqués au DG/DGA/Secrétaire (cabinet exécutif)
// pour préserver l'autonomie des équipes. Manager, RH, Assistant de direction y accèdent.
const FIELD_ROLES = ["admin", "manager", "rh", "assistant_direction"];
const Field = ({ children }: { children: JSX.Element }) => (
  <RoleGuard allowed={FIELD_ROLES}>{children}</RoleGuard>
);
// Module Présence : accessible aux agents en plus du staff terrain
const PRESENCE_ROLES = [...FIELD_ROLES, "employee"];
const PresenceGuard = ({ children }: { children: JSX.Element }) => (
  <RoleGuard allowed={PRESENCE_ROLES}>{children}</RoleGuard>
);
// Pages structurelles (organigramme, employés, cabinets, install) : staff uniquement
const STAFF_ROLES = ["admin", "dg", "dga", "manager", "rh", "secretaire", "assistant_direction"];
const Staff = ({ children }: { children: JSX.Element }) => (
  <RoleGuard allowed={STAFF_ROLES}>{children}</RoleGuard>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthRedirectGuard />
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/agent/login" element={<AgentAuth />} />
              <Route path="/login" element={<AgentAuth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/presence/kiosk/:locationId" element={<PresenceKiosk />} />
              <Route element={<Protected><AppLayout /></Protected>}>
                <Route index element={<ErrorBoundary><Index /></ErrorBoundary>} />
                <Route path="/organigramme" element={<Staff><Organigramme /></Staff>} />
                <Route path="/direction/:code" element={<DirectionDetail />} />
                <Route path="/employes" element={<Staff><Employes /></Staff>} />
                <Route path="/install" element={<Staff><Install /></Staff>} />
                <Route path="/recrutement" element={<Ops><Recrutement /></Ops>} />
                <Route path="/taches" element={<Field><Taches /></Field>} />
                <Route path="/performance" element={<Ops><Performance /></Ops>} />
                <Route path="/formation" element={<Ops><Formation /></Ops>} />
                <Route path="/paie" element={<Ops><Paie /></Ops>} />
                <Route path="/presence" element={<PresenceGuard><Presence /></PresenceGuard>} />
                <Route path="/presence/scan" element={<PresenceScan />} />
                <Route path="/presence/locations" element={<Field><PresenceLocations /></Field>} />
                <Route path="/documents" element={<Ops><Documents /></Ops>} />
                <Route path="/juridique" element={<Ops><Juridique /></Ops>} />
                <Route path="/communication" element={<Communication />} />
                <Route path="/talents" element={<Ops><Talents /></Ops>} />
                <Route path="/bien-etre" element={<Field><BienEtre /></Field>} />
                <Route path="/rapports" element={<Ops><Rapports /></Ops>} />
                <Route path="/securite" element={<Ops><Securite /></Ops>} />
                <Route path="/secretariat" element={<Ops><Secretariat /></Ops>} />
                <Route path="/assistant" element={<Ops><Assistant /></Ops>} />
                <Route path="/manager" element={<Ops><ManagerGeneral /></Ops>} />
                <Route path="/parametres" element={<Ops><Parametres /></Ops>} />
                <Route path="/admin/cabinets" element={<Staff><AdminCabinets /></Staff>} />
                <Route path="/admin" element={<Protected adminOnly><Admin /></Protected>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
