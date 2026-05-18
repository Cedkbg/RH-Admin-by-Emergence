import { useEffect, useState } from "react";
import { AlertCircle, Calendar, UserCheck, Briefcase, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Alert = {
  id: string;
  icon: typeof AlertCircle;
  color: string;
  title: string;
  detail: string;
};

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const in30 = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

        const [pendingLeaves, pendingProfiles, openJobs, legalDue] = await Promise.all([
          supabase.from("leave_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("profiles").select("*", { count: "exact", head: true }).eq("approval_status", "pending"),
          supabase.from("job_offers").select("*", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("legal_records").select("*", { count: "exact", head: true }).gte("due_date", today).lte("due_date", in30),
        ]);

        const list: Alert[] = [];
        if ((pendingLeaves.count ?? 0) > 0) list.push({
          id: "leaves", icon: Calendar, color: "text-module-orange bg-module-orange/10",
          title: "Demandes de congé en attente", detail: `${pendingLeaves.count} demande(s) à valider`,
        });
        if ((pendingProfiles.count ?? 0) > 0) list.push({
          id: "profiles", icon: UserCheck, color: "text-module-blue bg-module-blue/10",
          title: "Comptes à approuver", detail: `${pendingProfiles.count} utilisateur(s) en attente`,
        });
        if ((openJobs.count ?? 0) > 0) list.push({
          id: "jobs", icon: Briefcase, color: "text-module-pink bg-module-pink/10",
          title: "Offres d'emploi ouvertes", detail: `${openJobs.count} poste(s) à pourvoir`,
        });
        if ((legalDue.count ?? 0) > 0) list.push({
          id: "legal", icon: Scale, color: "text-module-gray bg-module-gray/10",
          title: "Échéances juridiques (30j)", detail: `${legalDue.count} dossier(s)`,
        });

        setAlerts(list);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Alertes & Notifications</h2>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : alerts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <p className="text-sm text-muted-foreground">Aucune alerte ✓</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {alerts.map((a) => {
            const I = a.icon;
            return (
              <li key={a.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.color}`}>
                  <I className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
