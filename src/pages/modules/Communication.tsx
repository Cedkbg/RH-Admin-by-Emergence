import { useEffect, useState } from "react";
import { Megaphone, Pin, Plus, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Ann { id: string; title: string; content: string; pinned: boolean; created_at: string; author_id: string | null; }

const Communication = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Ann[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", pinned: false });

  const refresh = async () => {
    const { data } = await supabase.from("announcements").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false });
    setItems((data as Ann[]) || []);
  };
  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("announcements-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" }, (payload) => {
        const a = payload.new as Ann;
        setItems((prev) => (prev.find((p) => p.id === a.id) ? prev : [a, ...prev]));
        if (a.author_id !== user?.id) {
          toast.message("📢 Nouvelle annonce", { description: a.title });
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "announcements" }, (payload) => {
        setItems((prev) => prev.filter((p) => p.id !== (payload.old as Ann).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) { toast.error("Titre et contenu requis"); return; }
    const { error } = await supabase.from("announcements").insert({ ...form, author_id: user?.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Annonce publiée"); setOpen(false); setForm({ title: "", content: "", pinned: false }); refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette annonce ?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Supprimée"); refresh();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate(-1)} className="w-fit -ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
      </Button>

      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Communication interne</h1>
          <p className="text-sm text-muted-foreground">Annonces et messages à toute l'entreprise.</p>
        </div>
        {isAdmin ? (
          <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Annonce</Button>
        ) : <Badge variant="secondary">Lecture seule</Badge>}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">
          <Megaphone className="mx-auto mb-3 h-10 w-10 opacity-50" />
          Aucune annonce pour le moment.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <article key={a.id} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {a.pinned && <Pin className="h-4 w-4 text-primary" />}
                  <h3 className="font-bold">{a.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString("fr-FR")}</span>
                  {isAdmin && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(a.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{a.content}</p>
            </article>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle annonce</DialogTitle><DialogDescription>Sera visible par tous les employés.</DialogDescription></DialogHeader>
          <form onSubmit={create} className="space-y-3">
            <div><Label>Titre *</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Contenu *</Label><Textarea required rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Épingler en haut</Label>
              <Switch checked={form.pinned} onCheckedChange={(v) => setForm({ ...form, pinned: v })} />
            </div>
            <DialogFooter><Button variant="outline" type="button" onClick={() => setOpen(false)}>Annuler</Button><Button type="submit">Publier</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Communication;
