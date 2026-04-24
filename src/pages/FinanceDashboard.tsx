import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, 
  TrendingUp, 
  PieChart, 
  FileText, 
  AlertTriangle, 
  Calculator,
  TrendingUp as TrendingUpIcon
} from "lucide-react";
import { DirectionDepartments } from "@/components/dashboard/DirectionDepartments";
import { financeDepartments } from "@/data/orgData";

const FinanceDashboard = () => {
  return (
    <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Direction Financière <span className="text-sm font-normal text-indigo-600">(D4)</span>
            </h1>
            <p className="text-gray-600">Comptabilité, trésorerie, reporting financier</p>
          </div>
        </div>
      </div>

      {/* KPI Finance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardKpi icon={DollarSign} title="CA Mois" value="€2.84M" trend="+8.2%" color="indigo" />
        <DashboardKpi icon={TrendingUp} title="EBITDA" value="€847K" trend="+12%" color="emerald" />
        <DashboardKpi icon={Calculator} title="Trésorerie" value="€4.2M" trend="-€150K" color="blue" />
        <DashboardKpi icon={PieChart} title="Marge" value="29.8%" trend="+1.2pts" color="purple" />
      </div>

      {/* Départements Financière */}
      <DirectionDepartments
        title="Départements de la Direction Financière"
        departments={financeDepartments}
        icon={TrendingUpIcon}
        colorClass="text-indigo-600"
      />

      {/* Metrics Finance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <FinanceMetricBox title="P&L Mois courant">
          <div className="h-64 bg-gradient-to-r from-indigo-50 to-emerald-50 rounded-2xl p-6">
            <div className="space-y-3 mb-6 text-sm">
              <PLRow label="Chiffre d'Affaires" value="€2.84M" color="emerald" />
              <PLRow label="Coûts variables" value="€1.67M" color="orange" />
              <PLRow label="Marge brute" value="€1.17M" color="blue" />
              <PLRow label="Charges fixes" value="€324K" color="gray" />
              <PLRow label="EBITDA" value="€847K" color="emerald" />
            </div>
            <div className="text-2xl font-bold text-indigo-900">Prévision YTD OK</div>
          </div>
        </FinanceMetricBox>

        <FinanceMetricBox title="Anomalies comptables">
          <div className="h-64 space-y-3 p-4 bg-white rounded-2xl">
            <AnomalyItem type="Écart TVA" amount="€12.4K" status="À justifier" />
            <AnomalyItem type="Fournisseur X" amount="€8.7K" status="En attente" />
            <AnomalyItem type="Salaire 03/24" amount="€2.1K" status="Régularisé" />
          </div>
        </FinanceMetricBox>

        <FinanceMetricBox title="Forecast cashflow">
          <div className="h-64 p-4 bg-gradient-to-b from-purple-50 to-indigo-50 rounded-2xl space-y-3">
            <div className="text-sm mb-4">Prochaines 30 jours</div>
            <div className="flex justify-between text-sm">
              <span>Entrées prévues</span><span className="font-bold">€3.2M</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Sorties prévues</span><span className="font-bold">€2.8M</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-emerald-600">
              <span>Net</span><span>+€420K</span>
            </div>
          </div>
        </FinanceMetricBox>
      </div>

      {/* Actions Finance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FinanceActionBox title="🚨 Closing urgent">
          <ActionRow icon="📊" status="P1" title="TVA Q1" deadline="Aujourd'hui 17h" />
          <ActionRow icon="💳" status="P2" title="Rappro banque" deadline="Demain" />
        </FinanceActionBox>

        <FinanceActionBox title="💰 Factures en retard">
          <div className="space-y-2">
            <InvoiceRow client="Client A" amount="€45K" days="47" />
            <InvoiceRow client="Client B" amount="€23K" days="32" />
            <InvoiceRow client="Client C" amount="€12K" days="18" />
          </div>
        </FinanceActionBox>

        <FinanceActionBox title="📈 Budgets vs réel">
          <div className="space-y-2">
            <BudgetRow category="Marketing" budget="€150K" real="€142K" variance="+5%" />
            <BudgetRow category="RH" budget="€320K" real="€345K" variance="-8%" />
            <BudgetRow category="Tech" budget="€280K" real="€265K" variance="+5%" />
          </div>
        </FinanceActionBox>
      </div>
    </div>
  );
};

// Composants Finance
const DashboardKpi = ({ icon: Icon, title, value, trend, color }: any) => (
  <div className="group bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/50 hover:shadow-2xl transition-all hover:-translate-y-1">
    <div className="flex items-start gap-3 mb-3">
      <div className={`p-2 rounded-xl bg-gradient-to-r ${color === 'indigo' ? 'from-indigo-500 to-purple-600' : color === 'emerald' ? 'from-emerald-500 to-teal-600' : color === 'blue' ? 'from-blue-500 to-indigo-600' : 'from-purple-500 to-pink-600'}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
    <Badge className={`ml-auto ${color === 'indigo' ? 'bg-indigo-100 text-indigo-800' : color === 'emerald' ? 'bg-emerald-100 text-emerald-800' : color === 'blue' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
      {trend}
    </Badge>
  </div>
);

const FinanceMetricBox = ({ title, children }: any) => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
    <h3 className="font-semibold text-gray-900 p-6 pb-4 border-b border-gray-100">{title}</h3>
    <div className="p-6">
      {children}
    </div>
  </div>
);

const PLRow = ({ label, value, color }: any) => (
  <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
    <span className="font-medium">{label}</span>
    <Badge className={`font-mono ${color === 'emerald' ? 'bg-emerald-100 text-emerald-800' : color === 'orange' ? 'bg-orange-100 text-orange-800' : color === 'blue' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
      {value}
    </Badge>
  </div>
);

const AnomalyItem = ({ type, amount, status }: any) => (
  <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
    <AlertTriangle className="h-4 w-4 text-yellow-600" />
    <span className="font-medium">{type}</span>
    <Badge variant="outline" className="font-mono ml-auto">{amount}</Badge>
    <Badge>{status}</Badge>
  </div>
);

const FinanceActionBox = ({ title, children }: any) => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
    <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
    {children}
  </div>
);

const ActionRow = ({ icon, status, title, deadline }: any) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-2 last:mb-0 hover:bg-gray-100">
    <span className="text-lg">{icon}</span>
    <div className="flex-1">
      <p className="font-medium text-gray-900">{title}</p>
      {deadline && <p className="text-sm text-red-600 font-medium">{deadline}</p>}
    </div>
    <Badge variant="destructive">{status}</Badge>
  </div>
);

const InvoiceRow = ({ client, amount, days }: any) => (
  <div className="flex items-center gap-3 p-2 bg-orange-50 rounded-lg">
    <span className="font-medium min-w-0 truncate">{client}</span>
    <Badge className="font-mono ml-auto">{amount}</Badge>
    <span className={`px-2 py-1 rounded-full text-xs font-bold ml-2 ${days > 45 ? 'bg-red-100 text-red-800' : days > 30 ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}`}>
      {days}j
    </span>
  </div>
);

const BudgetRow = ({ category, budget, real, variance }: any) => (
  <div className="flex items-center gap-4 p-2">
    <span className="font-medium min-w-[120px]">{category}</span>
    <span className="font-mono min-w-[70px]">{budget}</span>
    <span className="font-mono min-w-[70px]">{real}</span>
    <Badge className={variance.startsWith('+') ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
      {variance}
    </Badge>
  </div>
);

export default FinanceDashboard;

