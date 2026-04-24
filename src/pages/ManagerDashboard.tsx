import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAgent } from '@/contexts/AgentContext';
import { useUsers } from '@/contexts/UsersContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { directions } from '@/data/orgData';
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
              onClick={() => setActiveTab(tab.id as string)}
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
      </div>
    </div>
  );
};

const KpiCard = ({ icon: Icon, title, value, color }: KpiProps) => {
  return (
    <Card className="group hover:shadow-lg transition-all border-0 bg-gradient-to-br bg-white shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className={`p-3 rounded-2xl bg-${color}-50 group-hover:bg-${color}-100 transition-all`}>
            <Icon className={`h-6 w-6 text-${color}-600`} />
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

const TeamCard = ({ agent, onValidate }: any) => {
  return (
    <Card className="hover:shadow-lg transition-all">
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-sm font-bold text-white">
            {agent.name.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase()}
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-lg">{agent.name}</h4>
            <p className="text-sm text-gray-600">{agent.role}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1">
            Feedback
          </Button>
          <Button size="sm" onClick={() => onValidate(agent.id)} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
            Valider
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const TaskCard = ({ title, agent, status, priority }: any) => {
  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-3">
          <h4 className="font-semibold">{title}</h4>
          <Badge variant={priority === 'haute' ? 'destructive' : 'secondary'}>{priority}</Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Users className="h-4 w-4" />
          <span>{agent}</span>
        </div>
        <Badge variant="outline">{status}</Badge>
      </CardContent>
    </Card>
  );
};

export default ManagerDashboard;

