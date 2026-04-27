import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
<<<<<<< HEAD
=======
import Index from "./pages/Index.tsx";
import Admin from "./pages/Admin.tsx";
import Login from "./pages/Login.tsx";
import Organigramme from "./pages/Organigramme.tsx";
import Employes from "./pages/Employes.tsx";
import ModulePlaceholder from "./pages/ModulePlaceholder.tsx";
import NotFound from "./pages/NotFound.tsx";
import DebugUsers from "./pages/DebugUsers.tsx";
import SimpleAdmin from "./pages/SimpleAdmin.tsx";
import ManagerDashboard from "./pages/ManagerDashboard.tsx";
import SecretaryDashboard from "./pages/SecretaryDashboard.tsx";
// Backdoors supprimés pour sécurité — voir SECURITY_AUDIT.md
import DGDashboard from "./pages/DGDashboard.tsx";
import RHDashboard from "./pages/RHDashboard.tsx";
import SupportDashboard from "./pages/SupportDashboard.tsx";
import TechDashboard from "./pages/TechDashboard.tsx";
import ProductDashboard from "./pages/ProductDashboard.tsx";
import OperationsDashboard from "./pages/OperationsDashboard.tsx";
import FinanceDashboard from "./pages/FinanceDashboard.tsx";
import RiskDashboard from "./pages/RiskDashboard.tsx";
import CommercialDashboard from "./pages/CommercialDashboard.tsx";
import DepartmentPage from "./pages/DepartmentPage.tsx";
import SettingsPage from "./pages/Settings.tsx";
>>>>>>> 07b8eab ( file the login)
import { Protected } from "@/components/Protected";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Organigramme from "./pages/Organigramme";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
<<<<<<< HEAD
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
              <Route path="/employes" element={<Employes />} />
              <Route path="/recrutement" element={<Recrutement />} />
              <Route path="/taches" element={<Taches />} />
              <Route path="/performance" element={<Performance />} />
              <Route path="/formation" element={<Formation />} />
              <Route path="/paie" element={<Paie />} />
              <Route path="/presence" element={<Presence />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/juridique" element={<Juridique />} />
              <Route path="/communication" element={<Communication />} />
              <Route path="/talents" element={<Talents />} />
              <Route path="/bien-etre" element={<BienEtre />} />
              <Route path="/rapports" element={<Rapports />} />
              <Route path="/securite" element={<Securite />} />
              <Route path="/parametres" element={<Parametres />} />
              <Route path="/admin" element={<Protected adminOnly><Admin /></Protected>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
=======
      <UsersProvider>
        <AuthProvider>
          <AgentProvider>
            <NotificationProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
<Route path="/login" element={<Login />} />
<Route element={<AppLayout />}>
    <Route path="/simple-admin" element={<Protected><SimpleAdmin /></Protected>} />  
    <Route path="/dg-dashboard" element={<Protected><DGDashboard /></Protected>} />
    <Route path="/rh-dashboard" element={<Protected><RHDashboard /></Protected>} />
    <Route path="/support-dashboard" element={<Protected><SupportDashboard /></Protected>} />
    <Route path="/tech-dashboard" element={<Protected><TechDashboard /></Protected>} />
    <Route path="/product-dashboard" element={<Protected><ProductDashboard /></Protected>} />
    <Route path="/operations-dashboard" element={<Protected><OperationsDashboard /></Protected>} />
    <Route path="/finance-dashboard" element={<Protected><FinanceDashboard /></Protected>} />
    <Route path="/risk-dashboard" element={<Protected><RiskDashboard /></Protected>} />
    <Route path="/commercial-dashboard" element={<Protected><CommercialDashboard /></Protected>} />
    <Route path="/dga-dashboard" element={<Protected><DGDashboard /></Protected>} />

    <Route path="/manager-dashboard" element={<Protected><ManagerDashboard /></Protected>} />
    <Route path="/secretary-dashboard" element={<Protected><SecretaryDashboard /></Protected>} />
    <Route index element={<Index />} />
    <Route path="/admin" element={<Protected><Admin /></Protected>} />
    <Route path="/organigramme" element={<Protected><Organigramme /></Protected>} />
    <Route path="/employes" element={<Protected><Employes /></Protected>} />
    {placeholderRoutes.map((path) => (
      <Route key={path} path={path} element={<Protected><ModulePlaceholder /></Protected>} />
    ))}
    <Route path="/parametres" element={<Protected><SettingsPage /></Protected>} />
    <Route path="/:moduleId" element={<Protected><DepartmentPage /></Protected>} />
  </Route>
  <Route path="/debug" element={<DebugUsers />} />

  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </NotificationProvider>
          </AgentProvider>
        </AuthProvider>
      </UsersProvider>
>>>>>>> 07b8eab ( file the login)
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
