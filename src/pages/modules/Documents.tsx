import { useEffect, useState } from "react";
import { Upload, FileText, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Doc { id: string; title: string; category: string | null; file_url: string | null; created_at: string; }

const Documents = () => {
  const { isAdmin, user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const refresh = async () => {
    const { data } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
    setDocs((data as Doc[]) || []);
  };
  useEffect(() => { refresh(); }, []);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !file) { toast.error("Titre et fichier requis"); return; }
    setUploading(true);
    const path = `${user?.id}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { error } = await supabase.from("documents").insert({
      title, category: category || null, file_url: path, uploaded_by: user?.id,
    });
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Document ajouté");
    setOpen(false); setTitle(""); setCategory(""); setFile(null);
    refresh();
  };

  const download = async (path: string) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 60);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank");
  };

  const remove = async (d: Doc) => {
    if (!confirm("Supprimer ce document ?")) return;
    if (d.file_url) await supabase.storage.from("documents").remove([d.file_url]);
    const { error } = await supabase.from("documents").delete().eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Supprimé"); refresh();
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground">{docs.length} document(s)</p>
        </div>
        {isAdmin ? (
          <Button onClick={() => setOpen(true)}><Upload className="mr-2 h-4 w-4" /> Téléverser</Button>
        ) : <Badge variant="secondary">Lecture seule</Badge>}
      </div>

      <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <th className="p-4">Document</th><th className="p-4">Catégorie</th><th className="p-4">Date</th><th className="p-4 text-right">Actions</th>
          </tr></thead>
          <tbody>
            {docs.length === 0 ? (
              <tr><td colSpan={4} className="p-12 text-center text-muted-foreground">Aucun document.</td></tr>
            ) : docs.map((d) => (
              <tr key={d.id} className="border-b hover:bg-muted/50 text-sm">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{d.title}</span>
                  </div>
                </td>
                <td className="p-4">{d.category || "—"}</td>
                <td className="p-4">{new Date(d.created_at).toLocaleDateString("fr-FR")}</td>
                <td className="p-4 text-right">
                  {d.file_url && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => download(d.file_url!)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {isAdmin && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(d)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Téléverser un document</DialogTitle><DialogDescription>Le fichier sera stocké de manière sécurisée.</DialogDescription></DialogHeader>
          <form onSubmit={upload} className="space-y-3">
            <div><Label>Titre *</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><Label>Catégorie</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Contrat, RH, Légal…" /></div>
            <div><Label>Fichier *</Label><Input type="file" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
            <DialogFooter><Button variant="outline" type="button" onClick={() => setOpen(false)}>Annuler</Button><Button type="submit" disabled={uploading}>{uploading ? "Envoi…" : "Téléverser"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Documents;
