import { AlertCircle, Calendar, FileText, BarChart3, GraduationCap } from "lucide-react";

const alerts = [
  { icon: AlertCircle,   color: "text-destructive bg-destructive/10", title: "18 postes vacants",       sub: "Nécessitent votre attention",   time: "Il y a 5 min" },
  { icon: Calendar,      color: "text-module-blue bg-module-blue/10", title: "3 contrats expirent bientôt", sub: "Vérifiez les renouvellements",  time: "Il y a 30 min" },
  { icon: FileText,      color: "text-module-orange bg-module-orange/10", title: "5 documents en attente", sub: "En attente de signature",       time: "Il y a 1 h" },
  { icon: BarChart3,     color: "text-module-purple bg-module-purple/10", title: "Évaluations en retard", sub: "12 évaluations à compléter",    time: "Il y a 2 h" },
  { icon: GraduationCap, color: "text-module-teal bg-module-teal/10",     title: "Formations à venir",   sub: "3 formations cette semaine",    time: "Il y a 4 h" },
];

export function AlertsPanel() {
  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Alertes & Notifications</h2>
        <button className="text-xs font-semibold text-primary hover:underline">Voir tout</button>
      </div>
      <ul className="space-y-3">
        {alerts.map((a, i) => (
          <li key={i} className="flex items-start gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${a.color}`}>
              <a.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight text-foreground">{a.title}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{a.sub}</p>
            </div>
            <span className="shrink-0 text-[11px] text-muted-foreground">{a.time}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
