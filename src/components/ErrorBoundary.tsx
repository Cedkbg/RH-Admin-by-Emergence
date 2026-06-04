import { Component, ReactNode } from "react";

interface State { hasError: boolean; error: Error | null; }

/**
 * ErrorBoundary : affiche un écran de secours (jamais un écran blanc).
 * Le bouton "Réinitialiser la connexion" est désormais toujours visible
 * pour permettre à un agent bloqué (cache/auth corrompu) de repartir
 * d'une session propre, sur tous les navigateurs.
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
          {this.state.error?.message && (
            <pre className="max-w-md overflow-auto rounded-md bg-muted p-3 text-left text-xs text-destructive whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={this.handleReload}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90"
            >
              Recharger la page
            </button>
            <button
              onClick={this.handleReset}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Réinitialiser la connexion
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
