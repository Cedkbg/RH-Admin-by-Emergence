import { Users, Building2, Briefcase, FileText } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { OrgChart } from "@/components/dashboard/OrgChart";
import { ModuleGrid } from "@/components/dashboard/ModuleGrid";
import { RecentActivities } from "@/components/dashboard/RecentActivities";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { MonthStats } from "@/components/dashboard/MonthStats";
import { useAgent } from "@/contexts/AgentContext";
import { directions } from "@/data/orgData";

const Index = () => {
  const { agents } = useAgent();

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 animate-fade-in">
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Agents" value={agents.length.toString()} trend="0" icon={Users} color="blue" />
        <KpiCard label="Directions" value={directions.length.toString()} trend="Stable" trendDirection="neutral" icon={Building2} color="green" />
        <KpiCard label="Postes Vacants" value="0" trend="0" icon={Briefcase} color="orange" />
        <KpiCard label="Documents" value="0" trend="0" icon={FileText} color="purple" />
      </div>

      {/* Organigramme */}
      <OrgChart />

      {/* Modules grid */}
      <ModuleGrid />

      {/* Bottom: activities / alerts / stats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RecentActivities />
        <AlertsPanel />
        <MonthStats />
      </div>
    </div>
  );
};

export default Index;

