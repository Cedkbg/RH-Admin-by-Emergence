import { FileText, CheckCircle2, Calendar, FileSignature, UserPlus } from "lucide-react";

const activities = [
  { icon: FileSignature, color: "text-module-blue bg-module-blue/10", title: "Structure mise à jour", sub: "Directions rafraîchies", time: "Il y a 10 min" },
  { icon: CheckCircle2, color: "text-module-green bg-module-green/10", title: "Agent ajouté", sub: "Premier agent créé", time: "Il y a 1 h" },
  { icon: Calendar, color: "text-module-orange bg-module-orange/10", title: "Présence activée", sub: "Suivi disponible", time: "Il y a 2 h" },
  { icon: FileText, color: "text-module-purple bg-module-purple/10", title: "Modèles prêts", sub: "Formulaires agents", time: "Il y a 3 h" },
  { icon: UserPlus, color: "text-module-pink bg-module-pink/10", title: "Gestion activée", sub: "Mode gestionnaire", time: "Il y a 4 h" },
];

export function RecentActivities() {
  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Activités récentes</h2>
        <button className="text-xs font-semibold text-primary hover:underline">Voir tout</button>
      </div>
      <ul className="space-y-3">
        {activities.map((a, i) => (
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

