import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, Mail, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface DirectionRow { id: string; name: string; code: string | null }
interface EmployeeRow {
  id: string;
  matricule: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  direction_id: string | null;
  status: "active" | "suspended" | "departed";
  hire_date: string | null;
}

const statusLabel: Record<EmployeeRow["status"], string> = {
  active: "Actif", suspended: "Suspendu", departed: "Départ",
};

const Employes = () => {
  const { isAdmin } = useAuth();
  const [directions, setDirections] = useState<DirectionRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [query, setQuery] = useState("");
  const [activeDir, setActiveDir] = useState<string | "all">("all");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    matricule: "", first_name: "", last_name: "", email: "", phone: "",
    position: "", direction_id: "", status: "active" as EmployeeRow["status"], hire_date: "",
  });

  const refresh = async () => {
    const [d, e] = await Promise.all([
      supabase.from("directions").select("id,name,code").order("code"),
      supabase.from("employees").select("*").order("created_at", { ascending: false }),
    ]);
    setDirections(d.data || []);
    setEmployees((e.data as EmployeeRow[]) || []);
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => employees.filter((e) => {
    const okDir = activeDir === "all" || e.direction_id === activeDir;
    const q = query.toLowerCase();
    const okQ = !q ||
      e.first_name.toLowerCase().includes(q) ||
      e.last_name.toLowerCase().includes(q) ||
      (e.email || "").toLowerCase().includes(q) ||
      (e.position || "").toLowerCase().includes(q) ||
      (e.matricule || "").toLowerCase().includes(q);
    return okDir && okQ;
  }), [employees, query, activeDir]);

  const handleCreate = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.first_name || !form.last_name) { toast.error("Prénom et nom requis"); return; }
    setLoading(true);
    const { error } = await supabase.from("employees").insert({
      matricule: form.matricule || null,
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email || null,
      phone: form.phone || null,
      position: form.position || null,
      direction_id: form.direction_id || null,
      status: form.status,
      hire_date: form.hire_date || null,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Agent ajouté");
    setOpen(false);
    setForm({ matricule: "", first_name: "", last_name: "", email: "", phone: "", position: "", direction_id: "", status: "active", hire_date: "" });
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet agent ?")) return;
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Agent supprimé");
    refresh();
  };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Agents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} / {employees.length} agent{employees.length > 1 ? "s" : ""}
          </p>
        </div>
        {isAdmin ? (
          <Button onClick={() => setOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Ajouter un agent
          </Button>
        ) : (
          <Badge variant="secondary">Ajout réservé à l'Admin RH</Badge>
        )}
      </div>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> Direction
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={activeDir === "all" ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => setActiveDir("all")}>
            Toutes ({employees.length})
          </Button>
          {directions.map((d) => {
            const count = employees.filter((e) => e.direction_id === d.id).length;
            return (
              <Button key={d.id} variant={activeDir === d.id ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => setActiveDir(d.id)}>
                {d.name} <span className="ml-1 text-xs opacity-75">({count})</span>
              </Button>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 border-b p-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, poste, email, matricule…" className="flex-1 h-10 bg-secondary pl-0" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-secondary/40">
                <th className="p-4 text-left text-xs uppercase font-semibold text-muted-foreground">Agent</th>
                <th className="p-4 text-left text-xs uppercase font-semibold text-muted-foreground">Poste</th>
                <th className="p-4 text-left text-xs uppercase font-semibold text-muted-foreground">Direction</th>
                <th className="p-4 text-left text-xs uppercase font-semibold text-muted-foreground">Statut</th>
                <th className="p-4 text-left text-xs uppercase font-semibold text-muted-foreground">Contact</th>
                {isAdmin && <th className="p-4" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const dir = directions.find((d) => d.id === e.direction_id);
                const initials = `${e.first_name[0] ?? ""}${e.last_name[0] ?? ""}`.toUpperCase();
                return (
                  <tr key={e.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          {initials}
                        </div>
                        <div>
                          <p className="font-semibold">{e.first_name} {e.last_name}</p>
                          <p className="text-xs text-muted-foreground">{e.matricule || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">{e.position || "—"}</td>
                    <td className="p-4">{dir?.name || "—"}</td>
                    <td className="p-4">
                      <Badge variant={e.status === "active" ? "default" : "secondary"}>{statusLabel[e.status]}</Badge>
                    </td>
                    <td className="p-4">
                      {e.email ? (
                        <a href={`mailto:${e.email}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                          <Mail className="h-3.5 w-3.5" /> {e.email}
                        </a>
                      ) : "—"}
                    </td>
                    {isAdmin && (
                      <td className="p-4">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDelete(e.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="p-12 text-center text-muted-foreground">
                    Aucun agent. {isAdmin ? "Cliquez sur \"Ajouter un agent\"." : "L'admin RH peut en ajouter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvel agent</DialogTitle>
            <DialogDescription>Renseignez les informations de l'agent.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Matricule</Label><Input value={form.matricule} onChange={(e) => setForm({ ...form, matricule: e.target.value })} /></div>
              <div><Label>Date d'embauche</Label><Input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} /></div>
              <div><Label>Prénom *</Label><Input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
              <div><Label>Nom *</Label><Input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="col-span-2"><Label>Poste</Label><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
              <div>
                <Label>Direction</Label>
                <Select value={form.direction_id} onValueChange={(v) => setForm({ ...form, direction_id: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {directions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as EmployeeRow["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="suspended">Suspendu</SelectItem>
                    <SelectItem value="departed">Départ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={loading}>{loading ? "…" : "Ajouter"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employes;
