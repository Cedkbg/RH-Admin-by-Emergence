import { HeartHandshake, Zap, Activity } from "lucide-react";

interface WellbeingStatsProps {
  avgMood: string | null;
  avgEnergy: string | null;
  avgStress: string | null;
  totalEntries: number;
}

export function WellbeingStats({ avgMood, avgEnergy, avgStress, totalEntries }: WellbeingStatsProps) {
  const stats = [
    { label: "Humeur moy.", value: avgMood, icon: HeartHandshake, color: "text-primary" },
    { label: "Énergie moy.", value: avgEnergy, icon: Zap, color: "text-yellow-500" },
    { label: "Stress moy.", value: avgStress, icon: Activity, color: "text-red-500" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-3 text-center shadow-sm">
            <s.icon className={`mx-auto mb-1 h-5 w-5 ${s.color}`} />
            <div className="text-lg font-bold">
              {s.value ?? "—"}
              <span className="text-xs text-muted-foreground">/5</span>
            </div>
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Basé sur {totalEntries} entrée{totalEntries > 1 ? "s" : ""}
      </p>
    </div>
  );
}

