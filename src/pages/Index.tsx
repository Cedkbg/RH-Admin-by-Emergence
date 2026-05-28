import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Users, Building2, Briefcase, FileText } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ModuleGrid } from "@/components/dashboard/ModuleGrid";
import { RecentActivities } from "@/components/dashboard/RecentActivities";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { MonthStats } from "@/components/dashboard/MonthStats";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AgentDashboard from "./AgentDashboard";

const STAFF_ROLES = ["admin", "dg", "dga", "manager", "rh", "secretaire", "assistant_direction"];

const Index = () => {
  const { user, loading: authLoading, roles, rolesLoading } = useAuth();
  const [stats, setStats] = useState({ employees: 0, directions: 0, jobs: 0, documents: 0 });
  const isStaff = roles.some((r: string) => STAFF_ROLES.includes(r));

  // Charger les stats si staff
  useEffect(() => {
    if (authLoading || rolesLoading || !isStaff) return;
    
    (async () => {
      const [emp, dir, jobs, docs] = await Promise.all([
        supabase.from("employees").select("*", { count: "exact", head: true }),
        supabase.from("directions").select("*", { count: "exact", head: true }),
        supabase.from("job_offers").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("documents").select("*", { count: "exact", head: true }),
      ]);
      setStats({
        employees: emp.count ?? 0,
        directions: dir.count ?? 0,
        jobs: jobs.count ?? 0,
        documents: docs.count ?? 0,
      });
    })();
  }, [authLoading, rolesLoading, isStaff]);

  // Si auth pas pret, on attend un peu
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Connexion en cours...</div>
      </div>
    );
  }

  // Si pas d'user (race possible iOS Safari), redirige proprement via React Router
  if (!user) {
    return <Navigate to="/agent/login" replace />;
  }

  if (rolesLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Vérification des accès...</div>
      </div>
    );
  }

  // Afficher dashboard agent si:
  // - Pas staff (pas de roles staff)
  // - rolesLoading trop long (plus de 3 secondes)
  if (!isStaff) {
    return <AgentDashboard />;
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">EMERGENCE DRC — Systeme de Gestion RH</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Agents" value={stats.employees.toString()} icon={Users} color="blue" />
        <KpiCard label="Directions" value={stats.directions.toString()} icon={Building2} color="green" />
        <KpiCard label="Postes vacants" value={stats.jobs.toString()} icon={Briefcase} color="orange" />
        <KpiCard label="Documents" value={stats.documents.toString()} icon={FileText} color="purple" />
      </div>

      <ModuleGrid />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RecentActivities />
        <AlertsPanel />
        <MonthStats />
      </div>
    </div>
  );
};

export default Index;
