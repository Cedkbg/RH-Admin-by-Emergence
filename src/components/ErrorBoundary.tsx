import { Component, ReactNode } from "react";

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
      window.location.reload();
    } catch {
      this.setState({ hasError: false, error: null });
    }
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
        </div>
      );
    }
    return this.props.children;
  }
}
