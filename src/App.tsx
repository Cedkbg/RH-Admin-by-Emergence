import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Protected } from "@/components/Protected";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
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
import { RoleGuard } from "@/components/RoleGuard";

const queryClient = new QueryClient();

// Rôles autorisés à accéder aux modules opérationnels (Recrutement → Paramètres)
const OPS_ROLES = ["admin", "dg", "dga", "manager", "rh", "assistant_direction"];
const Ops = ({ children }: { children: JSX.Element }) => (
  <RoleGuard allowed={OPS_ROLES}>{children}</RoleGuard>
);

// Modules opérationnels terrain : masqués au DG/DGA/Secrétaire (cabinet exécutif)
// pour préserver l'autonomie des équipes. Manager, RH, Assistant de direction y accèdent.
const FIELD_ROLES = ["admin", "manager", "rh", "assistant_direction"];
const Field = ({ children }: { children: JSX.Element }) => (
  <RoleGuard allowed={FIELD_ROLES}>{children}</RoleGuard>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<Protected><AppLayout /></Protected>}>
              <Route index element={<Index />} />
              <Route path="/organigramme" element={<Organigramme />} />
              <Route path="/direction/:code" element={<DirectionDetail />} />
              <Route path="/employes" element={<Employes />} />
              <Route path="/recrutement" element={<Ops><Recrutement /></Ops>} />
              <Route path="/taches" element={<Field><Taches /></Field>} />
              <Route path="/performance" element={<Ops><Performance /></Ops>} />
              <Route path="/formation" element={<Ops><Formation /></Ops>} />
              <Route path="/paie" element={<Ops><Paie /></Ops>} />
              <Route path="/presence" element={<Field><Presence /></Field>} />
              <Route path="/presence/scan" element={<PresenceScan />} />
              <Route path="/presence/locations" element={<Field><PresenceLocations /></Field>} />
              <Route path="/presence/kiosk/:locationId" element={<PresenceKiosk />} />
              <Route path="/documents" element={<Ops><Documents /></Ops>} />
              <Route path="/juridique" element={<Ops><Juridique /></Ops>} />
              <Route path="/communication" element={<Field><Communication /></Field>} />
              <Route path="/talents" element={<Ops><Talents /></Ops>} />
              <Route path="/bien-etre" element={<Field><BienEtre /></Field>} />
              <Route path="/rapports" element={<Ops><Rapports /></Ops>} />
              <Route path="/securite" element={<Ops><Securite /></Ops>} />
              <Route path="/secretariat" element={<Ops><Secretariat /></Ops>} />
              <Route path="/assistant" element={<Ops><Assistant /></Ops>} />
              <Route path="/manager" element={<Ops><ManagerGeneral /></Ops>} />
              <Route path="/parametres" element={<Ops><Parametres /></Ops>} />
              <Route path="/admin/cabinets" element={<AdminCabinets />} />
              <Route path="/admin" element={<Protected adminOnly><Admin /></Protected>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
