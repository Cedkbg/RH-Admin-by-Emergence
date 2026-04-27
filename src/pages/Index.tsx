import { useEffect, useState } from "react";
import { Users, Building2, Briefcase, FileText } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { OrgChart } from "@/components/dashboard/OrgChart";
import { ModuleGrid } from "@/components/dashboard/ModuleGrid";
import { RecentActivities } from "@/components/dashboard/RecentActivities";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { MonthStats } from "@/components/dashboard/MonthStats";
<<<<<<< HEAD
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [stats, setStats] = useState({ employees: 0, directions: 0 });

  useEffect(() => {
    (async () => {
      const [{ count: empCount }, { count: dirCount }] = await Promise.all([
        supabase.from("employees").select("*", { count: "exact", head: true }),
        supabase.from("directions").select("*", { count: "exact", head: true }),
      ]);
      setStats({ employees: empCount ?? 0, directions: dirCount ?? 0 });
    })();
  }, []);
=======
import { useAgent } from "@/contexts/AgentContext";
import { useAuth } from "@/contexts/AuthContext";
import { directions } from "@/data/orgData";

const Index = () => {
  const { isAuthenticated } = useAuth();
  const { agents } = useAgent();
>>>>>>> 07b8eab ( file the login)

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">EMERGENCE DRC — Système de Gestion RH</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Agents" value={stats.employees.toString()} icon={Users} color="blue" />
        <KpiCard label="Directions" value={stats.directions.toString()} icon={Building2} color="green" />
        <KpiCard label="Postes vacants" value="0" icon={Briefcase} color="orange" />
        <KpiCard label="Documents" value="0" icon={FileText} color="purple" />
      </div>

      <OrgChart />
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
