import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SupportDashboard = () => {
  return (
    <div className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 min-h-screen">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent mb-2">
          Support Client
        </h1>
        <p className="text-gray-600">Suivi tickets et satisfaction utilisateur</p>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard title="Tickets ouverts" value="128" trend="-5" color="orange" />
        <KpiCard title="Résolus" value="356" trend="+42" color="emerald" />
        <KpiCard title="SLA" value="98%" trend="+1%" color="blue" />
        <KpiCard title="Satisfaction" value="4.6/5" trend="+0.2" color="purple" />
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartBox title="Tickets par statut">
          <div className="h-80 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6 flex flex-col items-center justify-center">
            <div className="text-5xl mb-4">📊</div>
            <div className="text-xl font-bold text-gray-900">Funnel tickets</div>
          </div>
        </ChartBox>

        <ChartBox title="Temps de résolution">
          <div className="h-80 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-emerald-600">2.4h</div>
                <div className="text-sm text-gray-500">Moyenne</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">98%</div>
                <div className="text-sm text-gray-500">Sous SLA</div>
              </div>
            </div>
          </div>
        </ChartBox>
      </div>

      {/* RECENT TICKETS & METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TicketsBox title="Tickets récents">
          <TicketItem id="#T456" customer="Sophie L." status="En cours" priority="Haute" />
          <TicketItem id="#T455" customer="Marc D." status="En attente" priority="Moyenne" />
          <TicketItem id="#T454" customer="Julie R." status="Résolu" priority="Basse" />
        </TicketsBox>

        <MetricsBox title="Feedback clients">
          <FeedbackItem score="5/5" comment="Support excellent !" agent="Paul" />
          <FeedbackItem score="4/5" comment="Résolu rapidement" agent="Marie" />
          <FeedbackItem score="3/5" comment="Attente trop longue" agent="Thomas" />
        </MetricsBox>
      </div>
    </div>
  );
};

// Components
const KpiCard = ({ title, value, trend, color }: { title: string; value: string; trend: string; color: string }) => (
  <Card className="hover:shadow-xl transition-all p-6">
    <div className="flex items-start justify-between mb-3">
      <h3 className="text-sm font-medium text-gray-600">{title}</h3>
    </div>
    <div className="text-2xl font-bold text-gray-900 mb-2">{value}</div>
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${color === 'orange' ? 'text-orange-600 bg-orange-100' : color === 'emerald' ? 'text-emerald-600 bg-emerald-100' : color === 'blue' ? 'text-blue-600 bg-blue-100' : 'text-purple-600 bg-purple-100'}`}>
      {trend}
    </span>
  </Card>
);

const ChartBox = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="h-full hover:shadow-xl transition-all">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {children}
    </CardContent>
  </Card>
);

const TicketsBox = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="h-full">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3 pt-0">
      {children}
    </CardContent>
  </Card>
);

const TicketItem = ({ id, customer, status, priority }: { id: string; customer: string; status: string; priority: string }) => (
  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border">
    <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="font-mono text-sm text-gray-900">{id}</p>
      <p className="text-sm text-gray-600 truncate">{customer}</p>
    </div>
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${status === 'En cours' ? 'bg-blue-100 text-blue-800' : status === 'En attente' ? 'bg-yellow-100 text-yellow-800' : 'bg-emerald-100 text-emerald-800'}`}>
      {status}
    </span>
    <span className={`text-xs font-bold ${priority === 'Haute' ? 'text-red-600' : priority === 'Moyenne' ? 'text-orange-600' : 'text-gray-600'}`}>
      {priority}
    </span>
  </div>
);

const MetricsBox = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="h-full">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3 pt-0">
      {children}
    </CardContent>
  </Card>
);

const FeedbackItem = ({ score, comment, agent }: { score: string; comment: string; agent: string }) => (
  <div className="p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-lg font-bold text-yellow-500">{score}</span>
      <span className="w-16 bg-gradient-to-r from-yellow-400 to-amber-400 rounded-full h-1.5"></span>
    </div>
    <p className="text-sm text-gray-700 italic">"{comment}"</p>
    <p className="text-xs text-gray-500 mt-2">{agent}</p>
  </div>
);

export default SupportDashboard;

