import { Link } from "react-router-dom";
import { modules, colorClasses } from "@/data/modules";
import { cn } from "@/lib/utils";

const featuredIds = [
  "employees", "tasks", "performance",
  "payroll", "attendance", "documents",
  "recruitment", "training", "legal",
];

export function ModuleGrid() {
  const featured = featuredIds
    .map((id) => modules.find((m) => m.id === id))
    .filter(Boolean) as typeof modules;

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-foreground">Modules principaux</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((m) => {
          const c = colorClasses[m.color];
          return (
            <Link
              key={m.id}
              to={m.path}
              className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition hover:border-primary/50 hover:bg-secondary/50 hover:shadow-md"
            >
              <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", c.iconBg)}>
                <m.icon className={cn("h-5 w-5", c.text)} />
              </div>
              <div className="min-w-0">
                <p className={cn("text-sm font-semibold leading-tight transition", c.text)}>{m.label}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{m.shortDescription}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
