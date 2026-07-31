import { useMemo } from "react";
import { Sunrise, Sunset, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EmployeeShort {
  first_name: string;
  last_name: string;
}

interface Survey {
  id: string;
  mood_score: number | null;
  energy_score: number | null;
  stress_score: number | null;
  comments: string | null;
  highlight: string | null;
  moment: string;
  submitted_at: string;
  employee_id: string | null;
  employees?: EmployeeShort | null;
}

interface WellbeingHistoryProps {
  items: Survey[];
  isHrPrivileged: boolean;
  myEmployeeId: string | null;
  onDelete: (id: string) => void;
}

export function WellbeingHistory({ items, isHrPrivileged, myEmployeeId, onDelete }: WellbeingHistoryProps) {
  const mine = useMemo(() => items.filter((i) => i.employee_id), [items]);

  if (mine.length === 0) {
    return (
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">
          {isHrPrivileged ? "Historique des agents" : "Mon historique"}
        </h2>
        <p className="py-6 text-center text-sm text-muted-foreground">Aucune entrée pour l'instant.</p>
      </section>
    );
  }

  // Group by employee_id + date, showing morning/evening side by side
  const groups = new Map<string, { name: string; date: string; morning?: Survey; evening?: Survey }>();
  for (const i of mine) {
    const name = i.employees ? `${i.employees.first_name} ${i.employees.last_name}` : "—";
    const key = `${i.employee_id ?? "x"}__${i.submitted_at}`;
    const g = groups.get(key) ?? { name, date: i.submitted_at };
    if (i.moment === "evening") g.evening = i;
    else g.morning = i;
    groups.set(key, g);
  }

  const rows = Array.from(groups.values())
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 20);

  const Slot = ({
    s,
    label,
    Icon,
    color,
  }: {
    s?: Survey;
    label: string;
    Icon: typeof Sunrise;
    color: string;
  }) => (
    <div className={cn("rounded-lg border p-2.5", s ? "bg-background" : "bg-muted/30 border-dashed")}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("h-3.5 w-3.5", color)} />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
        </div>
        {s && (isHrPrivileged || s.employee_id === myEmployeeId) && (
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onDelete(s.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
      {s ? (
        <>
          <div className="flex flex-wrap gap-1 mb-1">
            {s.mood_score != null && (
              <Badge
                variant={s.mood_score >= 4 ? "default" : s.mood_score <= 2 ? "destructive" : "outline"}
                className="text-[10px]"
              >
                😊 {s.mood_score}
              </Badge>
            )}
            {s.energy_score != null && (
              <Badge variant="outline" className="text-[10px]">
                ⚡ {s.energy_score}
              </Badge>
            )}
            {s.stress_score != null && (
              <Badge variant="outline" className="text-[10px]">
                💢 {s.stress_score}
              </Badge>
            )}
          </div>
          {s.highlight && (
            <div className="text-xs text-muted-foreground line-clamp-2">{s.highlight}</div>
          )}
        </>
      ) : (
        <div className="text-[11px] italic text-muted-foreground">En attente…</div>
      )}
    </div>
  );

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="mb-3 font-semibold">
        {isHrPrivileged ? "Historique des agents" : "Mon historique"}
      </h2>
      <ul className="space-y-3">
        {rows.map((g, idx) => (
          <li key={idx} className="rounded-xl border bg-card/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">{g.name}</span>
              <span className="text-[11px] text-muted-foreground">
                {new Date(g.date).toLocaleDateString("fr-FR")}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Slot s={g.morning} label="Matin" Icon={Sunrise} color="text-amber-500" />
              <Slot s={g.evening} label="Soir" Icon={Sunset} color="text-orange-500" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

