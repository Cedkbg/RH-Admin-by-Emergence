import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays, CheckCircle2, Clock, XCircle, Loader2, Paperclip, Search, Filter,
  Plane, Stethoscope, Baby, Wallet, FileText, Info, User2,
} from "lucide-react";
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
  annual: "Congé Annuel", sick: "Absence Maladie", maternity: "Maternité",
  paternity: "Paternité", unpaid: "Sans solde", circumstance: "Circonstance",
  paid: "Congé Payé", other: "Autre",
};

const typeIcon = (t: string) => {
  switch (t) {
    case "sick": return { icon: Stethoscope, bg: "bg-rose-100 text-rose-600" };
    case "maternity":
    case "paternity": return { icon: Baby, bg: "bg-pink-100 text-pink-600" };
    case "unpaid": return { icon: Wallet, bg: "bg-amber-100 text-amber-700" };
    case "annual":
    case "paid": return { icon: Plane, bg: "bg-blue-100 text-blue-600" };
    default: return { icon: FileText, bg: "bg-slate-100 text-slate-600" };
  }
};

const StatusPill = ({ s }: { s: string }) => {
  if (s === "approved")
    return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-700"><CheckCircle2 className="h-3 w-3" />APPROUVÉ</span>;
  if (s === "rejected")
    return <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700"><XCircle className="h-3 w-3" />REJETÉ</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700"><Clock className="h-3 w-3" />EN ATTENTE</span>;
};

const fmt = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
const fmtShort = (s: string) =>
  new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });

const daysBetween = (a: string, b: string) => {
  const d1 = new Date(a + "T00:00:00").getTime();
  const d2 = new Date(b + "T00:00:00").getTime();
  return Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
};

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

  const monthApproved = useMemo(() => {
    const now = new Date();
    return rows.filter((r) => {
      if (r.status !== "approved" || !r.reviewed_at) return false;
      const d = new Date(r.reviewed_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [rows]);

  const stats = useMemo(() => ({
    pending: rows.filter((r) => r.status === "pending").length,
    approved: monthApproved,
    rejected: rows.filter((r) => r.status === "rejected").length,
  }), [rows, monthApproved]);

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
    <div className="mx-auto max-w-[1100px] space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Centre de Validation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Examinez et traitez les demandes de congé de vos agents.
        </p>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          onClick={() => setFilter("pending")}
          className={`rounded-2xl border-t-4 border-amber-500 bg-card p-4 text-left shadow-sm transition hover:shadow-md ${filter === "pending" ? "ring-2 ring-amber-500/40" : ""}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">En attente</span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums">{String(stats.pending).padStart(2, "0")}</p>
          <p className="text-xs text-muted-foreground">Demandes en cours d'examen</p>
        </button>

        <button
          onClick={() => setFilter("approved")}
          className={`rounded-2xl border-t-4 border-green-500 bg-card p-4 text-left shadow-sm transition hover:shadow-md ${filter === "approved" ? "ring-2 ring-green-500/40" : ""}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-green-700">Approuvées</span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums">{String(stats.approved).padStart(2, "0")}</p>
          <p className="text-xs text-muted-foreground">Validées ce mois</p>
        </button>

        <button
          onClick={() => setFilter("rejected")}
          className={`rounded-2xl border-t-4 border-rose-500 bg-card p-4 text-left shadow-sm transition hover:shadow-md ${filter === "rejected" ? "ring-2 ring-rose-500/40" : ""}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <XCircle className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Rejetées</span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums">{String(stats.rejected).padStart(2, "0")}</p>
          <p className="text-xs text-muted-foreground">Requêtes refusées</p>
        </button>
      </div>

      {/* Search bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un agent ou un type…"
            className="h-11 rounded-xl bg-muted/40 pl-9"
          />
        </div>
        <Button
          variant={filter === "all" ? "default" : "outline"}
          className="h-11 rounded-xl"
          onClick={() => setFilter(filter === "all" ? "pending" : "all")}
        >
          <Filter className="mr-2 h-4 w-4" />
          {filter === "all" ? "Filtre actif" : "Toutes"}
        </Button>
      </div>

      {/* History list */}
      <section>
        <h2 className="mb-3 text-lg font-bold">
          {filter === "pending" ? "Demandes à traiter"
            : filter === "approved" ? "Demandes approuvées"
            : filter === "rejected" ? "Demandes refusées"
            : "Toutes les demandes"}
        </h2>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card p-12 text-center text-sm text-muted-foreground">
            Aucune demande dans cette catégorie.
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((r) => {
              const e = emps.get(r.employee_id);
              const name = e ? `${e.first_name} ${e.last_name}` : "Agent inconnu";
              const { icon: Icon, bg } = typeIcon(r.leave_type);
              const dur = daysBetween(r.start_date, r.end_date);
              const accent = r.status === "approved" ? "border-l-green-500"
                : r.status === "rejected" ? "border-l-rose-500"
                : "border-l-amber-500";
              return (
                <li
                  key={r.id}
                  className={`rounded-2xl border border-l-4 ${accent} bg-card p-4 shadow-sm transition hover:shadow-md`}
                >
                  <div className="flex flex-wrap items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${bg}`}>
                      <Icon className="h-6 w-6" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold">{TYPE_LABEL[r.leave_type] || r.leave_type}</p>
                        <StatusPill s={r.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Du <b className="text-foreground">{fmt(r.start_date)}</b> au <b className="text-foreground">{fmt(r.end_date)}</b>
                        {" · "}{dur} jour{dur > 1 ? "s" : ""}
                      </p>
                      <p className="mt-2 inline-flex items-center gap-1.5 text-sm">
                        <User2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{name}</span>
                        {e?.matricule && <span className="text-xs text-muted-foreground">· {e.matricule}</span>}
                      </p>
                      {r.reason && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.reason}</p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                        <span className="text-muted-foreground">Soumis le {fmtShort(r.created_at)}</span>
                        {r.attachment_url && (
                          <button
                            onClick={() => openAttachment(r.attachment_url!)}
                            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                          >
                            <Paperclip className="h-3 w-3" /> Pièce jointe
                          </button>
                        )}
                      </div>

                      {r.review_comment && r.status !== "pending" && (
                        <p className="mt-2 rounded-md bg-muted/50 p-2 text-xs italic text-muted-foreground">
                          <b className="not-italic">Décision :</b> {r.review_comment}
                        </p>
                      )}
                    </div>

                    {r.status === "pending" && (
                      <div className="flex w-full shrink-0 gap-2 sm:w-auto sm:flex-col">
                        <Button size="sm" className="flex-1 sm:flex-none" onClick={() => openDecision(r, "approved")}>
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Approuver
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => openDecision(r, "rejected")}>
                          <XCircle className="mr-1 h-4 w-4" /> Refuser
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Chaque décision déclenche une notification automatique dans la boîte de l'agent concerné.</p>
      </div>

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
