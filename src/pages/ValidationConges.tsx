import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock, XCircle, Loader2, Paperclip, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface LeaveRow {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  attachment_url: string | null;
  review_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
}
interface Emp { id: string; first_name: string; last_name: string; matricule: string | null; direction_id: string | null; }

const TYPE_LABEL: Record<string, string> = {
  annual: "Congé Annuel", sick: "Maladie", maternity: "Maternité",
  paternity: "Paternité", unpaid: "Sans solde", circumstance: "Circonstance",
  paid: "Payé", other: "Autre",
};

const StatusBadge = ({ s }: { s: string }) => {
  if (s === "approved") return <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/20 border-0"><CheckCircle2 className="mr-1 h-3 w-3" />Approuvé</Badge>;
  if (s === "rejected") return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Refusé</Badge>;
  return <Badge variant="outline" className="border-amber-500 text-amber-700"><Clock className="mr-1 h-3 w-3" />En attente</Badge>;
};

const fmt = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("fr-FR");

const ValidationConges = () => {
  const { user, roles } = useAuth();
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [emps, setEmps] = useState<Map<string, Emp>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [target, setTarget] = useState<LeaveRow | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const canValidate = roles.some((r) => ["admin", "rh", "secretaire", "assistant_direction"].includes(r));

  const load = async () => {
    setLoading(true);
    const [{ data: lr }, { data: ee }] = await Promise.all([
      supabase.from("leave_requests")
        .select("id, employee_id, leave_type, start_date, end_date, reason, status, attachment_url, review_comment, reviewed_at, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("employees").select("id, first_name, last_name, matricule, direction_id"),
    ]);
    setRows((lr as LeaveRow[]) || []);
    const m = new Map<string, Emp>();
    ((ee as Emp[]) || []).forEach((e) => m.set(e.id, e));
    setEmps(m);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      const e = emps.get(r.employee_id);
      const name = e ? `${e.first_name} ${e.last_name}`.toLowerCase() : "";
      return name.includes(q) || (TYPE_LABEL[r.leave_type] || r.leave_type).toLowerCase().includes(q);
    });
  }, [rows, emps, filter, search]);

  const openAttachment = async (path: string) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 60);
    if (error || !data) { toast.error("Impossible d'ouvrir la pièce jointe"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const openDecision = (r: LeaveRow, d: "approved" | "rejected") => {
    setTarget(r); setDecision(d); setComment(r.review_comment || "");
  };

  const submit = async () => {
    if (!target || !decision) return;
    setSaving(true);
    const { error } = await supabase.from("leave_requests")
      .update({
        status: decision,
        review_comment: comment || null,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", target.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(decision === "approved" ? "Demande approuvée" : "Demande refusée");
    setTarget(null); setDecision(null); setComment("");
    load();
  };

  const stats = useMemo(() => ({
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
  }), [rows]);

  if (!canValidate) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border bg-card p-6 text-center shadow-sm">
        <h2 className="mb-2 font-semibold">Accès réservé</h2>
        <p className="text-sm text-muted-foreground">
          Seuls la RH, le cabinet (secrétariat) et l'assistant de direction peuvent valider les demandes de congé.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1300px] space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" /> Validation des demandes de congé
        </h1>
        <p className="text-sm text-muted-foreground">
          Examiner les demandes des agents, consulter les pièces jointes et notifier la décision.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border-l-4 border-amber-500 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium uppercase text-amber-700"><Clock className="h-4 w-4" /><span>En attente</span></div>
          <p className="mt-2 text-2xl font-bold">{stats.pending}</p>
        </div>
        <div className="rounded-xl border-l-4 border-green-500 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium uppercase text-green-700"><CheckCircle2 className="h-4 w-4" /><span>Approuvées</span></div>
          <p className="mt-2 text-2xl font-bold">{stats.approved}</p>
        </div>
        <div className="rounded-xl border-l-4 border-destructive bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium uppercase text-destructive"><XCircle className="h-4 w-4" /><span>Refusées</span></div>
          <p className="mt-2 text-2xl font-bold">{stats.rejected}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un agent ou un type…" className="pl-9" />
        </div>
        <div className="inline-flex rounded-md border bg-card p-0.5 text-xs">
          {(["pending", "approved", "rejected", "all"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`rounded px-3 py-1.5 font-medium transition ${filter === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {k === "pending" ? "En attente" : k === "approved" ? "Approuvées" : k === "rejected" ? "Refusées" : "Toutes"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center text-sm text-muted-foreground">
          Aucune demande {filter !== "all" ? "dans ce statut" : ""}.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => {
            const e = emps.get(r.employee_id);
            const name = e ? `${e.first_name} ${e.last_name}` : "Agent inconnu";
            return (
              <li key={r.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{name}</p>
                      {e?.matricule && <Badge variant="outline" className="text-[10px]">{e.matricule}</Badge>}
                      <StatusBadge s={r.status} />
                    </div>
                    <p className="mt-1 text-sm">
                      <span className="font-medium">{TYPE_LABEL[r.leave_type] || r.leave_type}</span>
                      {" — du "}<b>{fmt(r.start_date)}</b>{" au "}<b>{fmt(r.end_date)}</b>
                    </p>
                    {r.reason && <p className="mt-1 text-sm text-muted-foreground">{r.reason}</p>}
                    {r.attachment_url && (
                      <button
                        onClick={() => openAttachment(r.attachment_url!)}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <Paperclip className="h-3 w-3" /> Voir la pièce jointe
                      </button>
                    )}
                    {r.review_comment && r.status !== "pending" && (
                      <p className="mt-2 rounded-md bg-muted/50 p-2 text-xs italic text-muted-foreground">
                        <b>Décision :</b> {r.review_comment}
                      </p>
                    )}
                  </div>
                  {r.status === "pending" && (
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" variant="outline" onClick={() => openDecision(r, "rejected")}>
                        <XCircle className="mr-1 h-4 w-4" /> Refuser
                      </Button>
                      <Button size="sm" onClick={() => openDecision(r, "approved")}>
                        <CheckCircle2 className="mr-1 h-4 w-4" /> Approuver
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!target} onOpenChange={(o) => { if (!o) { setTarget(null); setDecision(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision === "approved" ? "Approuver la demande" : "Refuser la demande"}
            </DialogTitle>
            <DialogDescription>
              Un message sera envoyé à l'agent dans sa boîte de notifications.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Commentaire {decision === "rejected" && <span className="text-destructive">*</span>}</Label>
            <Textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={decision === "approved" ? "Ex : Bon congé, n'oubliez pas votre passation." : "Expliquez la raison du refus…"}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTarget(null); setDecision(null); }}>Annuler</Button>
            <Button
              onClick={submit}
              disabled={saving || (decision === "rejected" && !comment.trim())}
              variant={decision === "rejected" ? "destructive" : "default"}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ValidationConges;
