import { useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { allDepartments } from "@/data/orgData";
import { 
  LayoutDashboard, Users, FileText, Settings, BarChart3, 
  Calendar, MessageSquare, CheckSquare, Bell, FolderOpen
} from "lucide-react";

const defaultFeatures = [
  { id: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: "team", label: "Équipe", icon: Users },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "tasks", label: "Tâches", icon: CheckSquare },
  { id: "calendar", label: "Calendrier", icon: Calendar },
  { id: "reports", label: "Rapports", icon: BarChart3 },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "settings", label: "Paramètres", icon: Settings },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "projects", label: "Projets", icon: FolderOpen },
];

export default function DepartmentPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const dept = allDepartments.find((d) => d.moduleId === moduleId);

  if (!dept) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Département non trouvé</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Le département avec le moduleId "{moduleId}" n'existe pas.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const Icon = dept.icon;

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl bg-${dept.color}-100`}>
            <Icon className={`h-8 w-8 text-${dept.color}-600`} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{dept.name}</h1>
            <p className="text-gray-600">{dept.short} — {dept.agentCount} agents</p>
          </div>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <InfoCard label="Agents" value={dept.agentCount.toString()} color="blue" />
        <InfoCard label="Projets actifs" value="5" color="green" />
        <InfoCard label="Tâches en cours" value="12" color="orange" />
        <InfoCard label="Rendement" value="94%" color="purple" />
      </div>

      {/* Fonctionnalités */}
      <h2 className="text-xl font-bold text-gray-900 mb-4">Fonctionnalités</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {defaultFeatures.map((feature) => {
          const FeatureIcon = feature.icon;
          return (
            <Card 
              key={feature.id} 
              className="hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1"
            >
              <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                <div className={`p-3 rounded-full bg-${dept.color}-100`}>
                  <FeatureIcon className={`h-6 w-6 text-${dept.color}-600`} />
                </div>
                <span className="font-medium text-gray-900">{feature.label}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Activités récentes */}
      <h2 className="text-xl font-bold text-gray-900 mb-4 mt-8">Activités récentes</h2>
      <Card>
        <CardContent className="p-6 space-y-3">
          <ActivityItem text="Nouveau projet créé" time="Il y a 2h" />
          <ActivityItem text="Rapport mensuel soumis" time="Il y a 5h" />
          <ActivityItem text="Réunion d'équipe terminée" time="Il y a 1j" />
          <ActivityItem text="Document validé" time="Il y a 2j" />
        </CardContent>
      </Card>
    </div>
  );
}

function InfoCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card className="hover:shadow-lg transition-all">
      <CardContent className="p-6">
        <p className="text-sm text-gray-600 mb-1">{label}</p>
        <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function ActivityItem({ text, time }: { text: string; time: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 bg-blue-500 rounded-full" />
        <span className="text-gray-900">{text}</span>
      </div>
      <Badge variant="outline" className="text-xs">{time}</Badge>
    </div>
  );
}

