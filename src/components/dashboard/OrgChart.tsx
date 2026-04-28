import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { User, UserCog, Briefcase, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { colorClasses, modules } from "@/data/modules";
import { directionTemplates, iconForCode, colorForCode } from "@/data/orgData";
import { supabase } from "@/integrations/supabase/client";

interface DirectionRow {
  id: string;
  code: string | null;
  name: string;
  manager_name: string | null;
}

const DIRECTION_DEPARTMENTS: Record<string, string[]> = {
  DG: ["dashboard", "reports", "communication"],
  DGA: ["dashboard", "tasks", "reports"],
  D1: ["security", "settings", "documents"],
  D2: ["tasks", "performance", "talents"],
  D3: ["attendance", "tasks", "documents"],
  D4: ["payroll", "reports"],
  D5: ["legal", "security", "documents"],
  D6: ["recruitment", "communication", "performance"],
  D7: ["employees", "recruitment", "training", "attendance", "payroll", "performance", "talents", "wellbeing"],
  D8: ["legal", "documents"],
};

function departmentsFor(code: string) {
  return (DIRECTION_DEPARTMENTS[code] || [])
    .map((id) => modules.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));
}

function TopNode({
  code,
  title,
  subtitle,
  className,
  icon: Icon = User,
}: {
  code?: string;
  title: string;
  subtitle?: string;
  className?: string;
  icon?: typeof User;
}) {
  return (
    <div
      className={cn(
        "flex min-w-[260px] items-center gap-3 rounded-xl px-5 py-3 text-white shadow-md",
        className
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 text-left flex-1">
        {code && <p className="text-sm font-bold leading-tight">{code}</p>}
        <p className="truncate text-sm leading-tight">{title}</p>
        {subtitle && <p className="truncate text-[11px] leading-tight opacity-80">{subtitle}</p>}
      </div>
    </div>
  );
}

function DirectionColumn({ d }: { d: DirectionRow }) {
  const code = d.code || "";
  const Icon = iconForCode(code);
  const color = colorForCode(code);
  const c = colorClasses[color];
  const departments = departmentsFor(code);

  return (
    <div className="flex w-[132px] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm hover:shadow-md transition">
      <Link
        to={code ? `/direction/${code}` : "#"}
        className={cn("flex min-h-[118px] flex-col items-center justify-center gap-1.5 px-2 py-4 text-primary-foreground hover:opacity-90 transition", c.bg)}
        aria-label={`Ouvrir ${d.name}`}
      >
        <Icon className="h-5 w-5" />
        <p className="text-center text-[11px] font-semibold leading-tight px-1">{d.name}</p>
        {code && <p className="text-[10px] font-medium opacity-90">({code})</p>}
      </Link>
      <div className="px-2 py-3 text-center bg-card border-t border-border">
        <p className="text-[11px] font-medium leading-tight text-foreground">
          {d.manager_name || `Manager ${d.name.replace(/^Direction\s+/i, "")}`}
        </p>
      </div>
      {departments.length > 0 && (
        <div className="space-y-1 border-t border-border bg-muted/35 p-2">
          {departments.map((dept) => {
            const DeptIcon = dept.icon;
            return (
              <Link
                key={dept.id}
                to={dept.path}
                className="flex min-h-8 items-center gap-1.5 rounded-md bg-card px-2 py-1 text-[10px] font-medium leading-tight text-foreground shadow-sm transition hover:bg-muted"
              >
                <DeptIcon className={cn("h-3 w-3 shrink-0", colorClasses[dept.color].text)} />
                <span className="line-clamp-2">{dept.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function OrgChart() {
  const [directions, setDirections] = useState<DirectionRow[]>([]);

  useEffect(() => {
    supabase
      .from("directions")
      .select("id,code,name,manager_name")
      .order("code", { ascending: true })
      .then(({ data }) => {
        const rows = data || [];
        const completed = directionTemplates.map((template) => {
          const existing = rows.find((row) => row.code === template.code);
          return existing || {
            id: template.code,
            code: template.code,
            name: template.name,
            manager_name: null,
          };
        });
        setDirections(completed);
      });
  }, []);

  const dg = directions.find((d) => d.code === "DG");
  const dga = directions.find((d) => d.code === "DGA");
  const others = directions.filter((d) => d.code !== "DG" && d.code !== "DGA");

  return (
    <section className="rounded-xl border border-border bg-card p-4 md:p-6 shadow-sm">
      <h2 className="mb-6 text-base font-semibold text-foreground">Organigramme de l'entreprise</h2>

      {directions.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Aucune direction enregistrée.
        </div>
      ) : (
        <div className="flex flex-col items-center gap-0 overflow-x-auto py-4">
          {/* DG */}
          <TopNode
            code={dg?.code || "DG"}
            title={dg?.name || "Directeur Général"}
            className="bg-slate-800"
          />

          {/* Connector */}
          <div className="h-6 w-px bg-border" />

          {/* DGA */}
          <TopNode
            code={dga?.code || "DGA"}
            title={dga?.name || "Directeur Général Adjoint"}
            className="bg-slate-700"
          />

          {/* Connector */}
          <div className="h-6 w-px bg-border" />

          {/* Manager Général */}
          <TopNode
            title="Manager Général"
            subtitle="Supervise l'exécution opérationnelle"
            className="bg-slate-600"
            icon={UserCog}
          />

          {/* Vertical line down */}
          <div className="h-6 w-px bg-border" />

          {/* Horizontal connector spanning directions */}
          {others.length > 0 && (
            <div className="relative w-full min-w-max px-4">
              {/* Horizontal line */}
              <div
                className="absolute left-0 right-0 top-0 mx-auto h-px bg-border"
                style={{
                  width: `calc(100% / ${others.length} * ${others.length - 1})`,
                  marginLeft: `calc(100% / ${others.length} / 2)`,
                  marginRight: `calc(100% / ${others.length} / 2)`,
                }}
              />
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${others.length}, minmax(0, 1fr))` }}
              >
                {others.map((d) => (
                  <div key={d.id} className="flex flex-col items-center">
                    <div className="h-6 w-px bg-border" />
                    <DirectionColumn d={d} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
