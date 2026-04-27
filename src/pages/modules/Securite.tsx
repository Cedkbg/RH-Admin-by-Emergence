import { useEffect, useState } from "react";
import { Shield, AlertTriangle, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Log { id: string; actor_id: string | null; action: string; entity: string | null; entity_id: string | null; created_at: string; }

const Securite = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setLogs((data as Log[]) || []));
  }, [isAdmin]);

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sécurité & Accès</h1>
        <p className="text-sm text-muted-foreground">Journal des actions sensibles ({logs.length}).</p>
      </div>

      <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <th className="p-4">Date</th><th className="p-4">Action</th><th className="p-4">Entité</th><th className="p-4">Acteur</th>
          </tr></thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={4} className="p-12 text-center text-muted-foreground">
                <AlertTriangle className="mx-auto mb-2 h-6 w-6 opacity-50" />
                Aucune action enregistrée.
              </td></tr>
            ) : logs.map((l) => (
              <tr key={l.id} className="border-b hover:bg-muted/50 text-sm">
                <td className="p-4">{new Date(l.created_at).toLocaleString("fr-FR")}</td>
                <td className="p-4"><Badge variant="outline">{l.action}</Badge></td>
                <td className="p-4">{l.entity || "—"}</td>
                <td className="p-4 font-mono text-xs">{l.actor_id?.slice(0, 8) || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default Securite;
