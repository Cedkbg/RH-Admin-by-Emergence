import { Link } from "react-router-dom";
import { Maximize2, Minus, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { directions, type Direction } from "@/data/orgData";
import { colorClasses } from "@/data/modules";
import { useState, useEffect, useRef } from 'react';

function NodeBox({
  code, title, subtitle, className,
}: { code?: string; title: string; subtitle?: string; className?: string }) {
  return (
    <div className={cn(
      "flex min-w-[160px] md:min-w-[180px] items-center gap-3 rounded-lg px-4 py-3 text-primary-foreground shadow-md relative",
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
  const getDashboardPath = (code: string) => {
    const paths: Record<string, string> = {
      'DG': '/dg-dashboard',
      'D7': '/rh-dashboard',
      'D6': '/commercial-dashboard',
      'D4': '/finance-dashboard',
      'D3': '/operations-dashboard',
      'D5': '/risk-dashboard',
      'D2': '/product-dashboard',
      'D1': '/tech-dashboard'
    };
    return paths[code] || '#';
  };
  return (
    <Link to={getDashboardPath(d.code)} className="block hover:shadow-md transition-all">
      <div className="flex w-[120px] md:w-[140px] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm hover:-translate-y-1 cursor-pointer relative">
        <div className={cn("flex flex-col items-center gap-1 px-2 py-3 text-primary-foreground", c.bg)}>
          <d.icon className="h-5 w-5" />
          <p className="text-center text-[11px] md:text-xs font-semibold leading-tight">{d.name}</p>
          <p className="text-[10px] font-medium opacity-90">({d.code})</p>
        </div>
        <div className="px-2 py-2 text-center">
          <p className="text-[11px] font-medium leading-tight text-foreground">{d.managerTitle}</p>
        </div>
      </div>
    </Link>
  );
}

export function OrgChart() {
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <section className="rounded-xl border border-border bg-card p-4 md:p-5 shadow-sm">
      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-lg md:text-base font-semibold text-foreground">Organigramme de l'entreprise</h2>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button className="hidden sm:inline-flex rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90">
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

      <div className="w-full">
        <div className="flex flex-col items-center gap-3 py-6 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          
          {/* DG - Toujours centré */}
          <div className="w-full flex justify-center">
            <Link to="/dg-dashboard">
              <NodeBox 
                code="DG" 
                title="Directeur Général" 
                className="bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg text-white hover:shadow-xl cursor-pointer transition-all" 
              />
            </Link>
          </div>
          
          {/* Trait DG -> DGA */}
          <div className="h-6 md:h-8 w-px bg-gradient-to-b from-gray-400 to-gray-300 mx-auto"></div>
          
          {/* DGA */}
          <div className="w-full flex justify-center">
            <Link to="/dga-dashboard">
              <NodeBox 
                code="DGA" 
                title="Directeur Général Adjoint" 
                className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:shadow-xl cursor-pointer transition-all" 
              />
            </Link>
          </div>
          
          {/* Trait DGA -> Manager */}
          <div className="h-6 md:h-8 w-px bg-gradient-to-b from-gray-400 to-gray-300 mx-auto"></div>
          
          {/* Manager */}
          <div className="w-full flex justify-center">
            <Link to="/manager-dashboard">
              <NodeBox 
                code="MAN" 
                title="Manager Général" 
                subtitle="Direction de l'entreprise" 
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg hover:shadow-xl cursor-pointer transition-all" 
              />
            </Link>
          </div>
          
          {/* Trait horizontal Manager -> Secrétaire - rapproché */}
          <div className="w-full h-6 md:h-8 relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 w-32 md:w-48 h-px bg-gradient-to-r from-emerald-400 opacity-80 top-1/2 -translate-y-1/2 md:translate-x-4 md:-translate-y-1/2"></div>
          </div>
          
      {/* Secrétaire - rapproché du centre */}
          <div className="w-full flex justify-end pr-2 md:pr-4 lg:pr-6 self-end">
            <Link to="/secretary-dashboard">
              <NodeBox 
                title="Secrétaire" 
                subtitle="Assistante exécutive" 
                className="bg-indigo-600 shadow-lg hover:shadow-xl cursor-pointer transition-all ring-1 ring-indigo-400/50" 
              />
            </Link>
          </div>
          
          {/* Trait vertical depuis centre Secrétaire */}
          <div className="w-full flex justify-end pr-2 md:pr-4 lg:pr-6">
            <div className="h-24 md:h-36 w-px bg-gradient-to-b from-indigo-400 to-gray-400 opacity-80 mx-auto"></div>
          </div>
          
          {/* Directions - responsive grid */}
          <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 px-2 md:px-4">
            {directions.filter((d) => !['DG', 'DGA'].includes(d.code)).slice(0, isMobile ? 8 : 10).map((d, i) => (
              <div key={d.id} className="flex flex-col items-center gap-1">
                <div className="h-2 md:h-3 w-px bg-gray-300 opacity-50 mx-auto"></div>
                <DirectionCard d={d} />
              </div>
            ))}
          </div>
          
        </div>
      </div>
    </section>
  );
}

