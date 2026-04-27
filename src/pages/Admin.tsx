import { useEffect, useMemo, useState } from "react";
import { Shield, ShieldOff, Check, X, Clock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  approval_status: "pending" | "approved" | "rejected";
  created_at: string;
}

const Admin = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const [{ data: profs }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role").eq("role", "admin"),
    ]);
    setProfiles((profs as ProfileRow[]) || []);
    setAdminIds(new Set((roles || []).map((r: any) => r.user_id)));
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const pending = useMemo(() => profiles.filter((p) => p.approval_status === "pending"), [profiles]);
  const approved = useMemo(() => profiles.filter((p) => p.approval_status === "approved"), [profiles]);
  const rejected = useMemo(() => profiles.filter((p) => p.approval_status === "rejected"), [profiles]);

  const setStatus = async (userId: string, status: "approved" | "rejected" | "pending") => {
    const { error } = await supabase.from("profiles").update({ approval_status: status }).eq("id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "Compte approuvé" : status === "rejected" ? "Compte refusé" : "Statut réinitialisé");
    refresh();
  };

  const toggleAdmin = async (userId: string) => {
    if (userId === user?.id) {
      toast.error("Vous ne pouvez pas modifier votre propre rôle.");
      return;
    }
    const isAdminUser = adminIds.has(userId);
    if (isAdminUser) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (error) { toast.error(error.message); return; }
      toast.success("Privilèges admin retirés");
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      if (error) { toast.error(error.message); return; }
      toast.success("Promu administrateur");
    }
    refresh();
  };

  const renderRow = (p: ProfileRow, mode: "pending" | "approved" | "rejected") => {
    const isAdminUser = adminIds.has(p.id);
    const isMe = p.id === user?.id;
    return (
      <tr key={p.id} className="border-b hover:bg-muted/50">
        <td className="p-4">
          <div className="font-medium">{p.full_name || "—"}</div>
          <div className="text-xs text-muted-foreground">
            Inscrit le {new Date(p.created_at).toLocaleDateString("fr-FR")}
          </div>
        </td>
        <td className="p-4 text-sm">{p.email}</td>
        <td className="p-4">
          {isAdminUser
            ? <Badge>Admin RH</Badge>
            : <Badge variant="secondary">Employé</Badge>}
          {isMe && <Badge variant="outline" className="ml-2">Vous</Badge>}
        </td>
        <td className="p-4 text-right space-x-1">
          {mode === "pending" && (
            <>
              <Button size="sm" onClick={() => setStatus(p.id, "approved")}>
                <Check className="mr-1 h-4 w-4" /> Approuver
              </Button>
              <Button size="sm" variant="outline" onClick={() => setStatus(p.id, "rejected")}>
                <X className="mr-1 h-4 w-4" /> Refuser
              </Button>
            </>
          )}
          {mode === "approved" && !isMe && (
            <>
              <Button
                size="sm"
                variant={isAdminUser ? "outline" : "default"}
                onClick={() => toggleAdmin(p.id)}
              >
                {isAdminUser
                  ? <><ShieldOff className="mr-1 h-4 w-4" /> Retirer admin</>
                  : <><Shield className="mr-1 h-4 w-4" /> Promouvoir admin</>}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setStatus(p.id, "rejected")}>
                <X className="mr-1 h-4 w-4" /> Bloquer
              </Button>
            </>
          )}
          {mode === "rejected" && (
            <Button size="sm" variant="outline" onClick={() => setStatus(p.id, "pending")}>
              <RotateCcw className="mr-1 h-4 w-4" /> Réexaminer
            </Button>
          )}
        </td>
      </tr>
    );
  };

  const Table = ({ rows, mode, emptyText }: { rows: ProfileRow[]; mode: "pending" | "approved" | "rejected"; emptyText: string }) => (
    <section className="rounded-xl border bg-card shadow-sm overflow-hidden mt-4">
      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Chargement…</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
              <th className="p-4">Utilisateur</th>
              <th className="p-4">Email</th>
              <th className="p-4">Rôle</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="p-12 text-center text-muted-foreground">{emptyText}</td></tr>
            ) : rows.map((p) => renderRow(p, mode))}
          </tbody>
        </table>
      )}
    </section>
  );

  return (
<<<<<<< HEAD
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
        <p className="text-sm text-muted-foreground">Validation des comptes et gestion des rôles.</p>
=======
    <div className="p-6 lg:p-8 space-y-6 lg:space-y-8 bg-gradient-to-b from-slate-50 to-slate-100 min-h-screen">
      <div className="space-y-6">

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
                          <Badge variant="outline" className="text-xs">{dir?.name}</Badge>
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

        {/* DIALOG SCROLLABLE */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 gap-0 flex flex-col">
            
            {/* Header fixe */}
            <DialogHeader className="p-6 pb-4 shrink-0">
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <UserPlus className="h-8 w-8" />
                Ajouter nouvel agent
              </DialogTitle>
              <DialogDescription>
                Remplissez les informations de l'agent
              </DialogDescription>
            </DialogHeader>

            {/* Contenu scrollable */}
            <div className="px-6 pb-4 space-y-6 overflow-y-auto">

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
                <Select value={formData.directionId} onValueChange={(v) => setFormData({...formData, directionId: String(v)})}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                <SelectContent className="max-h-[240px] overflow-y-auto">
                    {directions.map(d => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name ?? ""}
                      </SelectItem>
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
                  <SelectContent className="max-h-[240px] overflow-y-auto">
                    {roles.map(role => (
                      <SelectItem key={role} value={role}>
                        {role ?? ""} 
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tech Departments Responsible Selector */}
              <div className="space-y-4">
                <Label className="font-semibold text-sm uppercase tracking-wide text-blue-800 flex items-center gap-2">
                  🔧 Responsables Techniques
                </Label>
                {techDepartments.map(dept => (
                  <div key={dept.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3 mb-2">
                      <dept.icon className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-sm">{dept.name}</span>
                    </div>
                    <Select>
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder={`Choisir responsable ${dept.short}`} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[240px] overflow-y-auto">
                        {agents.map(agent => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name} - {agent.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer fixe */}
            <div className="flex gap-4 p-6 pt-4 border-t shrink-0 bg-white">
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

>>>>>>> 07b8eab ( file the login)
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="relative">
            <Clock className="mr-2 h-4 w-4" /> En attente
            {pending.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">
            <Check className="mr-2 h-4 w-4" /> Approuvés ({approved.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            <X className="mr-2 h-4 w-4" /> Refusés ({rejected.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Table rows={pending} mode="pending" emptyText="Aucun compte en attente d'approbation." />
        </TabsContent>
        <TabsContent value="approved">
          <Table rows={approved} mode="approved" emptyText="Aucun compte approuvé." />
        </TabsContent>
        <TabsContent value="rejected">
          <Table rows={rejected} mode="rejected" emptyText="Aucun compte refusé." />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
