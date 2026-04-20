import { useState } from 'react';
import { UserPlus, Users, Search, Mail } from "lucide-react";
import { directions } from "@/data/orgData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAgent } from "@/contexts/AgentContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const roles = [
  "Agent Administratif", "Chargé de Mission", "Analyste", 
  "Technicien", "Assistant RH", "Responsable Opérations", 
  "Coordinateur", "Conseiller Technique", "Superviseur", 
  "Directeur Adjoint"
];

const Admin = () => {
  const { agents, addAgent } = useAgent();
  const { toast } = useToast();
  const { isRH } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', role: '', directionId: '', email: '' });
  const [search, setSearch] = useState('');

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(search.toLowerCase()) ||
    agent.role.toLowerCase().includes(search.toLowerCase()) ||
    agent.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddAgent = () => {
    const { name, role, directionId, email } = formData;
    if (!name || !role || !directionId || !email) {
      toast({ title: "Erreur", description: "Remplissez tous les champs", variant: "destructive" });
      return;
    }
    addAgent({ name, role, directionId, email });
    toast({ title: "Succès", description: `${name} ajouté` });
    setFormData({ name: '', role: '', directionId: '', email: '' });
    setAddOpen(false);
  };

  if (!isRH) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Accès Restreint</CardTitle>
            <p className="text-muted-foreground">Gestion réservée RH</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full">Login RH</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 lg:space-y-8 bg-gradient-to-b from-slate-50 to-slate-100 min-h-screen">
      <div className="space-y-6">
        {/* KPI Card */}
        <Card className="shadow-lg border-emerald-100">
          <CardContent className="p-8 lg:p-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-4xl lg:text-5xl font-bold text-emerald-600">{agents.length}</div>
                <p className="text-lg text-muted-foreground mt-2">Agents actifs</p>
              </div>
              <div>
                <div className="text-4xl lg:text-5xl font-bold text-blue-600">{directions.length}</div>
                <p className="text-lg text-muted-foreground mt-2">Directions</p>
              </div>
              <div>
                <div className="text-4xl lg:text-5xl font-bold text-gray-600">0</div>
                <p className="text-lg text-muted-foreground mt-2">En attente</p>
              </div>
            </div>
            <Button 
              onClick={() => setAddOpen(true)} 
              className="mt-8 w-full lg:w-auto h-14 px-12 font-semibold shadow-lg hover:shadow-emerald-300 rounded-xl"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Ajouter agent
            </Button>
          </CardContent>
        </Card>

        {/* Search */}
        <Card className="shadow-md">
          <CardContent className="p-6 lg:p-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Rechercher agents..." 
                className="h-12 pl-12 pr-4 lg:pl-14 rounded-xl shadow-sm" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
            </div>
          </CardContent>
        </Card>

        {/* Agents Grid */}
        <Card className="shadow-xl">
          <CardHeader className="pb-8">
            <div className="flex items-center gap-4">
              <Users className="h-10 w-10 text-emerald-600" />
              <CardTitle className="text-3xl font-bold">Agents ({filteredAgents.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pb-12">
            {filteredAgents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAgents.map((agent) => {
                  const dir = directions.find(d => d.id === agent.directionId);
                  return (
                    <Card key={agent.id} className="hover:shadow-lg hover:border-emerald-300 transition-all group border">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow-lg">
                            {agent.name.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-xl">{agent.name}</h3>
                            <Badge className="mt-1 px-4 py-1 font-semibold bg-emerald-100 text-emerald-800">
                              {agent.role}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm font-medium text-gray-700">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{dir?.name}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span>{agent.email}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-24 space-y-6">
                <Users className="h-32 w-32 mx-auto text-gray-400 mb-8" />
                <h3 className="text-4xl font-bold text-gray-600 mb-4">Aucun agent</h3>
                <p className="text-xl text-gray-500 mb-8 max-w-md mx-auto">Ajoutez le premier agent</p>
                <Button onClick={() => setAddOpen(true)} className="h-14 px-12 shadow-lg">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Premier agent
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh]">
            <ScrollArea className="h-[70vh]">
              <DialogHeader className="mb-8">
                <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                  <UserPlus className="h-8 w-8" />
                  Ajouter nouvel agent
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label className="font-semibold">Nom complet</Label>
                  <Input 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Dupont Jean"
                    className="h-12"
                  />
                </div>
                <div className="space-y-4">
                  <Label className="font-semibold">Email</Label>
                  <Input 
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="jean@emergence.cd"
                    className="h-12"
                  />
                </div>
                <div className="space-y-4">
                  <Label className="font-semibold">Direction</Label>
                  <Select value={formData.directionId} onValueChange={(v) => setFormData({...formData, directionId: v})}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {directions.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-4">
                  <Label className="font-semibold">Poste</Label>
                  <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(role => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ScrollArea>
            <div className="flex gap-4 p-6 border-t bg-muted/50">
              <Button 
                variant="outline" 
                className="flex-1 h-14"
                onClick={() => setAddOpen(false)}
              >
                Annuler
              </Button>
              <Button 
                className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleAddAgent}
              >
                Créer agent
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Admin;

