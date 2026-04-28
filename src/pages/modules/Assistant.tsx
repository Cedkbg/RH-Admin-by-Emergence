import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Briefcase, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Record {
  id: string;
  title: string;
  category: string;
  description: string | null;
  related_direction: string | null;
  priority: string;
  status: string;
  due_date: string | null;
}

const blank = { title: "", category: "dossier", description: "", related_direction: "", priority: "medium", status: "open", due_date: "" };

const CATEGORIES = [
  { value: "dossier", label: "Dossier stratégique" },
  { value: "reporting", label: "Reporting" },
  { value: "coordination", label: "Coordination inter-direction" },
];

const Assistant = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [records, setRecords] = useState<Record[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const [tab, setTab] = useState("dossier");

  const refresh = async () => {
    const { data } = await supabase.from("assistant_records" as any).select("*").order("created_at", { ascending: false });
    setRecords((data as any) || []);
  };
  useEffect(() => { refresh(); }, []);

  const openCreate = (cat?: string) => {
    setEditingId(null);
    setForm({ ...blank, category: cat || "dossier" });
    setOpen(true);
  };
  const openEdit = (r: Record) => {
    setEditingId(r.id);
    setForm({
      title: r.title, category: r.category, description: r.description ?? "",
      related_direction: r.related_direction ?? "", priority: r.priority,
      status: r.status, due_date: r.due_date ?? "",
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) { toast.error("Titre requis"); return; }
    const payload = {
      title: form.title, category: form.category,
      description: form.description || null,
      related_direction: form.related_direction || null,
      priority: form.priority, status: form.status,
      due_date: form.due_date || null,
    };
    const { error } = editingId
      ? await supabase.from("assistant_records" as any).update(payload).eq("id", editingId)
      : await supabase.from("assistant_records" as any).insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? "Modifié" : "Créé");
    setOpen(false);
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ?")) return;
    const { error } = await supabase.from("assistant_records" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  const byCat = (cat: string) => records.filter((r) => r.category === cat);

  const renderList = (cat: string) => {
    const items = byCat(cat);
    return (
      <div className="space-y-3">
        {isAdmin && (
          <Button size="sm" onClick={() => openCreate(cat)}><Plus className="mr-2 h-4 w-4" />Ajouter</Button>
        )}
        {items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Aucun élément.</p>
        ) : items.map((r) => (
          <div key={r.id} className="flex items-start justify-between gap-3 rounded-lg border bg-card p-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{r.title}</h3>
                <Badge variant={r.priority === "high" ? "destructive" : r.priority === "low" ? "secondary" : "default"}>{r.priority}</Badge>
                <Badge variant="outline">{r.status}</Badge>
                {r.related_direction && <Badge variant="secondary">{r.related_direction}</Badge>}
              </div>
              {r.description && <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>}
              {r.due_date && <p className="mt-1 text-xs text-muted-foreground">Échéance : {r.due_date}</p>}
            </div>
            {isAdmin && (
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate(-1)} className="w-fit -ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
      </Button>

      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-3 text-primary"><Briefcase className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-bold">Assistant de Direction</h1>
          <p className="text-sm text-muted-foreground">Bras droit du Manager — dossiers, reporting et coordination inter-directions.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c.value} value={c.value}>{c.label} ({byCat(c.value).length})</TabsTrigger>
          ))}
        </TabsList>
        {CATEGORIES.map((c) => (
          <TabsContent key={c.value} value={c.value} className="mt-4">{renderList(c.value)}</TabsContent>
        ))}
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Modifier" : "Nouveau"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div><Label>Titre *</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Catégorie</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Direction concernée</Label><Input value={form.related_direction} onChange={(e) => setForm({ ...form, related_direction: e.target.value })} /></div>
              <div>
                <Label>Priorité</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Basse</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Ouvert</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="done">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Échéance</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              <div className="col-span-2"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit">{editingId ? "Enregistrer" : "Créer"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Assistant;
