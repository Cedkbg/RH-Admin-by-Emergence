import { Star } from "lucide-react";

const stats = [
  { label: "Technologie", value: 28, color: "hsl(var(--module-blue))" },
  { label: "Produits",    value: 22, color: "hsl(var(--module-orange))" },
  { label: "Opérations",  value: 18, color: "hsl(var(--module-teal))" },
  { label: "Finance",     value: 12, color: "hsl(var(--module-indigo))" },
  { label: "Autres",      value: 20, color: "hsl(var(--module-gray))" },
];

function Donut() {
  const radius = 38;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" className="h-32 w-32 -rotate-90">
      <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="14" />
      {stats.map((s, i) => {
        const dash = (s.value / 100) * circ;
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
  return (
    <section className="flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">Statistiques du mois</h2>

      <div className="flex items-center gap-4">
        <Donut />
        <ul className="flex-1 space-y-1.5">
          {stats.map((s) => (
            <li key={s.label} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
              <span className="font-semibold text-foreground">{s.value}%</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-1 rounded-lg border border-border bg-secondary/40 p-3">
        <p className="text-xs font-medium text-muted-foreground">Taux de satisfaction</p>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-2xl font-bold text-foreground">4.6<span className="text-base font-medium text-muted-foreground">/5</span></p>
          <span className="text-xl">😊</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex">
            {[1,2,3,4,5].map((n) => (
              <Star key={n} className={`h-3.5 w-3.5 ${n <= 4 ? "fill-warning text-warning" : "text-muted"}`} />
            ))}
          </div>
          <span className="text-[11px] font-medium text-success">+0.3 ce mois ↑</span>
        </div>
      </div>
    </section>
  );
}
