import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Protected } from "@/components/Protected";
import { RoleGuard } from "@/components/RoleGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Pages d'auth chargées tout de suite (entrée de l'app)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AgentAuth from "./pages/AgentAuth";
import NotFound from "./pages/NotFound";

// Tout le reste est lazy → bundle initial fortement réduit
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Organigramme = lazy(() => import("./pages/Organigramme"));
const DirectionDetail = lazy(() => import("./pages/DirectionDetail"));
const Employes = lazy(() => import("./pages/Employes"));
const Admin = lazy(() => import("./pages/Admin"));
const Recrutement = lazy(() => import("./pages/modules/Recrutement"));
const Taches = lazy(() => import("./pages/modules/Taches"));
const Performance = lazy(() => import("./pages/modules/Performance"));
const Formation = lazy(() => import("./pages/modules/Formation"));
const Paie = lazy(() => import("./pages/modules/Paie"));
const Presence = lazy(() => import("./pages/modules/Presence"));
const Documents = lazy(() => import("./pages/modules/Documents"));
const Juridique = lazy(() => import("./pages/modules/Juridique"));
const Communication = lazy(() => import("./pages/modules/Communication"));
const Talents = lazy(() => import("./pages/modules/Talents"));
const BienEtre = lazy(() => import("./pages/modules/BienEtre"));
const Rapports = lazy(() => import("./pages/modules/Rapports"));
const Securite = lazy(() => import("./pages/modules/Securite"));
const Parametres = lazy(() => import("./pages/modules/Parametres"));
const Secretariat = lazy(() => import("./pages/modules/Secretariat"));
const Assistant = lazy(() => import("./pages/modules/Assistant"));
const ManagerGeneral = lazy(() => import("./pages/ManagerGeneral"));
const AdminCabinets = lazy(() => import("./pages/AdminCabinets"));
const PresenceKiosk = lazy(() => import("./pages/PresenceKiosk"));
const PresenceScan = lazy(() => import("./pages/PresenceScan"));
const PresenceLocations = lazy(() => import("./pages/PresenceLocations"));
const Install = lazy(() => import("./pages/Install"));
const MesConges = lazy(() => import("./pages/MesConges"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageFallback = () => (
  <div className="flex items-center justify-center py-20 text-muted-foreground">
    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement…
  </div>
);

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
      /code=[\w-]+/.test(search);
    if (isAuthHash) {
      navigate(`/reset-password${search}${hash}`, { replace: true });
    }
  }, [location.pathname, navigate]);
  return null;
};

const OPS_ROLES = ["admin", "dg", "dga", "manager", "rh", "assistant_direction", "secretaire"];
const Ops = ({ children }: { children: JSX.Element }) => (
  <RoleGuard allowed={OPS_ROLES}>{children}</RoleGuard>
);
const FIELD_ROLES = ["admin", "manager", "rh", "assistant_direction"];
const Field = ({ children }: { children: JSX.Element }) => (
  <RoleGuard allowed={FIELD_ROLES}>{children}</RoleGuard>
);
const PRESENCE_ROLES = [...FIELD_ROLES, "employee"];
const PresenceGuard = ({ children }: { children: JSX.Element }) => (
  <RoleGuard allowed={PRESENCE_ROLES}>{children}</RoleGuard>
);
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
            <Suspense fallback={<PageFallback />}>
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
                  <Route path="/taches" element={<Taches />} />
                  <Route path="/performance" element={<Ops><Performance /></Ops>} />
                  <Route path="/formation" element={<Ops><Formation /></Ops>} />
                  <Route path="/paie" element={<Ops><Paie /></Ops>} />
                  <Route path="/presence" element={<PresenceGuard><Presence /></PresenceGuard>} />
                  <Route path="/presence/scan" element={<PresenceScan />} />
                  <Route path="/mes-conges" element={<MesConges />} />
                  <Route path="/presence/locations" element={<Field><PresenceLocations /></Field>} />
                  <Route path="/documents" element={<Ops><Documents /></Ops>} />
                  <Route path="/juridique" element={<Ops><Juridique /></Ops>} />
                  <Route path="/communication" element={<Communication />} />
                  <Route path="/talents" element={<Ops><Talents /></Ops>} />
                  <Route path="/bien-etre" element={<BienEtre />} />
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
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
