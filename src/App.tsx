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

const queryClient = new QueryClient();

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
              <Route path="/secretariat" element={<Secretariat />} />
              <Route path="/parametres" element={<Parametres />} />
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
