import { Maximize2, Minus, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { directions, type Direction } from "@/data/orgData";
import { colorClasses } from "@/data/modules";

function NodeBox({
  code, title, subtitle, className,
}: { code?: string; title: string; subtitle?: string; className?: string }) {
  return (
    <div className={cn(
      "flex min-w-[180px] items-center gap-3 rounded-lg px-4 py-3 text-primary-foreground shadow-md",
      className,
    )}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
        <User className="h-4 w-4" />
      </div>
      <div className="min-w-0 text-left">
        {code && <p className="text-sm font-bold leading-tight">{code}</p>}
        <p className="truncate text-xs leading-tight opacity-90">{title}</p>
        {subtitle && <p className="truncate text-[11px] leading-tight opacity-75">{subtitle}</p>}
      </div>
    </div>
  );
}

function DirectionCard({ d }: { d: Direction }) {
  const c = colorClasses[d.color];
  return (
    <div className="flex w-[140px] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className={cn("flex flex-col items-center gap-1 px-2 py-3 text-primary-foreground", c.bg)}>
        <d.icon className="h-5 w-5" />
        <p className="text-center text-[11px] font-semibold leading-tight">{d.name}</p>
        <p className="text-[10px] font-medium opacity-90">({d.code})</p>
      </div>
      <div className="px-2 py-2 text-center">
        <p className="text-[11px] font-medium leading-tight text-foreground">{d.managerTitle}</p>
      </div>
    </div>
  );
}

export function OrgChart() {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">Organigramme de l'entreprise</h2>
        <div className="flex items-center gap-2">
          <button className="hidden rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 sm:inline-flex">
            Vue complète
          </button>
          <div className="flex items-center gap-1 text-muted-foreground">
            <button className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-secondary">
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-secondary">
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-secondary">
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <div className="flex min-w-[900px] flex-col items-center gap-3 py-2">
<NodeBox code="DG" title="Directeur Général" className="bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg text-white" />
  <div className="h-5 w-px bg-border" />
  <NodeBox code="DGA" title="Directeur Général Adjoint" className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white" />
  <div className="h-5 w-px bg-border" />
  <NodeBox code="MAN" title="Manager Général" subtitle="Direction de l'entreprise" className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg" />
  <div className="h-5 w-px bg-border" />
  <NodeBox title="Secrétaire" subtitle="Assistante exécutive" className="bg-indigo-600" />
  <div className="h-5 w-px bg-border" />
  <div className="relative h-6 w-full">
    <div className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-border" />
    <div className="absolute left-[6%] right-[6%] top-3 h-px bg-border" />
  </div>
          <div className="flex w-full justify-between gap-3 px-[2%]">
            {directions.map((d) => (
              <div key={d.id} className="flex flex-col items-center gap-0">
                <div className="h-3 w-px bg-border" />
                <DirectionCard d={d} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

