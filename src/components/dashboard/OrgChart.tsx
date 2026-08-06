import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { User, UserCog, Briefcase, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { colorClasses } from "@/data/modules";
import { iconForCode, colorForCode } from "@/data/orgData";
import { supabase } from "@/integrations/supabase/client";

interface DirectionRow {
  id: string;
  code: string | null;
  name: string;
  manager_name: string | null;
}

interface DepartmentRow {
  id: string;
  name: string;
  direction_id: string;
}


function TopNode({
  code,
  title,
  subtitle,
  className,
  icon: Icon = User,
  to,
}: {
  code?: string;
  title: string;
  subtitle?: string;
  className?: string;
  icon?: typeof User;
  to?: string;
}) {
  const inner = (
    <>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 text-left flex-1">
        {code && <p className="text-sm font-bold leading-tight">{code}</p>}
        <p className="truncate text-sm leading-tight">{title}</p>
        {subtitle && <p className="truncate text-[11px] leading-tight opacity-80">{subtitle}</p>}
      </div>
    </>
  );
  const classes = cn(
    "flex min-w-[260px] items-center gap-3 rounded-xl px-5 py-3 text-white shadow-md transition",
    to && "hover:opacity-90 cursor-pointer",
    className,
  );
  if (to) {
    return <Link to={to} className={classes} aria-label={`Ouvrir ${title}`}>{inner}</Link>;
  }
  return <div className={classes}>{inner}</div>;
}

function DirectionColumn({ d, departments }: { d: DirectionRow; departments: DepartmentRow[] }) {
  const code = d.code || "";
  const Icon = iconForCode(code);
  const color = colorForCode(code);
  const c = colorClasses[color];

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
          {departments.map((dept) => (
            <Link
              key={dept.id}
              to={code ? `/direction/${code}` : "#"}
              className="flex min-h-8 items-center gap-1.5 rounded-md bg-card px-2 py-1 text-[10px] font-medium leading-tight text-foreground shadow-sm transition hover:bg-muted"
            >
              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", c.bg)} />
              <span className="line-clamp-2">{dept.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}


export function OrgChart() {
  const [directions, setDirections] = useState<DirectionRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);

  useEffect(() => {
    (async () => {
      // Uniquement les directions/départements de l'entreprise de l'utilisateur
      // (isolation multi-entreprise assurée par les règles d'accès).
const [{ data: dirs }, { data: depts }] = await Promise.all([
        supabase.from("directions").select("id,code,name,manager_name").order("code", { ascending: true }),
        supabase.from("departments").select("id,name,direction_id").order("name", { ascending: true }),
      ]);
      setDirections((dirs || []) as DirectionRow[]);
      setDepartments((depts || []) as DepartmentRow[]);
    })();
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
            to="/direction/DG"
          />

          <div className="h-6 w-px bg-border" />

          {/* DGA */}
          <TopNode
            code={dga?.code || "DGA"}
            title={dga?.name || "Directeur Général Adjoint"}
            className="bg-slate-700"
            to="/direction/DGA"
          />

          <div className="h-6 w-px bg-border" />

          {/* Manager + Assistant + Secrétariat — stack en mobile, en ligne en md+ */}
          <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-3 md:gap-8 w-full">
            <Link
              to="/assistant"
              className="order-2 md:order-1 md:mt-12 flex min-w-[180px] items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-white shadow-md hover:opacity-90 transition relative"
            >
              <span className="hidden md:block absolute right-0 top-1/2 h-px w-8 bg-border translate-x-full" />
              <span className="hidden md:block absolute right-0 top-0 h-12 w-px bg-border translate-x-8 -translate-y-12" />
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
                <Briefcase className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold leading-tight">Assistant de Direction</p>
                <p className="text-[10px] opacity-80">Bras droit du Manager</p>
              </div>
            </Link>

            <div className="order-1 md:order-2">
              <TopNode
                title="Manager Général"
                subtitle="Supervise l'exécution opérationnelle"
                className="bg-slate-600"
                icon={UserCog}
                to="/manager"
              />
            </div>

            <Link
              to="/secretariat"
              className="order-3 md:mt-12 flex min-w-[180px] items-center gap-2 rounded-xl bg-pink-600 px-4 py-2.5 text-white shadow-md hover:opacity-90 transition relative"
            >
              <span className="hidden md:block absolute left-0 top-1/2 h-px w-8 bg-border -translate-x-full" />
              <span className="hidden md:block absolute left-0 top-0 h-12 w-px bg-border -translate-x-8 -translate-y-12" />
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
                <ClipboardList className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold leading-tight">Secrétariat</p>
                <p className="text-[10px] opacity-80">Agenda, courrier, PV</p>
              </div>
            </Link>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Directions — grille responsive */}
          {others.length > 0 && (
            <div className="w-full px-2">
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 justify-items-center">
                {others.map((d) => (
                  <div key={d.id} className="flex flex-col items-center">
                    <div className="h-4 w-px bg-border" />
                    <DirectionColumn d={d} departments={departments.filter((x) => x.direction_id === d.id)} />
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
