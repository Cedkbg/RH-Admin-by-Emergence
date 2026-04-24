import React from "react";
import { Badge } from "@/components/ui/badge";
import { 
  DashboardCard, 
  DashboardBox 
} from "@/components/dashboard/DashboardCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DGDashboard = () => {
  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Tableau de bord – Direction Générale
        </h1>
        <p className="text-gray-600">Vue d'ensemble stratégique Emergence Fintech</p>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardCard title="Employés" value="1,248" trend="+3.2%" color="emerald" />
        <DashboardCard title="Performance Globale" value="85%" trend="+1.8%" color="blue" />
        <DashboardCard title="Projets en cours" value="23" trend="-2" color="purple" />
        <DashboardCard title="Budget total" value="12.4M €" trend="+5.1%" color="orange" />
      </div>

      {/* GRAPHIQUES & METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        <DashboardBox title="Répartition des effectifs">
          <div className="h-64 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-6 flex flex-col justify-between">
            <div className="text-sm text-gray-600">Effectif par direction</div>
            <div className="text-4xl font-bold text-gray-900">DG: 1,248</div>
          </div>
        </DashboardBox>

        <DashboardBox title="Évolution des KPI">
          <div className="h-64 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
            <div className="text-sm text-gray-600 mb-4">Mois en cours</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Performance</span>
                <span className="font-bold text-emerald-600">+12%</span>
              </div>
              <div className="flex justify-between">
                <span>Rotation</span>
                <span className="font-bold text-red-500">-3%</span>
              </div>
            </div>
          </div>
        </DashboardBox>

        <DashboardBox title="Projets stratégiques">
          <div className="h-64 space-y-3">
            <ProjectItem emoji="📱" title="Plateforme Mobile" status="En cours" />
            <ProjectItem emoji="🌍" title="Expansion Afrique" status="Planifié" />
            <ProjectItem emoji="🤖" title="IA & Automatisation" status="Priorité" />
          </div>
        </DashboardBox>

      </div>

      {/* ALERTES & ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlertBox title="🚨 Alertes critiques">
          <AlertItem icon="⚠️" title="Dépassement budget RH" action="Voir détails" />
          <AlertItem icon="📉" title="Taux rotation élevé Tech" action="Analyser" />
          <AlertItem icon="📄" title="15 contrats échéance" action="Renouveler" />
        </AlertBox>

        <ActionBox title="✅ Décisions récentes">
          <ActionItem title="Validation budget 2024" date="Aujourd'hui" />
          <ActionItem title="Recrutement 5 devs" date="Hier" />
          <ActionItem title="Lancement IA" date="Il y a 2j" />
        </ActionBox>
      </div>

    </div>
  );
};

// Local components (until fully refactored)
const ProjectItem = ({ emoji, title, status }: { emoji: string; title: string; status: string }) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
    <span className="text-xl">{emoji}</span>
    <div className="flex-1">
      <p className="font-medium text-gray-900">{title}</p>
      <Badge variant="secondary" className="text-xs">{status}</Badge>
    </div>
  </div>
);

const AlertBox = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
    <CardHeader>
      <CardTitle className="text-orange-900">{title}</CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      {children}
    </CardContent>
  </Card>
);

const AlertItem = ({ icon, title, action }: { icon: string; title: string; action: string }) => (
  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border-l-4 border-orange-400 mb-2">
    <span className="text-xl">{icon}</span>
    <div className="flex-1">
      <p className="font-medium text-gray-900">{title}</p>
    </div>
    <button className="text-sm text-orange-600 font-medium hover:text-orange-700 px-3 py-1 rounded-md hover:bg-orange-50 transition-colors">
      {action}
    </button>
  </div>
);

const ActionBox = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200">
    <CardHeader>
      <CardTitle className="text-emerald-900">{title}</CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      {children}
    </CardContent>
  </Card>
);

const ActionItem = ({ title, date }: { title: string; date: string }) => (
  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border-l-4 border-emerald-400 mb-2">
    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
    <div className="flex-1">
      <p className="font-medium text-gray-900">{title}</p>
      <p className="text-sm text-gray-500">{date}</p>
    </div>
  </div>
);

export default DGDashboard;

