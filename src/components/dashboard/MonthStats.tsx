import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Slice = { label: string; value: number; count: number; color: string };

const PALETTE = [
  "hsl(var(--module-blue))",
  "hsl(var(--module-orange))",
  "hsl(var(--module-teal))",
  "hsl(var(--module-indigo))",
  "hsl(var(--module-green))",
  "hsl(var(--module-purple))",
  "hsl(var(--module-yellow))",
  "hsl(var(--module-pink))",
  "hsl(var(--module-gray))",
];

function Donut({ slices }: { slices: Slice[] }) {
  const radius = 38;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <svg viewBox="0 0 100 100" className="h-32 w-32 -rotate-90">
      <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="14" />
      {slices.map((s, i) => {
        const dash = (s.value / total) * circ;
        const el = (
          <circle
            key={i}
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={s.color}
            strokeWidth="14"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
}

export function MonthStats() {
  const [slices, setSlices] = useState<Slice[]>([]);
  const [total, setTotal] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [{ data: dirs }, { data: emps }, { count: pres }] = await Promise.all([
          supabase.from("directions").select("id,code,name"),
          supabase.from("employees").select("direction_id").eq("status", "active"),
          supabase.from("attendance").select("*", { count: "exact", head: true }).eq("date", today),
        ]);
        const dirMap = new Map((dirs || []).map((d: any) => [d.id, d]));
        const counts = new Map<string, number>();
        (emps || []).forEach((e: any) => {
          const key = e.direction_id || "none";
          counts.set(key, (counts.get(key) || 0) + 1);
        });
        const entries = Array.from(counts.entries())
          .map(([id, count]) => {
            const d: any = dirMap.get(id);
            return { label: d?.code || d?.name || "Non assigné", count };
          })
          .sort((a, b) => b.count - a.count);
        const tot = entries.reduce((s, x) => s + x.count, 0) || 1;
        const top = entries.slice(0, 4);
        const rest = entries.slice(4).reduce((s, x) => s + x.count, 0);
        const final: Slice[] = top.map((e, i) => ({
          label: e.label, count: e.count, value: Math.round((e.count / tot) * 100), color: PALETTE[i],
        }));
        if (rest > 0) final.push({ label: "Autres", count: rest, value: Math.round((rest / tot) * 100), color: PALETTE[8] });
        setSlices(final);
        setTotal(tot);
        setPresentToday(pres ?? 0);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">Répartition des agents</h2>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : slices.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun agent enregistré.</p>
      ) : (
        <div className="flex items-center gap-4">
          <Donut slices={slices} />
          <ul className="flex-1 space-y-1.5">
            {slices.map((s) => (
              <li key={s.label} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
                <span className="font-semibold text-foreground">{s.count} ({s.value}%)</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-1 rounded-lg border border-border bg-secondary/40 p-3">
        <p className="text-xs font-medium text-muted-foreground">Présents aujourd'hui</p>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-2xl font-bold text-foreground">
            {presentToday}<span className="text-base font-medium text-muted-foreground">/{total}</span>
          </p>
          <span className="text-xl">{total > 0 && presentToday / total >= 0.8 ? "😊" : presentToday / Math.max(total,1) >= 0.5 ? "🙂" : "😐"}</span>
        </div>
        <p className="mt-1 text-[11px] font-medium text-muted-foreground">
          Taux de présence : {total > 0 ? Math.round((presentToday / total) * 100) : 0}%
        </p>
      </div>
    </section>
  );
}
