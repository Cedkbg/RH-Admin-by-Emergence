import { useEffect, useState } from "react";
import { Shield, AlertTriangle, ArrowLeft, Trash2, Eraser } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Log { id: string; actor_id: string | null; action: string; entity: string | null; entity_id: string | null; created_at: string; }

const Securite = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<Log[]>([]);

  const refresh = () => {
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setLogs((data as Log[]) || []));
  };

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  const removeOne = async (id: string) => {
    if (!confirm("Supprimer cette entrée ?")) return;
    const { error } = await supabase.from("audit_logs").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Supprimé"); refresh();
  };

  const purgeOld = async () => {
    if (!confirm("Supprimer toutes les entrées de plus de 30 jours ?")) return;
    const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { error } = await supabase.from("audit_logs").delete().lt("created_at", cutoff);
    if (error) { toast.error(error.message); return; }
    toast.success("Anciennes entrées supprimées"); refresh();
  };

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
        <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold">Sécurité & Accès</h1>
        <p className="mt-2 text-sm text-muted-foreground">Réservé à l'Admin RH.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate(-1)} className="w-fit -ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
      </Button>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sécurité & Accès</h1>
          <p className="text-sm text-muted-foreground">Journal des actions sensibles ({logs.length}).</p>
        </div>
        {logs.length > 0 && (
          <Button variant="outline" onClick={purgeOld}>
            <Eraser className="mr-2 h-4 w-4" /> Vider entrées &gt; 30 jours
          </Button>
        )}
      </div>

      <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <th className="p-4">Date</th><th className="p-4">Action</th><th className="p-4">Entité</th><th className="p-4">Acteur</th><th className="p-4 w-16" />
          </tr></thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">
                <AlertTriangle className="mx-auto mb-2 h-6 w-6 opacity-50" />
                Aucune action enregistrée.
              </td></tr>
            ) : logs.map((l) => (
              <tr key={l.id} className="border-b hover:bg-muted/50 text-sm">
                <td className="p-4">{new Date(l.created_at).toLocaleString("fr-FR")}</td>
                <td className="p-4"><Badge variant="outline">{l.action}</Badge></td>
                <td className="p-4">{l.entity || "—"}</td>
                <td className="p-4 font-mono text-xs">{l.actor_id?.slice(0, 8) || "—"}</td>
                <td className="p-4 text-right">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeOne(l.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default Securite;
