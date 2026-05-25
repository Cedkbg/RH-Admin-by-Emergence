import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, Building2, Briefcase, FileText, TrendingUp, AlertTriangle,
  Crown, ShieldCheck, BarChart3, Megaphone, Scale, Wallet, GitBranch,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { LiveStats } from "@/components/dashboard/LiveStats";


interface Stats {
  employees: number;
  activeEmployees: number;
  directions: number;
  departments: number;
  openJobs: number;
  candidates: number;
  pendingLeaves: number;
  documents: number;
  trainings: number;
  totalPayroll: number;
}

const exclusiveTools = [
  { icon: BarChart3,  label: "Rapports stratégiques",   desc: "Vue consolidée de l'organisation",  to: "/rapports",       color: "bg-indigo-600" },
  { icon: Megaphone,  label: "Communication corporate", desc: "Annonces officielles",             to: "/communication",  color: "bg-pink-600" },
  { icon: Scale,      label: "Affaires juridiques",     desc: "Dossiers sensibles et contentieux", to: "/juridique",     color: "bg-amber-700" },
  { icon: Wallet,     label: "Vue masse salariale",     desc: "Pilotage budgétaire global",       to: "/paie",           color: "bg-emerald-700" },
  { icon: GitBranch,  label: "Organigramme global",     desc: "Structure de l'entreprise",        to: "/organigramme",   color: "bg-slate-700" },
  { icon: ShieldCheck,label: "Validation & arbitrages", desc: "Décisions de haut niveau",         to: "/taches",         color: "bg-rose-700" },
];

export function ExecutiveDashboard() {
  const [stats, setStats] = useState<Stats>({
    employees: 0, activeEmployees: 0, directions: 0, departments: 0,
    openJobs: 0, candidates: 0, pendingLeaves: 0, documents: 0,
    trainings: 0, totalPayroll: 0,
  });

  useEffect(() => {
    (async () => {
      const [emp, empActive, dir, dept, jobs, cand, leaves, docs, train, pay] = await Promise.all([
        supabase.from("employees").select("*", { count: "exact", head: true }),
        supabase.from("employees").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("directions").select("*", { count: "exact", head: true }),
        supabase.from("departments").select("*", { count: "exact", head: true }),
        supabase.from("job_offers").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("candidates").select("*", { count: "exact", head: true }),
        supabase.from("leave_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("documents").select("*", { count: "exact", head: true }),
        supabase.from("trainings").select("*", { count: "exact", head: true }),
        supabase.from("payroll").select("net_pay"),
      ]);
      const total = (pay.data || []).reduce((s: number, r: any) => s + Number(r.net_pay || 0), 0);
      setStats({
        employees: emp.count ?? 0,
        activeEmployees: empActive.count ?? 0,
        directions: dir.count ?? 0,
        departments: dept.count ?? 0,
        openJobs: jobs.count ?? 0,
        candidates: cand.count ?? 0,
        pendingLeaves: leaves.count ?? 0,
        documents: docs.count ?? 0,
        trainings: train.count ?? 0,
        totalPayroll: total,
      });
    })();
  }, []);

  const retention = stats.employees > 0
    ? Math.round((stats.activeEmployees / stats.employees) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Bandeau exécutif */}
      <Card className="p-5 bg-gradient-to-r from-slate-900 to-slate-700 text-white border-0">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-white/15">
            <Crown className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider opacity-80">Tableau de bord exécutif</p>
            <h2 className="text-xl font-bold">Vue d'ensemble — Direction Générale</h2>
          </div>
        </div>
      </Card>

      {/* Stats temps réel pro */}
      <LiveStats variant="global" />

      {/* KPIs stratégiques (snapshot initial) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">

        <StatCard icon={Users}        label="Effectif total"   value={stats.employees}      hint={`${stats.activeEmployees} actifs`} color="bg-blue-600" />
        <StatCard icon={Building2}    label="Directions"       value={stats.directions}     hint={`${stats.departments} départements`} color="bg-emerald-600" />
        <StatCard icon={Briefcase}    label="Postes ouverts"   value={stats.openJobs}       hint={`${stats.candidates} candidats`} color="bg-orange-600" />
        <StatCard icon={AlertTriangle}label="Congés en attente"value={stats.pendingLeaves}  hint="À arbitrer" color="bg-rose-600" />
        <StatCard icon={TrendingUp}   label="Taux d'activité"  value={`${retention}%`}      hint="Agents actifs" color="bg-indigo-600" />
      </div>

      {/* Indicateurs financiers / RH */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Masse salariale cumulée</p>
          <p className="mt-2 text-2xl font-bold">
            {stats.totalPayroll.toLocaleString("fr-FR")} <span className="text-sm font-normal text-muted-foreground">CDF</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">Tous bulletins confondus</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Documents officiels</p>
          <p className="mt-2 text-2xl font-bold">{stats.documents}</p>
          <p className="text-xs text-muted-foreground mt-1">Archives organisationnelles</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Formations programmées</p>
          <p className="mt-2 text-2xl font-bold">{stats.trainings}</p>
          <p className="text-xs text-muted-foreground mt-1">Plan de développement</p>
        </Card>
      </div>

      {/* Outils exclusifs DG */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="h-4 w-4 text-amber-600" />
          <h3 className="text-base font-semibold">Prérogatives exclusives du Directeur Général</h3>
          <Badge variant="outline" className="ml-2 text-[10px]">Accès restreint</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {exclusiveTools.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.label}
                to={t.to}
                className="group flex items-start gap-3 p-4 rounded-lg border bg-card hover:shadow-md hover:-translate-y-0.5 transition"
              >
                <div className={cn("p-2.5 rounded-lg text-white shrink-0", t.color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold group-hover:text-primary transition">{t.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, hint, color,
}: { icon: any; label: string; value: number | string; hint?: string; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg text-white", color)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider truncate">{label}</p>
          <p className="text-lg font-bold leading-tight">{value}</p>
          {hint && <p className="text-[10px] text-muted-foreground truncate">{hint}</p>}
        </div>
      </div>
    </Card>
  );
}
