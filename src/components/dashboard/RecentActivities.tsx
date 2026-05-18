import { useEffect, useState } from "react";
import { UserPlus, Calendar, FileText, Mail, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

type Activity = {
  id: string;
  icon: typeof UserPlus;
  color: string;
  title: string;
  detail: string;
  date: Date;
};

export function RecentActivities() {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [emps, leaves, docs, mails, jobs] = await Promise.all([
          supabase.from("employees").select("id,first_name,last_name,created_at").order("created_at", { ascending: false }).limit(5),
          supabase.from("leave_requests").select("id,employee_id,leave_type,status,created_at").order("created_at", { ascending: false }).limit(5),
          supabase.from("documents").select("id,title,created_at").order("created_at", { ascending: false }).limit(5),
          supabase.from("mail_register").select("id,subject,direction,created_at").order("created_at", { ascending: false }).limit(5),
          supabase.from("job_offers").select("id,title,created_at").order("created_at", { ascending: false }).limit(5),
        ]);

        const acts: Activity[] = [];
        (emps.data || []).forEach((e: any) => acts.push({
          id: `emp-${e.id}`, icon: UserPlus, color: "text-module-blue bg-module-blue/10",
          title: "Nouvel agent", detail: `${e.first_name} ${e.last_name}`, date: new Date(e.created_at),
        }));
        (leaves.data || []).forEach((l: any) => acts.push({
          id: `lv-${l.id}`, icon: Calendar, color: "text-module-orange bg-module-orange/10",
          title: "Demande de congé", detail: `${l.leave_type} · ${l.status}`, date: new Date(l.created_at),
        }));
        (docs.data || []).forEach((d: any) => acts.push({
          id: `doc-${d.id}`, icon: FileText, color: "text-module-purple bg-module-purple/10",
          title: "Document ajouté", detail: d.title, date: new Date(d.created_at),
        }));
        (mails.data || []).forEach((m: any) => acts.push({
          id: `mail-${m.id}`, icon: Mail, color: "text-module-teal bg-module-teal/10",
          title: m.direction === "incoming" ? "Courrier reçu" : "Courrier envoyé", detail: m.subject, date: new Date(m.created_at),
        }));
        (jobs.data || []).forEach((j: any) => acts.push({
          id: `job-${j.id}`, icon: Briefcase, color: "text-module-pink bg-module-pink/10",
          title: "Offre d'emploi", detail: j.title, date: new Date(j.created_at),
        }));

        acts.sort((a, b) => b.date.getTime() - a.date.getTime());
        setItems(acts.slice(0, 8));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Activités récentes</h2>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : items.length === 0 ? (
        <div className="flex items-center justify-center p-12 text-center">
          <p className="text-sm text-muted-foreground">Aucune activité récente</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => {
            const I = a.icon;
            return (
              <li key={a.id} className="flex items-start gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.color}`}>
                  <I className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.detail}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatDistanceToNow(a.date, { addSuffix: true, locale: fr })}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
