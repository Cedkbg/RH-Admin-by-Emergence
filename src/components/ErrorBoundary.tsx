import { Component, ReactNode } from "react";

const isIosWebKit = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iP(ad|hone|od)/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
};

interface State { hasError: boolean; error: Error | null; }

/**
 * ErrorBoundary : affiche un écran de secours (jamais un écran blanc).
 * On NE remet PAS automatiquement hasError à false, sinon on entre dans
 * une boucle infinie render → erreur → null → reset → render → erreur
 * (exactement ce qui causait l'écran blanc sur iPhone pour certains agents).
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("[ErrorBoundary]", error, info);
  }

  private handleReload = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("recover", String(Date.now()));
      window.location.replace(url.toString());
    } catch {
      this.setState({ hasError: false, error: null });
    }
  };

  private handleReset = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Le stockage peut être indisponible en navigation privée iOS.
    }
    window.location.replace("/agent/login?reset=1");
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            L'application a rencontré un problème. Veuillez recharger la page.
          </p>
          <button
            onClick={this.handleReload}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90"
          >
            Recharger la page
          </button>
          {isIosWebKit() && (
            <button
              onClick={this.handleReset}
              className="text-sm font-medium text-primary underline underline-offset-4"
            >
              Réinitialiser la connexion
            </button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
