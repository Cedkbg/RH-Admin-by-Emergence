import { useMemo, useState } from "react";
import { Search, UserPlus, Mail, Filter, MessageCircle } from "lucide-react";
import { directions } from "@/data/orgData";
import { colorClasses } from "@/data/modules";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAgent } from "@/contexts/AgentContext";
import type { Employee } from "@/data/orgData";

const statusBadge: Record<Employee["status"], string> = {
  actif: "bg-success/10 text-success",
  suspendu: "bg-warning/10 text-warning",
  depart: "bg-destructive/10 text-destructive",
};
const statusLabel: Record<Employee["status"], string> = {
  actif: "Actif", suspendu: "Suspendu", depart: "Départ",
};

const Employes = () => {
  const { toast } = useToast();

const { isRH } = useAuth();

  const { agents, addAgent } = useAgent();
  const [query, setQuery] = useState("");
  const [activeDir, setActiveDir] = useState<string | "all">("all");
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', role: '', directionId: '', email: '' });

  const filtered = useMemo(() => {
    return agents.filter((e) => {
      const matchDir = activeDir === "all" || e.directionId === activeDir;
      const matchQ = query === "" ||
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.role.toLowerCase().includes(query.toLowerCase()) ||
        e.email.toLowerCase().includes(query.toLowerCase());
      return matchDir && matchQ;
    });
  }, [query, activeDir, agents]);

  const handleAddClick = () => {
    if (!isRH) {
      toast({
        title: "Accès RH requis",
        description: "Connectez-vous comme gestionnaire RH.",
        variant: "destructive",
      });
      return;
    }
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.role || !formData.directionId || !formData.email) {
      toast({ title: "Erreur", description: "Tous champs requis.", variant: "destructive" });
      return;
    }
    addAgent(formData);
    toast({ title: "Agent ajouté" });
    setOpen(false);
    setFormData({ name: '', role: '', directionId: '', email: '' });
  };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Agents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} / {agents.length} · Gestion RH
          </p>
        </div>
        {/* Add button moved to Admin - RH monopoly */}
        <Badge variant="secondary">Admin RH uniquement</Badge>
      </div>

      {/* Add Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter agent</DialogTitle>
            <DialogDescription>Nouvel agent Emergence DRC.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nom complet</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div>
              <Label>Poste</Label>
              <Input value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} />
            </div>
            <div>
              <Label>Direction</Label>
              <Select value={formData.directionId} onValueChange={(v) => setFormData({ ...formData, directionId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Direction" />
                </SelectTrigger>
                <SelectContent>
                  {directions.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="submit">Ajouter</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Direction
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={activeDir === "all" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setActiveDir("all")}
            className="rounded-full"
          >
            Toutes ({agents.length})
          </Button>
          {directions.map((d) => {
            const c = colorClasses[d.color];
            const count = agents.filter(e => e.directionId === d.id).length;
            return (
              <div key={d.id} className="flex rounded-full border">
                <Button
                  variant={activeDir === d.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveDir(d.id)}
                  className="gap-2 px-3 py-1.5 rounded-l-full"
                >
                  <d.icon className="h-3.5 w-3.5" />

{d.name} ({count})

                </Button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Table */}
      <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 border-b p-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, poste, email..."
            className="flex-1 h-10 bg-secondary pl-0"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-secondary/40">
                <th className="p-4 text-left text-xs uppercase font-semibold text-muted-foreground">Agent</th>
                <th className="p-4 text-left text-xs uppercase font-semibold text-muted-foreground">Poste</th>
                <th className="p-4 text-left text-xs uppercase font-semibold text-muted-foreground">Direction</th>
                <th className="p-4 text-left text-xs uppercase font-semibold text-muted-foreground">Statut</th>
                <th className="p-4 text-left text-xs uppercase font-semibold text-muted-foreground">Commentaire RH</th>
                <th className="p-4 text-left text-xs uppercase font-semibold text-muted-foreground">Contact</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const dir = directions.find((d) => d.id === e.directionId);
                const c = colorClasses[dir?.color];
                return (
                  <tr key={e.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold", c?.bg || "bg-muted")}>
                          {e.initials}
                        </div>
                        <div>
                          <p className="font-semibold">{e.name}</p>
                          <p className="text-xs text-muted-foreground">{e.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">{e.role}</td>
                    <td className="p-4">
                      <Badge className={cn("gap-1", c?.text)}>
                        <dir.icon className="h-3 w-3" />
{dir?.name}

                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={e.status === "actif" ? "default" : "secondary"}>{statusLabel[e.status]}</Badge>
                    </td>
                    <td className="p-4 max-w-md">
                      <span className="text-xs text-muted-foreground line-clamp-2" title={e.comment || 'Aucun'}>
                        {e.comment || 'Aucun commentaire RH'}
                      </span>
                    </td>
                    <td className="p-4">
                      <a href={`mailto:${e.email}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <Mail className="h-3.5 w-3.5" />
                        {e.email}
                      </a>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground">
                    Liste agents vide. RH ajoute depuis admin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Employes;

