import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DirectionDepartments } from "@/components/dashboard/DirectionDepartments";
import { rhDepartments } from "@/data/orgData";
import { Users } from "lucide-react";

const RHDashboard = () => {
  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      
      {/* HEADER */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2H6a1 1 0 01-1-1V4zm3 1a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tableau de bord RH</h1>
            <p className="text-gray-600">Gestion des Ressources Humaines Emergence</p>
          </div>
        </div>
      </div>

      {/* KPI CARDS RH */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard title="Employés actifs" value="1,248" trend="+12" color="emerald" icon="👥" />
        <KpiCard title="Nouveaux recrutements" value="24" trend="+8" color="blue" icon="💼" />
        <KpiCard title="Absentéisme" value="3.2%" trend="-0.4%" color="orange" icon="📅" />
        <KpiCard title="Formations" value="58" trend="+15" color="purple" icon="🎓" />
      </div>

      {/* Départements RH */}
      <DirectionDepartments
        title="Départements de la Direction RH"
        departments={rhDepartments}
        icon={Users}
        colorClass="text-pink-600"
      />

      {/* CHARTS & LISTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        <ChartBox title="Répartition par département">
          <div className="h-64 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 flex flex-col justify-center items-center">
            <div className="text-4xl mb-2">📊</div>
            <div className="text-lg font-bold text-gray-900">Pie Chart</div>
            <div className="text-sm text-gray-500 mt-1">Départements</div>
          </div>
        </ChartBox>

        <ListBox title="Prochaines absences">
          <AbsenceItem name="Jean Dupont" type="Congé annuel" days="5" />
          <AbsenceItem name="Marie Claire" type="Maladie" days="3" />
          <AbsenceItem name="Paul K." type="Permission" days="1" />
        </ListBox>

        <ListBox title="Recrutements en cours">
          <RecruitItem position="Développeur Backend" stage="Entretien" applicants="8" />
          <RecruitItem position="RH Assistant" stage="Final" applicants="3" />
          <RecruitItem position="Data Analyst" stage="CV" applicants="15" />
        </ListBox>

      </div>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MiniCard title="Postes ouverts" value="12" icon="💼" />
        <MiniCard title="Docs à signer" value="7" icon="📝" />
        <MiniCard title="Évaluations dues" value="23" icon="⭐" />
        <MiniCard title="Alertes RH" value="5" icon="🚨" />
      </div>

      {/* RH MODULES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ModuleCard 
          title="Recrutement" 
          description="Gestion des candidatures et embauche" 
          icon="💼"
          color="blue"
        />
        <ModuleCard 
          title="Gestion RH" 
          description="Administration du personnel" 
          icon="👥"
          color="emerald"
        />
        <ModuleCard 
          title="Développement RH" 
          description="Formation & carrière" 
          icon="🎓"
          color="purple"
        />
      </div>

    </div>
  );
};

// Reusable Components
const KpiCard = ({ title, value, trend, color, icon }) => (
  <Card className="hover:shadow-xl transition-all border-0 bg-gradient-to-br bg-white shadow-sm">
    <CardHeader className="pb-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <Badge className={`text-xs ${color}-500 bg-${color}-100 border-${color}-200`}>
        {trend}
      </Badge>
    </CardContent>
  </Card>
);

const ChartBox = ({ title, children }) => (
  <Card className="h-full hover:shadow-xl transition-all">
    <CardHeader>
      <CardTitle className="text-lg">{title}</CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      {children}
    </CardContent>
  </Card>
);

const ListBox = ({ title, children }) => (
  <Card className="h-full hover:shadow-xl transition-all">
    <CardHeader>
      <CardTitle className="text-lg">{title}</CardTitle>
    </CardHeader>
    <CardContent className="pt-0 space-y-2">
      {children}
    </CardContent>
  </Card>
);

const AbsenceItem = ({ name, type, days }) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
    <div className="w-2 h-2 bg-orange-400 rounded-full" />
    <div className="flex-1 min-w-0">
      <p className="font-medium text-gray-900 truncate">{name}</p>
      <p className="text-sm text-gray-500">{type}</p>
    </div>
    <Badge variant="outline" className="text-xs">{days}j</Badge>
  </div>
);

const RecruitItem = ({ position, stage, applicants }) => (
  <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200">
    <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2" />
    <div className="flex-1">
      <p className="font-medium text-gray-900">{position}</p>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{stage}</p>
    </div>
    <Badge className="text-xs">{applicants} CV</Badge>
  </div>
);

const MiniCard = ({ title, value, icon }) => (
  <Card className="text-center hover:shadow-xl transition-all group">
    <CardContent className="p-6 pb-4">
      <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{icon}</div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-sm text-gray-500">{title}</p>
    </CardContent>
  </Card>
);

const ModuleCard = ({ title, description, icon, color }) => (
  <Card className="hover:shadow-xl transition-all cursor-pointer group hover:-translate-y-1 bg-gradient-to-br hover:from-white hover:to-slate-50">
    <CardContent className="p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all">
        <span className="text-2xl">{icon}</span>
      </div>
      <h3 className="font-bold text-xl text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </CardContent>
  </Card>
);

export default RHDashboard;

