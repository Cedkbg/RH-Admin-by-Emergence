import { useLocation } from "react-router-dom";
import { Construction } from "lucide-react";
import { modules, colorClasses } from "@/data/modules";
import { cn } from "@/lib/utils";

const ModulePlaceholder = () => {
  const location = useLocation();
  const m = modules.find((mod) => location.pathname.startsWith(mod.path) && mod.path !== "/");

  if (!m) return null;
  const c = colorClasses[m.color];

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 py-12 text-center animate-fade-in">
      <div className={cn("flex h-20 w-20 items-center justify-center rounded-2xl shadow-lg", c.iconBg)}>
        <m.icon className={cn("h-10 w-10", c.text)} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Module</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">{m.label}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{m.shortDescription}</p>
      </div>
      <div className="w-full rounded-xl border border-dashed border-border bg-card p-8 shadow-sm">
        <Construction className="mx-auto h-8 w-8 text-muted-foreground" />
<p className="mt-3 text-sm font-medium text-muted-foreground">Fonctionnalité en développement</p>
      </div>
    </div>
  );
};

export default ModulePlaceholder;
