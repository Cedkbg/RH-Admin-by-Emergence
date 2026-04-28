import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, UserCog, Briefcase, ClipboardList, Users, BarChart3, CheckSquare, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { modules, colorClasses } from "@/data/modules";

const MANAGER_MODULE_IDS = ["dashboard", "tasks", "reports", "communication", "performance", "attendance"];

export default function ManagerGeneral() {
  const navigate = useNavigate();
  const managerModules = MANAGER_MODULE_IDS
    .map((id) => modules.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => !!m);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate("/organigramme")} className="-ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Organigramme
      </Button>

      {/* Header */}
      <div className="flex items-start gap-4 p-6 rounded-xl border bg-card shadow-sm">
        <div className="p-4 rounded-xl text-white shrink-0 bg-slate-600">
          <UserCog className="h-7 w-7" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Manager Général</h1>
            <Badge variant="outline" className="font-mono">MG</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-medium">Rôle :</span> Supervise l'exécution opérationnelle de toutes les directions
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Rattaché au DGA. Encadre l'Assistant de Direction et le Secrétariat.
            Coordonne les directions opérationnelles au quotidien.
          </p>
        </div>
      </div>

      {/* Hiérarchie */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold mb-4">Hiérarchie</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link to="/direction/DG" className="p-4 rounded-lg border bg-card hover:shadow-md transition flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-800 text-white"><UserCog className="h-4 w-4" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Supérieur N+2</p>
              <p className="text-sm font-medium">Directeur Général</p>
            </div>
          </Link>
          <Link to="/direction/DGA" className="p-4 rounded-lg border bg-card hover:shadow-md transition flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-700 text-white"><UserCog className="h-4 w-4" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Supérieur direct</p>
              <p className="text-sm font-medium">DGA</p>
            </div>
          </Link>
          <div className="p-4 rounded-lg border-2 border-primary bg-card flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-600 text-white"><UserCog className="h-4 w-4" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Vous êtes ici</p>
              <p className="text-sm font-medium">Manager Général</p>
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link to="/assistant" className="p-3 rounded-lg border bg-card hover:shadow-md transition flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-600 text-white"><Briefcase className="h-4 w-4" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Subordonné</p>
              <p className="text-sm font-medium">Assistant de Direction</p>
            </div>
          </Link>
          <Link to="/secretariat" className="p-3 rounded-lg border bg-card hover:shadow-md transition flex items-center gap-3">
            <div className="p-2 rounded-lg bg-pink-600 text-white"><ClipboardList className="h-4 w-4" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Subordonné</p>
              <p className="text-sm font-medium">Secrétariat</p>
            </div>
          </Link>
        </div>
      </Card>

      {/* Modules opérationnels */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold mb-3">Outils du Manager Général</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {managerModules.map((m) => {
            const MIcon = m.icon;
            const mc = colorClasses[m.color];
            return (
              <Link key={m.id} to={m.path}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-md hover:-translate-y-0.5 transition">
                <div className={cn("p-2 rounded-lg", mc.iconBg)}>
                  <MIcon className={cn("h-4 w-4", mc.text)} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.shortDescription}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>

      {/* Responsabilités */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold mb-3">Responsabilités clés</h2>
        <ul className="space-y-2 text-sm">
          <li className="flex gap-2"><CheckSquare className="h-4 w-4 mt-0.5 text-primary shrink-0" /> Pilotage opérationnel quotidien des directions</li>
          <li className="flex gap-2"><Users className="h-4 w-4 mt-0.5 text-primary shrink-0" /> Coordination inter-directions et arbitrages</li>
          <li className="flex gap-2"><BarChart3 className="h-4 w-4 mt-0.5 text-primary shrink-0" /> Suivi des indicateurs de performance globaux</li>
          <li className="flex gap-2"><Megaphone className="h-4 w-4 mt-0.5 text-primary shrink-0" /> Communication descendante vers les équipes</li>
        </ul>
      </Card>
    </div>
  );
}
