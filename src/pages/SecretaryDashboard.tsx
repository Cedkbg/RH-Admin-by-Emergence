import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, FileText, Mail, Bell, Clock, Users, ClipboardList, MessageSquare } from 'lucide-react';
import { useUsers } from '@/contexts/UsersContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SecretaryDashboard = () => {
  const { currentUser } = useUsers();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('agenda');

  // Mock data secrétaire
  const agenda = [
    { id: '1', title: 'Réunion DG Hebdo', date: '2024-01-15 10:00', participants: 'DG, DGA, Managers', status: 'confirmé' },
    { id: '2', title: 'Appel Finance Q1', date: '2024-01-16 14:00', participants: 'Finance, RH', status: 'planifié' },
    { id: '3', title: 'Comité Direction', date: '2024-01-17 09:00', participants: 'DG, DGA, Tous Directeurs', status: 'à confirmer' }
  ];

  const documents = [
    { id: '1', name: 'Rapport RH Janvier', type: 'docx', date: '15/01/24', status: 'à signer' },
    { id: '2', name: 'Budget 2024 v2', type: 'pdf', date: '14/01/24', status: 'approuvé' },
    { id: '3', name: 'PV Comité 10/01', type: 'docx', date: '12/01/24', status: 'classé' }
  ];

  const messages = [
    { id: '1', from: 'DG Martin', subject: 'Urgent: Rapport stratégie', time: '08:32', priority: 'haute' },
    { id: '2', from: 'RH Dupont', subject: 'Recrutements janvier', time: '09:15', priority: 'normale' },
    { id: '3', from: 'Finance Leclerc', subject: 'Validation budget', time: '10:02', priority: 'haute' }
  ];

  const notifications = [
    { id: '1', message: 'Nouvelle réunion créée par Manager Tech', time: '2min', type: 'agenda' },
    { id: '2', message: '3 documents à valider DG', time: '5min', type: 'documents' },
    { id: '3', message: 'Tâche relancée: Rapport Q1', time: '12min', type: 'tâches' }
  ];

  const workflows = [
    { id: '1', title: 'Congé Pierre Durand', status: 'en attente DG', action: 'Transmis DG', date: '15/01' },
    { id: '2', title: 'Formation équipe Tech', status: 'approuvé Manager', action: 'Planifier', date: '16/01' },
    { id: '3', title: 'Budget marketing', status: 'à relancer', action: 'Relancer Finance', date: '14/01' }
  ];

  const handleNewEvent = () => {
    toast({ title: 'Nouvel événement', description: 'Ajouté au calendrier' });
  };

  const handleDocumentUpload = () => {
    toast({ title: 'Document uploadé', description: 'Classé dans Documents DG' });
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 bg-gradient-to-br from-indigo-50 to-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Secrétariat Exécutif
          </h1>
          <p className="text-xl text-gray-600 mt-2">
            Assistance {currentUser?.fullName} - Coordination complète
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleNewEvent}>
            <CalendarIcon className="h-4 w-4 mr-2" />
            Nouvel événement
          </Button>
          <Button variant="outline" onClick={logout}>
            Déconnexion
          </Button>
        </div>
      </div>

      {/* KPI Secrétaire */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <KpiSec icon={CalendarIcon} title="Événements" value="12" color="indigo" />
        <KpiSec icon={FileText} title="Documents" value="28" color="purple" />
        <KpiSec icon={Mail} title="Messages" value="15" color="blue" />
        <KpiSec icon={Bell} title="Notifications" value="8" color="orange" />
        <KpiSec icon={Clock} title="Tâches ouvertes" value="5" color="emerald" />
        <KpiSec icon={Users} title="Managers assistés" value="4" color="pink" />
      </div>

      {/* Tabs principaux */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 bg-white rounded-2xl shadow-lg border-0 p-2">
          <TabsTrigger value="agenda" className="rounded-xl data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
            <CalendarIcon className="h-4 w-4 mr-1" />
            Agenda
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-xl data-[state=active]:bg-purple-500 data-[state=active]:text-white">
            <FileText className="h-4 w-4 mr-1" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="messages" className="rounded-xl data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <Mail className="h-4 w-4 mr-1" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-xl data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            <Bell className="h-4 w-4 mr-1" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="workflows" className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
            <ClipboardList className="h-4 w-4 mr-1" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="communication" className="rounded-xl data-[state=active]:bg-pink-500 data-[state=active]:text-white">
            <MessageSquare className="h-4 w-4 mr-1" />
            Com.
          </TabsTrigger>
        </TabsList>

        {/* Agenda */}
        <TabsContent value="agenda" className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-6 w-6" />
                  Agenda Exécutif - Semaine 3
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {agenda.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Nouvel événement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Titre réunion" />
                <div className="grid grid-cols-2 gap-4">
                  <Input type="date" placeholder="Date" />
                  <Input type="time" placeholder="Heure" />
                </div>
                <Input placeholder="Participants (DG, Managers...)" />
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                  Planifier
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents" className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Documents DG (28)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {documents.map(doc => (
                  <DocumentRow key={doc.id} doc={doc} />
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Nouveau document</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input placeholder="Nom du document" />
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">📄 DOCX</Button>
                    <Button variant="outline" className="flex-1">📕 PDF</Button>
                  </div>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">
                    Uploader
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Messages */}
        <TabsContent value="messages" className="pt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Boîte réception exécutive (15 nouveaux)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {messages.map(msg => (
                  <MessageRow key={msg.id} msg={msg} />
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Nouveau message</CardTitle>
              </CardHeader>
              <CardContent>
                <Input placeholder="Destinataire (DG@emergence.cd)" />
                <Input placeholder="Objet" />
                <textarea className="w-full h-32 p-4 border rounded-xl resize-none" placeholder="Message..." />
                <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
                  Envoyer
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notifications (8)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.map(notif => (
                <NotificationRow key={notif.id} notif={notif} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflows */}
        <TabsContent value="workflows" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflows en cours (12)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {workflows.map(workflow => (
                <WorkflowRow key={workflow.id} workflow={workflow} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communication */}
        <TabsContent value="communication" className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Notes de service</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <NoteCard title="Réunion stratégique" date="15/01" status="envoyée" />
                  <NoteCard title="Bilan mensuel" date="14/01" status="brouillon" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Nouvelle note</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Destinataires (Toutes directions)" />
                <Input placeholder="Objet" />
                <textarea className="w-full h-24 p-4 border rounded-xl resize-none" placeholder="Contenu note de service..." />
                <Button className="w-full bg-pink-600 hover:bg-pink-700">
                  Publier note
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Composants Secrétaire
const KpiSec = ({ icon: Icon, title, value, color }: any) => (
  <Card className="hover:shadow-lg p-6 border-0 shadow-md">
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-xl bg-${color}-100`}>
        <Icon className={`h-6 w-6 text-${color}-600`} />
      </div>
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  </Card>
);

const EventCard = ({ event }: any) => (
  <Card className="p-4 hover:shadow-md">
    <div className="flex justify-between items-start mb-2">
      <h4 className="font-semibold">{event.title}</h4>
      <Badge variant="outline">{event.status}</Badge>
    </div>
    <p className="text-sm text-gray-600 mb-2">{event.date}</p>
    <p className="text-xs text-gray-500">{event.participants}</p>
  </Card>
);

const DocumentRow = ({ doc }: any) => (
  <div className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl">
    <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg flex items-center justify-center">
      <FileText className="h-5 w-5 text-purple-600" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium">{doc.name}</p>
      <p className="text-xs text-gray-500">{doc.type} • {doc.date}</p>
    </div>
    <Badge>{doc.status}</Badge>
  </div>
);

const MessageRow = ({ msg }: any) => (
  <div className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-xl cursor-pointer">
    <div className={`w-2 h-2 rounded-full ${msg.priority === 'haute' ? 'bg-red-500' : 'bg-blue-500'}`} />
    <div className="flex-1 min-w-0">
      <div className="flex gap-2 items-center mb-1">
        <span className="font-semibold">{msg.from}</span>
        <span className="text-xs text-gray-500">{msg.time}</span>
      </div>
      <p className="text-sm truncate">{msg.subject}</p>
    </div>
  </div>
);

const NotificationRow = ({ notif }: any) => (
  <div className="flex items-start gap-4 p-4 border-l-4 border-emerald-400 bg-emerald-50 rounded-r-xl">
    <Bell className="h-5 w-5 mt-0.5 text-emerald-600" />
    <div>
      <p className="font-medium">{notif.message}</p>
      <p className="text-xs text-gray-500">{notif.time}</p>
    </div>
  </div>
);

const WorkflowRow = ({ workflow }: any) => (
  <div className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl">
    <ClipboardList className="h-5 w-5 text-gray-500" />
    <div className="flex-1">
      <div className="flex gap-2 mb-1">
        <h4 className="font-semibold">{workflow.title}</h4>
        <Badge variant="secondary">{workflow.status}</Badge>
      </div>
      <p className="text-xs text-gray-500">{workflow.date} • {workflow.action}</p>
    </div>
    <Button size="sm" variant="outline">Action</Button>
  </div>
);

const NoteCard = ({ title, date, status }: any) => (
  <div className="p-4 border rounded-xl hover:shadow-sm">
    <div className="flex justify-between items-start mb-1">
      <h4 className="font-medium text-sm">{title}</h4>
      <Badge variant="outline" className="text-xs">{status}</Badge>
    </div>
    <p className="text-xs text-gray-500">{date}</p>
  </div>
);

export default SecretaryDashboard;

