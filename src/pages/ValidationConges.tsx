import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2, XCircle, Loader2, Paperclip, Search,
  Calendar, Clock, FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
interface Emp {
  id: string;
  first_name: string;
  last_name: string;
  matricule: string | null;
  direction_id: string | null;
  poste: string | null;
  photo_url: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  annual: "Congé Annuel", sick: "Absence Maladie", maternity: "Maternité",
  paternity: "Paternité", unpaid: "Sans solde", circumstance: "Circonstance",
  paid: "Congé Payé", other: "Autre",
};

const fmtShort = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

const daysBetween = (a: string, b: string) => {
  const d1 = new Date(a + "T00:00:00").getTime();
  const d2 = new Date(b + "T00:00:00").getTime();
  return Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
};

const initials = (e?: Emp) =>
  e ? `${(e.first_name?.[0] || "")}${(e.last_name?.[0] || "")}`.toUpperCase() : "??";

const ValidationConges = () => {
  const { user, roles } = useAuth();
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [emps, setEmps] = useState<Map<string, Emp>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
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
      supabase.from("employees").select("id, first_name, last_name, matricule, direction_id, poste, photo_url"),
    ]);
    setRows((lr as LeaveRow[]) || []);
    const m = new Map<string, Emp>();
    ((ee as Emp[]) || []).forEach((e) => m.set(e.id, e));
    setEmps(m);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
  }), [rows]);

  const monthApproved = useMemo(() => {
    const now = new Date();
    return rows.filter((r) => {
      if (r.status !== "approved" || !r.reviewed_at) return false;
      const d = new Date(r.reviewed_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (r.status !== tab) return false;
      if (!q) return true;
      const e = emps.get(r.employee_id);
      const name = e ? `${e.first_name} ${e.last_name}`.toLowerCase() : "";
      return name.includes(q) || (TYPE_LABEL[r.leave_type] || r.leave_type).toLowerCase().includes(q);
    });
  }, [rows, emps, tab, search]);

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

  if (!canValidate) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border bg-card p-6 text-center shadow-sm">
        <h2 className="mb-2 font-semibold">Accès réservé</h2>
        <p className="text-sm text-muted-foreground">
          Seuls la RH, le cabinet (secrétariat) et l'assistant de direction peuvent valider les demandes.
        </p>
      </div>
    );
  }

  const tabTitle =
    tab === "pending" ? "Demandes en attente"
    : tab === "approved" ? "Demandes approuvées"
    : "Demandes rejetées";

  const tabSubtitle =
    tab === "pending"
      ? `Vous avez ${counts.pending} demande${counts.pending > 1 ? "s" : ""} nécessitant une action immédiate.`
      : tab === "approved"
      ? `${counts.approved} demande${counts.approved > 1 ? "s" : ""} approuvée${counts.approved > 1 ? "s" : ""} au total.`
      : `${counts.rejected} demande${counts.rejected > 1 ? "s" : ""} refusée${counts.rejected > 1 ? "s" : ""}.`;

  return (
    <div className="mx-auto max-w-[1180px] space-y-6 animate-fade-in">
      {/* Header row with stat pills */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Flux de travail Manager
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{tabTitle}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{tabSubtitle}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-2 min-w-[140px]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">Total en attente</p>
            <p className="mt-1 text-2xl font-extrabold text-primary tabular-nums">
              {String(counts.pending).padStart(2, "0")}
            </p>
          </div>
          <div className="rounded-xl border-2 border-green-500/30 bg-green-500/5 px-4 py-2 min-w-[140px]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">Approuvées ce mois</p>
            <p className="mt-1 text-2xl font-extrabold text-green-600 dark:text-green-400 tabular-nums">
              {String(monthApproved).padStart(2, "0")}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs + search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-muted/50 p-1">
          {([
            ["pending", `En attente (${counts.pending})`],
            ["approved", `Approuvées`],
            ["rejected", `Rejetées`],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                tab === k ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un agent…"
            className="h-10 rounded-xl bg-muted/40 pl-9"
          />
        </div>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-12 text-center text-sm text-muted-foreground">
          Aucune demande dans cette catégorie.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((r) => {
            const e = emps.get(r.employee_id);
            const name = e ? `${e.first_name} ${e.last_name}` : "Agent inconnu";
            const sub = e?.poste || e?.matricule || "—";
            const dur = daysBetween(r.start_date, r.end_date);

            return (
              <article
                key={r.id}
                className="rounded-2xl border bg-card p-5 shadow-sm transition hover:shadow-md"
              >
                <header className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {e?.photo_url ? (
                      <img src={e.photo_url} alt={name} className="h-11 w-11 rounded-full object-cover ring-2 ring-muted" />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary ring-2 ring-muted">
                        {initials(e)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-bold">{name}</p>
                      <p className="truncate text-xs text-muted-foreground">{sub}</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    Congés
                  </span>
                </header>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-muted/40 px-3 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Dates</p>
                    <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {fmtShort(r.start_date)} – {fmtShort(r.end_date)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-3 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Durée</p>
                    <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {dur} jour{dur > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Type</p>
                  <p className="mt-0.5 text-sm font-medium">{TYPE_LABEL[r.leave_type] || r.leave_type}</p>
                </div>

                {r.reason && (
                  <div className="mt-3">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Motif</p>
                    <p className="mt-0.5 line-clamp-3 text-sm italic text-muted-foreground">
                      « {r.reason} »
                    </p>
                  </div>
                )}

                {r.attachment_url && (
                  <button
                    onClick={() => openAttachment(r.attachment_url!)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    <Paperclip className="h-3 w-3" /> Voir la pièce jointe
                  </button>
                )}

                {r.review_comment && r.status !== "pending" && (
                  <p className="mt-3 rounded-md bg-muted/50 p-2 text-xs italic text-muted-foreground">
                    <b className="not-italic">Décision :</b> {r.review_comment}
                  </p>
                )}

                {r.status === "pending" && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      className="h-10 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700"
                      onClick={() => openDecision(r, "approved")}
                    >
                      <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approuver
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 rounded-xl border-rose-300 font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900 dark:hover:bg-rose-950/40"
                      onClick={() => openDecision(r, "rejected")}
                    >
                      <XCircle className="mr-1.5 h-4 w-4" /> Rejeter
                    </Button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Decision dialog */}
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
