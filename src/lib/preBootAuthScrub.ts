// CRITIQUE — ce module DOIT être importé en tout premier dans main.tsx,
// avant tout autre module qui touche au client Supabase.
//
// Problème résolu : par défaut, le client Supabase (detectSessionInUrl: true)
// consomme automatiquement les jetons (`#access_token=...` ou `?code=...`)
// présents dans l'URL au tout premier chargement. Si l'admin clique un lien
// reçu par email (confirmation, invitation, magic link, recovery) puis copie
// l'URL pour la partager, la personne qui ouvre le lien est connectée à sa
// place — donc sur le compte admin. Faille majeure d'usurpation.
//
// On nettoie l'URL immédiatement et on stocke les jetons dans sessionStorage
// (cloisonné à l'onglet courant). La page /reset-password est la SEULE à les
// consommer, et exige que l'utilisateur définisse un nouveau mot de passe —
// une intention explicite, pas une connexion silencieuse.

const TOKEN_KEY = "__pending_auth_tokens";

export type PendingAuthTokens =
  | { kind: "hash"; access_token: string; refresh_token: string; type: string | null }
  | { kind: "code"; code: string }
  | null;

export const readPendingAuthTokens = (): PendingAuthTokens => {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingAuthTokens;
  } catch {
    return null;
  }
};

export const clearPendingAuthTokens = () => {
  try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* noop */ }
};

(() => {
  try {
    if (typeof window === "undefined") return;
    const hash = window.location.hash || "";
    const search = window.location.search || "";

    const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const access_token = hashParams.get("access_token");
    const refresh_token = hashParams.get("refresh_token");
    const tokenType = hashParams.get("type");

    const searchParams = new URLSearchParams(search);
    const code = searchParams.get("code");
    // Heuristique : un `code=` court n'est probablement pas un code Supabase PKCE.
    const isPkceCode = !!code && code.length >= 20;

    const hasAuthHash = !!(access_token && refresh_token);
    const hasAuthQuery = isPkceCode || /type=(recovery|invite|signup|magiclink|email_change)/.test(search);

    if (!hasAuthHash && !hasAuthQuery) return;

    if (hasAuthHash) {
      sessionStorage.setItem(TOKEN_KEY, JSON.stringify({
        kind: "hash", access_token, refresh_token, type: tokenType,
      }));
    } else if (isPkceCode) {
      sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ kind: "code", code }));
    }

    // Toujours rediriger vers /reset-password ET retirer les jetons de l'URL
    // pour qu'aucun autre code (notamment l'auto-detect Supabase) ne les voie.
    window.history.replaceState({}, "", "/reset-password");
  } catch {
    // Échec non bloquant — au pire on retombe sur le comportement par défaut.
  }
})();
