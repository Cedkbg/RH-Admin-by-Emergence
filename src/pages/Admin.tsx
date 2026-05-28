import { useEffect, useMemo, useState } from "react";
import { Shield, ShieldOff, Check, X, Clock, RotateCcw, ArrowLeft, History, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { AgentHoursStats } from "@/components/dashboard/AgentHoursStats";

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  approval_status: "pending" | "approved" | "rejected";
  created_at: string;
}

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

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

  const loadAudit = async () => {
    setAuditLoading(true);
    const { data, error } = await supabase
      .from("role_audit_log" as any)
      .select("*")
      .order("performed_at", { ascending: false })
      .limit(200);
    if (error) { toast.error("Impossible de charger le journal"); setAuditLoading(false); return; }
    const logs = (data as any[]) || [];
    const userIds = Array.from(new Set([
      ...logs.map(l => l.target_user_id),
      ...logs.map(l => l.performed_by).filter(Boolean),
    ]));
    let profMap = new Map<string, any>();
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", userIds);
      (profs || []).forEach((p: any) => profMap.set(p.id, p));
    }
    setAuditLogs(logs.map(l => ({
      ...l,
      target: profMap.get(l.target_user_id),
      performer: l.performed_by ? profMap.get(l.performed_by) : null,
    })));
    setAuditLoading(false);
  };

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
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate(-1)} className="w-fit -ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
        <p className="text-sm text-muted-foreground">Validation des comptes et gestion des rôles.</p>
      </div>

      <Tabs defaultValue="pending" onValueChange={(v) => { if (v === "audit") loadAudit(); }}>
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
          <TabsTrigger value="audit">
            <History className="mr-2 h-4 w-4" /> Journal des rôles
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="mr-2 h-4 w-4" /> Statistiques agents
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
        <TabsContent value="audit">
          <section className="rounded-xl border bg-card shadow-sm overflow-hidden mt-4">
            {auditLoading ? (
              <div className="p-12 text-center text-muted-foreground">Chargement…</div>
            ) : auditLogs.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">Aucune modification de rôle enregistrée.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
                    <th className="p-4">Date</th>
                    <th className="p-4">Utilisateur cible</th>
                    <th className="p-4">Rôle</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Effectué par</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((l) => (
                    <tr key={l.id} className="border-b hover:bg-muted/50">
                      <td className="p-4 text-sm">{new Date(l.performed_at).toLocaleString("fr-FR")}</td>
                      <td className="p-4">
                        <div className="font-medium">{l.target?.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{l.target?.email || l.target_user_id}</div>
                      </td>
                      <td className="p-4"><Badge variant="outline">{l.role}</Badge></td>
                      <td className="p-4">
                        {l.action === "granted"
                          ? <Badge>Attribué</Badge>
                          : <Badge variant="secondary">Retiré</Badge>}
                      </td>
                      <td className="p-4 text-sm">
                        {l.performer ? (
                          <>
                            <div className="font-medium">{l.performer.full_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{l.performer.email}</div>
                          </>
                        ) : <span className="text-muted-foreground">Système</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </TabsContent>
        <TabsContent value="stats">
          <div className="mt-4">
            <AgentHoursStats />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
