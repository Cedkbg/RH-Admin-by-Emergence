import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // Affiche dans la console pour debug (utile sur iPhone via remote inspector)
    console.error("[ErrorBoundary]", error, info);
  }

  handleReload = () => {
    try {
      // Purge le cache local Supabase en cas de session corrompue
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("sb-") || k.includes("supabase")) localStorage.removeItem(k);
      });
    } catch {}
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h1 className="font-semibold">Une erreur est survenue</h1>
              <p className="text-xs text-muted-foreground">L'application n'a pas pu afficher cette page.</p>
            </div>
          </div>
          <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40 whitespace-pre-wrap break-words">
            {this.state.error?.message || "Erreur inconnue"}
          </pre>
          <div className="flex gap-2">
            <Button onClick={() => this.setState({ hasError: false, error: null })} variant="outline" className="flex-1">
              Réessayer
            </Button>
            <Button onClick={this.handleReload} className="flex-1">
              Recharger
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
