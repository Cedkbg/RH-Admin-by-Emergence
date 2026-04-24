import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Settings, 
  Truck, 
  Clock, 
  Database, 
  Shield, 
  Activity 
} from "lucide-react";
import { DirectionDepartments } from "@/components/dashboard/DirectionDepartments";
import { opsDepartments } from "@/data/orgData";

const OperationsDashboard = () => {
  return (
    <div className="p-6 bg-gradient-to-br from-teal-50 to-cyan-50 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Direction Opérations <span className="text-sm font-normal text-teal-600">(D3)</span>
            </h1>
            <p className="text-gray-600">Processus, logistique, performance opérationnelle</p>
          </div>
        </div>
      </div>

      {/* KPI Operations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardKpi icon={Truck} title="Processus actifs" value="156" trend="+1" color="teal" />
        <DashboardKpi icon={Clock} title="Temps moyen traitement" value="2.8h" trend="-12%" color="emerald" />
        <DashboardKpi icon={Activity} title="SLA respecté" value="97.3%" trend="+0.4%" color="blue" />
        <DashboardKpi icon={Database} title="Volume traité" value="4.2M" unit="/jour" trend="+8%" color="purple" />
      </div>

      {/* Départements Opérations */}
      <DirectionDepartments
        title="Départements de la Direction Opérations"
        departments={opsDepartments}
        icon={Settings}
        colorClass="text-teal-600"
      />

      {/* Metrics Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <OpsMetricBox title="Performance par processus">
          <div className="h-64 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl p-6">
            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div>KYC <Badge variant="default">98%</Badge></div>
              <div>Onboarding <Badge variant="default">96%</Badge></div>
              <div>Transactions <Badge variant="default">99%</Badge></div>
              <div>Reporting <Badge variant="default">94%</Badge></div>
            </div>
            <div className="text-3xl font-bold text-teal-900">Objectif {'>'}95%</div>
          </div>
        </OpsMetricBox>

        <OpsMetricBox title="Bouteilles d'étranglement">
          <div className="h-64 space-y-3 p-4 bg-white rounded-2xl">
            <BottleneckItem delay="47min" process="KYC manuel" impact="High" />
            <BottleneckItem delay="23min" process="Validation docs" impact="Medium" />
            <BottleneckItem delay="12min" process="Signature" impact="Low" />
          </div>
        </OpsMetricBox>

        <OpsMetricBox title="Capacité systèmes">
          <div className="h-64 p-4 bg-gradient-to-b from-blue-50 to-teal-50 rounded-2xl space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Transactions/s</span><span className="font-bold">1,247</span>
            </div>
            <div className="flex justify-between">
              <span>Capacité max</span><span className="font-bold text-emerald-600">2,500</span>
            </div>
            <div className="flex justify-between">
              <span>Utilisation</span><span className="font-bold">49%</span>
            </div>
            <div className="text-lg font-bold text-teal-600">Headroom OK</div>
          </div>
        </OpsMetricBox>
      </div>

      {/* Actions Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <OpsActionBox title="⚠️ Processus en retard">
          <ActionRow icon="🔴" status="Critique" title="KYC batch #456" delay="2h47" />
          <ActionRow icon="🟡" status="Attention" title="Onboarding VIP" delay="1h23" />
        </OpsActionBox>

        <OpsActionBox title="🎯 Objectifs semaine">
          <ActionRow icon="📊" status="92%" title="SLA global" target="98%" />
          <ActionRow icon="⚡" status="1.8h" title="Temps moyen" target="2h" />
          <ActionRow icon="🔄" status="4.1M" title="Volume" target="4.5M" />
        </OpsActionBox>

        <OpsActionBox title="🔧 Automatisations">
          <ActionRow icon="🤖" status="Live" title="RPA KYC" savings="€12k/mois" />
          <ActionRow icon="✅" status="Deployé" title="Workflow Onboarding" speed="+30%" />
          <ActionRow icon="⏳" status="Test" title="AI validation" eta="Q1" />
        </OpsActionBox>
      </div>
    </div>
  );
};

// Composants Operations
const DashboardKpi = ({ icon: Icon, title, value, trend, unit, color }: any) => (
  <div className="group bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/50 hover:shadow-2xl transition-all hover:-translate-y-1">
    <div className="flex items-start gap-3 mb-3">
      <div className={`p-2 rounded-xl bg-gradient-to-r ${color === 'teal' ? 'from-teal-500 to-cyan-600' : color === 'emerald' ? 'from-emerald-500 to-teal-600' : color === 'blue' ? 'from-blue-500 to-cyan-600' : 'from-purple-500 to-indigo-600'}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value} {unit || ''}</p>
      </div>
    </div>
    <Badge className={`ml-auto ${color === 'teal' ? 'bg-teal-100 text-teal-800' : color === 'emerald' ? 'bg-emerald-100 text-emerald-800' : color === 'blue' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
      {trend}
    </Badge>
  </div>
);

const OpsMetricBox = ({ title, children }: any) => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
    <h3 className="font-semibold text-gray-900 p-6 pb-4 border-b border-gray-100">{title}</h3>
    <div className="p-6">
      {children}
    </div>
  </div>
);

const BottleneckItem = ({ delay, process, impact }: any) => (
  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
    <div className="font-mono text-sm font-bold text-orange-600">{delay}</div>
    <span className="font-medium">{process}</span>
    <Badge variant="destructive" className="ml-auto">{impact}</Badge>
  </div>
);

const OpsActionBox = ({ title, children }: any) => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
    <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
    {children}
  </div>
);

const ActionRow = ({ icon, status, title, delay, target }: any) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-2 last:mb-0 hover:bg-gray-100 transition-colors">
    <span className="text-lg">{icon}</span>
    <div className="flex-1">
      <p className="font-medium text-gray-900">{title}</p>
      {delay && <p className="text-sm text-orange-600 font-mono">{delay}</p>}
      {target && <p className="text-sm text-gray-500">{target}</p>}
    </div>
    <Badge>{status}</Badge>
  </div>
);

export default OperationsDashboard;

