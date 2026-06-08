// CRITIQUE : preBootAuthScrub DOIT être importé en TOUT PREMIER, avant tout
// module qui importe le client Supabase (sinon detectSessionInUrl consomme
// les jetons et une URL d'email partagée connecte le destinataire au compte
// de l'admin).
import "./lib/preBootAuthScrub";
import { createRoot } from "react-dom/client";
import "./lib/iosSupabaseLockFix";
import "./lib/safeRealtime";
import { ThemeProvider } from "./components/theme-provider.tsx";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
