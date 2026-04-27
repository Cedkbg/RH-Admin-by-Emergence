import { useEffect, useRef, useState } from "react";
import { Maximize2, Minus, Plus, User } from "lucide-react";
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

function NodeBox({ code, title, subtitle, className }: { code?: string; title: string; subtitle?: string; className?: string }) {
  return (
    <div className={cn("flex min-w-[160px] md:min-w-[180px] items-center gap-3 rounded-lg px-4 py-3 text-primary-foreground shadow-md", className)}>
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

function DirectionCard({ d }: { d: DirectionRow }) {
  const code = d.code || "";
  const Icon = iconForCode(code);
  const color = colorForCode(code);
  const c = colorClasses[color];
  return (
    <div className="flex w-[120px] md:w-[140px] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className={cn("flex flex-col items-center gap-1 px-2 py-3 text-primary-foreground", c.bg)}>
        <Icon className="h-5 w-5" />
        <p className="text-center text-[11px] md:text-xs font-semibold leading-tight">{d.name}</p>
        {code && <p className="text-[10px] font-medium opacity-90">({code})</p>}
      </div>
      <div className="px-2 py-2 text-center">
        <p className="text-[11px] font-medium leading-tight text-foreground">
          {d.manager_name || "—"}
        </p>
      </div>
    </div>
  );
}

export function OrgChart() {
  const [directions, setDirections] = useState<DirectionRow[]>([]);
  const [zoom, setZoom] = useState(1);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    supabase
      .from("directions")
      .select("id,code,name,manager_name")
      .order("code", { ascending: true })
      .then(({ data }) => setDirections(data || []));
  }, []);

  const zoomIn = () => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)));
  const toggleFullscreen = async () => {
    const el = sectionRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.().catch(() => {});
    } else {
      await document.exitFullscreen?.().catch(() => {});
    }
  };

  return (
    <section ref={sectionRef} className="rounded-xl border border-border bg-card p-4 md:p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">Organigramme de l'entreprise</h2>
        <div className="flex items-center gap-1 text-muted-foreground">
          <button type="button" onClick={zoomIn} title="Zoomer" className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-secondary"><Plus className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={zoomOut} title="Dézoomer" className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-secondary"><Minus className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={toggleFullscreen} title="Plein écran" className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-secondary"><Maximize2 className="h-3.5 w-3.5" /></button>
          <span className="ml-2 text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      {directions.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Aucune direction enregistrée. L'administrateur peut en ajouter depuis la page Organigramme.
        </div>
      ) : (
        <div className="overflow-auto">
          <div
            className="flex flex-col items-center gap-3 py-6 mx-auto max-w-4xl px-4 transition-transform"
            style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
          >
            <NodeBox code="DG" title="Direction Générale" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg" />
            <div className="h-6 w-px bg-gray-300" />
            <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {directions.filter((d) => d.code !== "DG").map((d) => (
                <div key={d.id} className="flex flex-col items-center gap-1">
                  <div className="h-2 w-px bg-gray-300" />
                  <DirectionCard d={d} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
