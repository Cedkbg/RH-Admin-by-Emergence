import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAgent } from '@/contexts/AgentContext';
import { useUsers } from '@/contexts/UsersContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Users, CheckCircle, Clock, TrendingUp, AlertCircle, Calendar, FileText, BarChart3 } from 'lucide-react';

interface KpiProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
  color: string;
}

const ManagerDashboard = () => {
  const { agents } = useAgent();
  const { currentUser } = useUsers();
  const { toast } = useToast();
  const { logout } = useAuth();

  const managerId = currentUser?.id || 'manager-1';
  const team = agents.filter(agent => agent.manager_id === managerId);

  const kpis = {
    teamSize: team.length,
    tasksInProgress: 23,
    teamPerformance: 82,
    absences: 2,
    pendingValidations: 5
  };

  const [activeTab, setActiveTab] = useState('team');

  const tabs = [
    { id: 'team', icon: Users, label: 'Mon équipe' },
    { id: 'tasks', icon: Clock, label: 'Tâches' },
    { id: 'performance', icon: TrendingUp, label: 'Performance' },
    { id: 'absences', icon: Calendar, label: 'Congés' },
    { id: 'notifications', icon: AlertCircle, label: 'Notifications' },
    { id: 'reports', icon: BarChart3, label: 'Rapports' }
  ];

  const validateLeave = (agentId: string) => {
    toast({ title: 'Congé validé', description: 'Notification envoyée' });
  };

  if (!currentUser) return <div>Chargement...</div>;

  return (
    <div className="p-6 lg:p-8 space-y-8 bg-gradient-to-br from-slate-50 to-emerald-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Dashboard Manager
          </h1>
          <p className="text-xl text-gray-600 mt-2">{currentUser.role} - Équipe {team.length}</p>
        </div>
        <Button onClick={logout} variant="outline" className="self-start lg:self-end">
          Déconnexion
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <KpiCard icon={Users} title="Mon équipe" value={kpis.teamSize} color="emerald" />
        <KpiCard icon={Clock} title="Tâches en cours" value={kpis.tasksInProgress} color="blue" />
        <KpiCard icon={TrendingUp} title="Performance équipe" value={`${kpis.teamPerformance}%`} color="green" />
        <KpiCard icon={Calendar} title="Absences" value={kpis.absences} color="orange" />
        <KpiCard icon={AlertCircle} title="À valider" value={kpis.pendingValidations} color="purple" />
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
        <div className="flex flex-wrap gap-2 p-4 border-b border-gray-200">
          {tabs.map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              className="flex items-center gap-2 px-4 py-2 rounded-xl h-auto"
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Button>
          ))}
        </div>

        {activeTab === 'team' && (
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {team.map(agent => (
                <TeamCard key={agent.id} agent={agent} onValidate={validateLeave} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="p-8">
            <h3 className="text-2xl font-bold mb-8">Tâches équipe ({kpis.tasksInProgress})</h3>
            <div className="space-y-4">
              <TaskCard title="Développement app mobile" agent="Jean Dupont" status="en cours" priority="haute" />
              <TaskCard title="Rapport Q1 finance" agent="Marie Martin" status="bloqué" priority="moyenne" />
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="p-8">
            <h3 className="text-2xl font-bold mb-8">Performance de l'équipe</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <PerformanceCard name="Jean Dupont" score={92} trend="+5%" />
              <PerformanceCard name="Marie Martin" score={87} trend="+3%" />
              <PerformanceCard name="Paul Bernard" score={78} trend="-2%" />
            </div>
          </div>
        )}

        {activeTab === 'absences' && (
          <div className="p-8">
            <h3 className="text-2xl font-bold mb-8">Demandes de congés</h3>
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Jean Dupont</p>
                    <p className="text-sm text-gray-500">Congé annuel - 5 jours</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Refuser</Button>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">Approuver</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="p-8">
            <h3 className="text-2xl font-bold mb-8">Notifications</h3>
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Nouvelle demande de congé</p>
                  <p className="text-sm text-gray-500">Jean Dupont - Il y a 2 heures</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="p-8">
            <h3 className="text-2xl font-bold mb-8">Rapports</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Rapport mensuel équipe</p>
                    <p className="text-sm text-gray-500">Généré le 15/01/2026</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const KpiCard = ({ icon: Icon, title, value, color }: KpiProps) => {
  const colorMap: Record<string, { bg: string; text: string; light: string }> = {
    emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50' },
    blue: { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50' },
    green: { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-50' },
    orange: { bg: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-50' },
    purple: { bg: 'bg-purple-500', text: 'text-purple-600', light: 'bg-purple-50' },
  };
  const c = colorMap[color] || colorMap.emerald;

  return (
    <Card className="group hover:shadow-lg transition-all border-0 bg-white shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className={`p-3 rounded-2xl ${c.light} group-hover:brightness-95 transition-all`}>
            <Icon className={`h-6 w-6 ${c.text}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
          </div>
        </div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );
};

const TeamCard = ({ agent, onValidate }: any) => (
  <Card className="hover:shadow-lg transition-all">
    <CardContent className="p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-sm font-bold text-white">
          {agent.name?.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase() || '??'}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-lg">{agent.name}</h4>
          <p className="text-sm text-gray-600">{agent.role}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Badge variant="outline" className="text-xs">Actif</Badge>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Calendar className="h-3 w-3" />
          {agent.hiredAt ? new Date(agent.hiredAt).toLocaleDateString() : 'N/A'}
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1">
          <FileText className="h-4 w-4 mr-1" />
          Feedback
        </Button>
        <Button size="sm" onClick={() => onValidate(agent.id)} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
          <CheckCircle className="h-4 w-4 mr-1" />
          Valider
        </Button>
      </div>
    </CardContent>
  </Card>
);

const TaskCard = ({ title, agent, status, priority }: any) => {
  const statusColors: Record<string, string> = {
    'en cours': 'border-blue-300 text-blue-700',
    'bloqué': 'border-orange-300 text-orange-700',
    'terminé': 'border-green-300 text-green-700',
  };

  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-6 pb-4">
        <div className="flex justify-between items-start mb-3">
          <h4 className="font-semibold">{title}</h4>
          <Badge variant={priority === 'haute' ? 'destructive' : 'secondary'}>{priority}</Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Users className="h-4 w-4" />
          <span>{agent}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={statusColors[status] || ''}>
            {status}
          </Badge>
          <Button size="sm" variant="ghost" className="h-8 px-3 text-xs">
            Prendre en charge
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const PerformanceCard = ({ name, score, trend }: any) => (
  <Card className="hover:shadow-md">
    <CardContent className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-green-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
          {name.split(' ')[0]?.[0] || ''}{name.split(' ')[1]?.[0] || ''}
        </div>
        <div>
          <h4 className="font-bold">{name}</h4>
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Score</span>
          <span className="text-2xl font-bold text-emerald-600">{score}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-gradient-to-r from-emerald-400 to-green-500 h-2 rounded-full" style={{ width: `${score}%` }} />
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${trend.startsWith('+') ? 'text-green-600' : 'text-orange-600'}`}>
          {trend}
        </div>
      </div>
      <Button size="sm" className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-sm">
        Nouvelle évaluation
      </Button>
    </CardContent>
  </Card>
);

export default ManagerDashboard;

