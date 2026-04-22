import { AlertCircle, Calendar, FileText, BarChart3, GraduationCap } from "lucide-react";

export function AlertsPanel() {
  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Alertes & Notifications</h2>
        <button className="text-xs font-semibold text-primary hover:underline">Voir tout</button>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Aucune alerte pour le moment</p>
      </div>
    </section>
  );
}
