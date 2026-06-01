import { createRoot } from "react-dom/client";
import "./lib/iosSupabaseLockFix";
import { ThemeProvider } from "./components/theme-provider.tsx";
import App from "./App.tsx";
import "./index.css";

// Intercepter IMMÉDIATEMENT (avant tout boot Supabase/React) les liens
// d'invitation / récupération / magic link et forcer la route /reset-password.
// Sinon le client Supabase consomme le hash et l'utilisateur est redirigé
// au mauvais endroit (onboarding entreprise).
(() => {
  try {
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    const isAuthLink =
      /access_token=|refresh_token=/.test(hash) ||
      /type=(recovery|invite|signup|magiclink|email_change)/.test(hash + search) ||
      /[?&]code=[\w-]+/.test(search);
    if (isAuthLink && window.location.pathname !== "/reset-password") {
      window.history.replaceState({}, "", `/reset-password${search}${hash}`);
    }
  } catch {}
})();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
