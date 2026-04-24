import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, 
  Target, 
  BarChart3, 
  FileCheck, 
  AlertOctagon, 
  Zap 
} from "lucide-react";
import { DirectionDepartments } from "@/components/dashboard/DirectionDepartments";
import { riskDepartments } from "@/data/orgData";

const RiskDashboard = () => {
  return (
    <div className="p-6 bg-gradient-to-br from-orange-50 to-red-50 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl">
            <ShieldAlert className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Direction Risques <span className="text-sm font-normal text-orange-600">(D5)</span>
            </h1>
            <p className="text-gray-600">Gestion risques, conformité, contrôle interne</p>
          </div>
        </div>
      </div>

      {/* KPI Risk */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardKpi icon={ShieldAlert} title="Risques critiques" value="3" trend="0" color="red" />
        <DashboardKpi icon={Target} title="Score risque global" value="2.4/5" trend="-0.1" color="orange" />
        <DashboardKpi icon={BarChart3} title="Audits OK" value="14/16" trend="+1" color="emerald" />
        <DashboardKpi icon={FileCheck} title="Conformité" value="92%" trend="+2%" color="blue" />
      </div>

      {/* Départements Risques */}
      <DirectionDepartments
        title="Départements de la Direction Risques"
        departments={riskDepartments}
        icon={ShieldAlert}
        colorClass="text-orange-600"
      />

      {/* Metrics Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <RiskMetricBox title="Heatmap risques">
          <div className="h-64 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl p-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <RiskHeat cell="Opérationnel" score="🟡 2.8" />
              <RiskHeat cell="Financier" score="🟢 1.9" />
              <RiskHeat cell="Réglementaire" score="🔴 4.1" />
              <RiskHeat cell="Réputationnel" score="🟡 2.4" />
            </div>
            <div className="text-xl font-bold text-orange-900">Focus réglementaire</div>
          </div>
        </RiskMetricBox>

        <RiskMetricBox title="Risques critiques">
          <div className="h-64 space-y-3 p-4 bg-white rounded-2xl">
            <RiskItem level="Critique" title="RGPD CNIL" probability="25%" impact="€1.2M" />
            <RiskItem level="Critique" title="KYC/AML" probability="18%" impact="€850K" />
            <RiskItem level="Majeur" title="Cyber" probability="12%" impact="€450K" />
          </div>
        </RiskMetricBox>

        <RiskMetricBox title="Contrôles récents">
          <div className="h-64 p-4 bg-gradient-to-b from-blue-50 to-emerald-50 rounded-2xl space-y-3">
            <div className="flex justify-between text-sm">
              <span>Audits effectués</span><span className="font-bold">16</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Anomalies bloquantes</span><span className="font-bold text-red-600">2</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Actions correctives</span><span className="font-bold">14/18</span>
            </div>
            <div className="text-lg font-bold text-emerald-600">87% OK</div>
          </div>
        </RiskMetricBox>
      </div>

      {/* Actions Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RiskActionBox title="🚨 Actions immédiates">
          <ActionRow icon="🔴" priority="P1" title="Plan RGPD CNIL" due="24h" />
          <ActionRow icon="🟡" priority="P2" title="Test pentest" due="3 jours" />
        </RiskActionBox>

        <RiskActionBox title="📋 Audits programmés">
          <ActionRow icon="📅" type="Interne" date="15/04" scope="IT" />
          <ActionRow icon="📅" type="Externe" date="28/04" scope="Finance" />
          <ActionRow icon="📅" type="Flash" date="08/04" scope="Opérations" />
        </RiskActionBox>

        <RiskActionBox title="📊 Métriques conformité">
          <div className="space-y-3">
            <ComplianceMetric label="PCI-DSS" status="Conforme" score="98%" />
            <ComplianceMetric label="ISO 27001" status="Audit" score="94%" />
            <ComplianceMetric label="GDPR" status="À risque" score="87%" />
          </div>
        </RiskActionBox>
      </div>
    </div>
  );
};

// Composants Risk
const DashboardKpi = ({ icon: Icon, title, value, trend, color }: any) => (
  <div className="group bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/50 hover:shadow-2xl transition-all hover:-translate-y-1">
    <div className="flex items-start gap-3 mb-3">
      <div className={`p-2 rounded-xl bg-gradient-to-r ${color === 'red' ? 'from-red-500 to-orange-600' : color === 'orange' ? 'from-orange-500 to-yellow-600' : color === 'emerald' ? 'from-emerald-500 to-teal-600' : 'from-blue-500 to-indigo-600'}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
    <Badge className={`ml-auto ${color === 'red' ? 'bg-red-100 text-red-800' : color === 'orange' ? 'bg-orange-100 text-orange-800' : color === 'emerald' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
      {trend}
    </Badge>
  </div>
);

const RiskMetricBox = ({ title, children }: any) => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
    <h3 className="font-semibold text-gray-900 p-6 pb-4 border-b border-gray-100">{title}</h3>
    <div className="p-6">
      {children}
    </div>
  </div>
);

const RiskHeat = ({ cell, score }: any) => (
  <div className="p-3 bg-white rounded-lg border shadow-sm">
    <p className="text-xs text-gray-600 uppercase font-medium">{cell}</p>
    <p className="text-lg font-bold">{score}</p>
  </div>
);

const RiskItem = ({ level, title, probability, impact }: any) => (
  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
    <Badge variant="destructive">{level}</Badge>
    <div className="flex-1">
      <p className="font-medium text-gray-900">{title}</p>
      <div className="flex gap-4 text-sm text-gray-600 mt-1">
        <span>Prob: {probability}</span>
        <span>Impact: {impact}</span>
      </div>
    </div>
  </div>
);

const RiskActionBox = ({ title, children }: any) => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
    <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
    {children}
  </div>
);

const ActionRow = ({ icon, priority, title, due }: any) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-2 last:mb-0 hover:bg-gray-100">
    <span className="text-lg">{icon}</span>
    <div className="flex-1">
      <p className="font-medium text-gray-900">{title}</p>
      <p className="text-sm text-red-600">{due}</p>
    </div>
    <Badge variant="destructive">{priority}</Badge>
  </div>
);

const ComplianceMetric = ({ label, status, score }: any) => (
  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
    <span className="font-medium min-w-[100px]">{label}</span>
    <Badge>{status}</Badge>
    <span className="font-mono ml-auto">{score}</span>
  </div>
);

export default RiskDashboard;

