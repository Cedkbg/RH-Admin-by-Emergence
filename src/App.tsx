import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index.tsx";
import Organigramme from "./pages/Organigramme.tsx";
import Employes from "./pages/Employes.tsx";
import ModulePlaceholder from "./pages/ModulePlaceholder.tsx";
import NotFound from "./pages/NotFound.tsx";

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
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/organigramme" element={<Organigramme />} />
            <Route path="/employes" element={<Employes />} />
            {placeholderRoutes.map((path) => (
              <Route key={path} path={path} element={<ModulePlaceholder />} />
            ))}
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
