import { Component, ReactNode } from "react";

interface State { hasError: boolean; }

/**
 * ErrorBoundary silencieux : on log dans la console pour le debug,
 * mais on n'affiche JAMAIS d'écran d'erreur à l'utilisateur.
 * On se réinitialise automatiquement pour laisser React re-render.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: any) {
    console.error("[ErrorBoundary]", error, info);
    // Reset immédiat pour ne rien afficher de cassé à l'utilisateur
    setTimeout(() => this.setState({ hasError: false }), 0);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
