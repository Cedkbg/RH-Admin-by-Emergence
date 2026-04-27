import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { OrgChart } from "@/components/dashboard/OrgChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { iconForCode, colorForCode } from "@/data/orgData";
import { colorClasses } from "@/data/modules";

interface DirectionRow {
  id: string;
  code: string | null;
  name: string;
  manager_name: string | null;
  description: string | null;
}

const Organigramme = () => {
  const { isAdmin } = useAuth();
  const [directions, setDirections] = useState<DirectionRow[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", manager_name: "", description: "" });
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    const { data } = await supabase.from("directions").select("*").order("code");
    setDirections(data || []);
  };

  useEffect(() => { refresh(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast.error("Le nom est obligatoire"); return; }
    setLoading(true);
    const { error } = await supabase.from("directions").insert({
      code: form.code || null,
      name: form.name,
      manager_name: form.manager_name || null,
      description: form.description || null,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Direction créée");
    setOpen(false);
    setForm({ code: "", name: "", manager_name: "", description: "" });
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette direction ?")) return;
    const { error } = await supabase.from("directions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Direction supprimée");
    refresh();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organigramme EMERGENCE DRC</h1>
          <p className="text-sm text-muted-foreground">
            {directions.length} direction{directions.length > 1 ? "s" : ""}
          </p>
        </div>
        {isAdmin ? (
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Ajouter une direction
          </Button>
        ) : (
          <Badge variant="secondary">Lecture seule</Badge>
        )}
      </div>

      <OrgChart />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {directions.map((d) => {
          const code = d.code || "";
          const Icon = iconForCode(code);
          const c = colorClasses[colorForCode(code)];
          return (
            <div key={d.id} className="relative p-5 bg-card rounded-xl border shadow-sm hover:shadow-md transition group">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("p-3 rounded-xl text-primary-foreground", c.bg)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{d.name}</h3>
                  {d.code && <p className="text-xs font-mono text-muted-foreground">{d.code}</p>}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{d.manager_name || "—"}</p>
              {d.description && <p className="text-xs text-muted-foreground line-clamp-2">{d.description}</p>}
              {isAdmin && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100"
                  onClick={() => handleDelete(d.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        })}
        {directions.length === 0 && (
          <div className="col-span-full p-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
            Aucune direction. {isAdmin ? "Cliquez sur \"Ajouter une direction\"." : "L'admin RH peut en créer."}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle direction</DialogTitle>
            <DialogDescription>Ajoutez un département à l'organisation.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <Label>Code</Label>
                <Input placeholder="D1" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Nom *</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Responsable</Label>
              <Input value={form.manager_name} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={loading}>{loading ? "…" : "Créer"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Organigramme;
