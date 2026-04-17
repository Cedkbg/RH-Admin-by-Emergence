import type { LucideIcon } from "lucide-react";
import { ArrowUp, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { colorClasses, type ModuleColor } from "@/data/modules";

interface KpiCardProps {
  label: string;
  value: string;
  trend?: string;
  trendDirection?: "up" | "neutral";
  icon: LucideIcon;
  color: ModuleColor;
}

export function KpiCard({ label, value, trend, trendDirection = "up", icon: Icon, color }: KpiCardProps) {
  const c = colorClasses[color];
  return (
    <div className="group rounded-xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", c.iconBg)}>
          <Icon className={cn("h-6 w-6", c.text)} />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{value}</p>
      </div>
      {trend && (
        <p className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground">
          {trendDirection === "up" ? (
            <ArrowUp className="h-3.5 w-3.5 text-success" />
          ) : (
            <ArrowRight className="h-3.5 w-3.5" />
          )}
          <span className={cn(trendDirection === "up" && "text-success")}>{trend}</span>
        </p>
      )}
    </div>
  );
}
