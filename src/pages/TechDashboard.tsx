import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Code2, 
  Server, 
  Bug, 
  DownloadCloud,
  Cpu
} from "lucide-react";
import { techDepartments } from "@/data/orgData";
import { DirectionDepartments } from "@/components/dashboard/DirectionDepartments";

const TechDashboard = () => {
  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
            <Code2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Direction Technologie <span className="text-sm font-normal text-blue-600">(D1)</span>
            </h1>
            <p className="text-gray-600">Infrastructure, développement, sécurité</p>
          </div>
        </div>
      </div>

      {/* KPI Tech */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardKpi icon={Server} title="Serveurs" value="247" trend="+4" unit="/24h" color="blue" />
        <DashboardKpi icon={Code2} title="Commits" value="1,284" trend="+18%" color="emerald" />
        <DashboardKpi icon={Bug} title="Tickets ouverts" value="42" trend="-3" color="orange" />
        <DashboardKpi icon={DownloadCloud} title="Déploiement" value="98.7%" color="purple" />
      </div>

      {/* Départements Technologie */}
      <DirectionDepartments
        title="Départements de la Direction Technologie"
        departments={techDepartments}
        icon={Cpu}
        colorClass="text-blue-600"
      />

      {/* Metrics Tech */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <TechMetricBox title="Uptime Systèmes">
          <div className="h-64 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-2xl p-6">
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>Production <Badge>99.98%</Badge></div>
              <div>Staging <Badge>100%</Badge></div>
              <div>Dev <Badge>99.5%</Badge></div>
              <div>Backup <Badge>100%</Badge></div>
            </div>
            <div className="text-3xl font-bold text-gray-900">24h OK</div>
          </div>
        </TechMetricBox>

        <TechMetricBox title="Top Bugs critiques">
          <div className="h-64 space-y-3 p-4 bg-white rounded-2xl">
            <BugItem priority="P1" title="Auth timeout" count="5" />
            <BugItem priority="P2" title="API rate limit" count="12" />
            <BugItem priority="P3" title="UI mobile" count="8" />
          </div>
        </TechMetricBox>

        <TechMetricBox title="Pipeline DevOps">
          <div className="h-64 p-4 bg-gradient-to-b from-purple-50 to-indigo-50 rounded-2xl space-y-3">
            <div className="flex justify-between text-sm">
              <span>Builds</span><span className="font-bold text-emerald-600">189</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tests</span><span className="font-bold text-emerald-600">94.2%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Déploys</span><span className="font-bold text-blue-600">23</span>
            </div>
          </div>
        </TechMetricBox>
      </div>

      {/* Actions Tech */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TechActionBox title="🚨 Incidents critiques">
          <ActionRow icon="🔴" status="P1" title="Prod outage" time="2min" />
          <ActionRow icon="🟡" status="P2" title="DB slow" time="15min" />
        </TechActionBox>

        <TechActionBox title="📊 Metriques systèmes">
          <ActionRow icon="🟢" status="OK" title="CPU <70%" time="Live" />
          <ActionRow icon="🟢" status="OK" title="RAM 65%" time="Live" />
          <ActionRow icon="🟡" status="Warn" title="Disk 85%" time="Live" />
        </TechActionBox>

        <TechActionBox title="⚡ Déploys rapides">
          <ActionRow icon="🚀" status="Success" title="v2.3.4-prod" time="3min" />
          <ActionRow icon="⏳" status="Running" title="v2.3.5-staging" time="1min" />
        </TechActionBox>
      </div>
    </div>
  );
};

// Composants spécifiques Tech
const DashboardKpi = ({ icon: Icon, title, value, trend, unit, color }: any) => (
  <div className="group bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/50 hover:shadow-2xl transition-all hover:-translate-y-1">
    <div className="flex items-start gap-3 mb-3">
      <div className={`p-2 rounded-xl bg-gradient-to-r ${color === 'blue' ? 'from-blue-500 to-blue-600' : color === 'emerald' ? 'from-emerald-500 to-emerald-600' : color === 'orange' ? 'from-orange-500 to-orange-600' : 'from-purple-500 to-purple-600'}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value} {unit}</p>
      </div>
    </div>
    <Badge className={`ml-auto ${color === 'blue' ? 'bg-blue-100 text-blue-800' : color === 'emerald' ? 'bg-emerald-100 text-emerald-800' : color === 'orange' ? 'bg-orange-100 text-orange-800' : 'bg-purple-100 text-purple-800'}`}>
      {trend}
    </Badge>
  </div>
);

const TechMetricBox = ({ title, children }: any) => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
    <h3 className="font-semibold text-gray-900 p-6 pb-4 border-b border-gray-100">{title}</h3>
    <div className="p-6">
      {children}
    </div>
  </div>
);

const BugItem = ({ priority, title, count }: any) => (
  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
    <Badge variant={priority === 'P1' ? "destructive" : "secondary"}>{priority}</Badge>
    <span className="font-medium">{title}</span>
    <span className="ml-auto font-bold text-orange-600">{count}</span>
  </div>
);

const TechActionBox = ({ title, children }: any) => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
    <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
    {children}
  </div>
);

const ActionRow = ({ icon, status, title, time }: any) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-2 last:mb-0 hover:bg-gray-100 transition-colors">
    <span className="text-lg">{icon}</span>
    <div className="flex-1">
      <p className="font-medium text-gray-900">{title}</p>
      <p className="text-sm text-gray-500">{time}</p>
    </div>
    <Badge>{status}</Badge>
  </div>
);

export default TechDashboard;

