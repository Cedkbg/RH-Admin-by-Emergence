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
import Organigramme from "./pages/Organigramme";
import Employes from "./pages/Employes";
import Admin from "./pages/Admin";
import ModulePlaceholder from "./pages/ModulePlaceholder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const placeholderRoutes = [
  "/recrutement", "/taches", "/performance", "/formation",
  "/paie", "/presence", "/documents", "/juridique",
  "/communication", "/talents", "/bien-etre", "/rapports",
  "/securite", "/parametres",
];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<Protected><AppLayout /></Protected>}>
              <Route index element={<Index />} />
              <Route path="/organigramme" element={<Organigramme />} />
              <Route path="/employes" element={<Employes />} />
              <Route path="/admin" element={<Protected adminOnly><Admin /></Protected>} />
              {placeholderRoutes.map((path) => (
                <Route key={path} path={path} element={<ModulePlaceholder />} />
              ))}
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
