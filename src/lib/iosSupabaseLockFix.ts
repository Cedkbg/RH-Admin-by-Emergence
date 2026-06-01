const isIosWebKit = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iP(ad|hone|od)/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
};

// iOS Safari/WebView peut laisser le Web Lock de Supabase bloqué indéfiniment.
// On désactive ce verrou avant la création du client pour forcer le chemin sans lock.
if (isIosWebKit() && typeof navigator !== "undefined" && "locks" in navigator) {
  try {
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      get: () => undefined,
    });
  } catch {
    // Si le navigateur refuse la modification, l'app continue normalement.
  }
}