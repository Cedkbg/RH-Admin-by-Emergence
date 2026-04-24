import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AgentProvider } from "@/contexts/AgentContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { UsersProvider } from "@/contexts/UsersContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index.tsx";
import Admin from "./pages/Admin.tsx";
import Register from "./pages/Register.tsx";
import Login from "./pages/Login.tsx";
import Organigramme from "./pages/Organigramme.tsx";
import Employes from "./pages/Employes.tsx";
import ModulePlaceholder from "./pages/ModulePlaceholder.tsx";
import NotFound from "./pages/NotFound.tsx";
import DebugUsers from "./pages/DebugUsers.tsx";
import SimpleAdmin from "./pages/SimpleAdmin.tsx";
import ManagerDashboard from "./pages/ManagerDashboard.tsx";
import SecretaryDashboard from "./pages/SecretaryDashboard.tsx";
import AutoRHLogin from "./pages/AutoRHLogin.tsx";
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
import { Protected } from "@/components/Protected";

const queryClient = new QueryClient();

const placeholderRoutes = [
  "/recrutement", "/taches", "/performance", "/formation",
  "/paie", "/presence", "/documents", "/juridique",
  "/communication", "/talents", "/bien-etre", "/rapports",
  "/securite",
];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <UsersProvider>
        <AuthProvider>
          <AgentProvider>
            <NotificationProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
<Route path="/login" element={<AutoRHLogin />} />
  <Route path="/register" element={<Register />} />
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
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

