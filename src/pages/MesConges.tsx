import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CheckCircle2, Clock, XCircle, Send, Search, Info, Loader2, Paperclip, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  created_at: string;
  attachment_url?: string | null;
  review_comment?: string | null;
}

const LEAVE_TYPES: { value: string; label: string }[] = [
  { value: "annual", label: "Congé Annuel" },
  { value: "sick", label: "Congé Maladie" },
  { value: "maternity", label: "Congé Maternité" },
  { value: "paternity", label: "Congé Paternité" },
  { value: "unpaid", label: "Congé sans solde" },
  { value: "circumstance", label: "Congé de circonstance" },
  { value: "other", label: "Autre" },
];

const typeLabel = (v: string) =>
  LEAVE_TYPES.find((t) => t.value === v)?.label || v;

const fmtDate = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

/** Jours ouvrables RDC : on exclut le dimanche uniquement. */
const workingDaysBetween = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
  let count = 0;
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0) count++;
  }
  return count;
};

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-700 dark:text-green-400">
        <CheckCircle2 className="h-3 w-3" /> Approuvé
      </span>
    );
  if (status === "rejected")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
        <XCircle className="h-3 w-3" /> Rejeté
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
      <Clock className="h-3 w-3" /> En attente
    </span>
  );
};

const MesConges = () => {
  const { user } = useAuth();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    leave_type: "annual",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        // 1) Récupérer l'email via la session OU le profil (fallback iOS)
        let email = user.email ?? null;
        if (!email) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", user.id)
            .maybeSingle();
          email = prof?.email ?? null;
        }
        if (!email) {
          if (alive) setLoading(false);
          return;
        }
        // 2) Trouver la fiche employé liée
        const { data: emp } = await supabase
          .from("employees")
          .select("id")
          .ilike("email", email)
          .maybeSingle();
        if (!alive) return;
        if (!emp) {
          setLoading(false);
          return;
        }
        setEmployeeId(emp.id);
        const { data: rows } = await supabase
          .from("leave_requests")
          .select("id, leave_type, start_date, end_date, reason, status, created_at, attachment_url, review_comment")
          .eq("employee_id", emp.id)
          .order("created_at", { ascending: false });
        if (!alive) return;
        setRequests((rows as LeaveRequest[]) || []);
      } catch (e) {
        console.error("Erreur chargement congés:", e);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [user?.id, user?.email]);

  const stats = useMemo(() => {
    const month = new Date().getMonth();
    const year = new Date().getFullYear();
    return {
      pending: requests.filter((r) => r.status === "pending").length,
      approvedMonth: requests.filter((r) => {
        if (r.status !== "approved") return false;
        const d = new Date(r.created_at);
        return d.getMonth() === month && d.getFullYear() === year;
      }).length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    };
  }, [requests]);

  const duration = useMemo(
    () => workingDaysBetween(form.start_date, form.end_date),
    [form.start_date, form.end_date]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter(
      (r) =>
        typeLabel(r.leave_type).toLowerCase().includes(q) ||
        (r.reason || "").toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
    );
  }, [requests, search]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      toast.error("Votre profil agent n'est pas encore lié. Contactez la RH.");
      return;
    }
    if (!form.start_date || !form.end_date) {
      toast.error("Veuillez renseigner les dates de début et de fin.");
      return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      toast.error("La date de fin doit être après la date de début.");
      return;
    }
    setSubmitting(true);
    try {
      let attachment_url: string | null = null;
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          throw new Error("Pièce jointe trop volumineuse (max 10 Mo).");
        }
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${user!.id}/leave-attachments/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("documents")
          .upload(path, file, { upsert: false, contentType: file.type || undefined });
        if (upErr) throw upErr;
        attachment_url = path;
      }
      const { data, error } = await supabase
        .from("leave_requests")
        .insert({
          employee_id: employeeId,
          leave_type: form.leave_type,
          start_date: form.start_date,
          end_date: form.end_date,
          reason: form.reason || null,
          status: "pending",
          attachment_url,
        })
        .select("id, leave_type, start_date, end_date, reason, status, created_at, attachment_url, review_comment")
        .single();
      if (error) throw error;
      setRequests((prev) => [data as LeaveRequest, ...prev]);
      setForm({ leave_type: "annual", start_date: "", end_date: "", reason: "" });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Demande soumise avec succès ✅");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Impossible de soumettre la demande.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[40vh] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement…
      </div>
    );
  }

  if (!employeeId) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border bg-card p-6 text-center shadow-sm">
        <h2 className="mb-2 font-semibold">Profil agent non lié</h2>
        <p className="text-sm text-muted-foreground">
          Votre compte n'est pas encore rattaché à une fiche agent. Contactez la RH.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] animate-fade-in space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Centre de Demandes</h1>
        <p className="text-sm text-muted-foreground">Gérez vos requêtes RH et paie en toute simplicité.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ====== Colonne gauche : stats + historique ====== */}
        <section className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border-l-4 border-amber-500 bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
                <Clock className="h-4 w-4" />
                <span>En attente</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums">{String(stats.pending).padStart(2, "0")}</p>
              <p className="text-[11px] text-muted-foreground">Demandes en cours d'examen</p>
            </div>
            <div className="rounded-xl border-l-4 border-green-500 bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Approuvées</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums">{String(stats.approvedMonth).padStart(2, "0")}</p>
              <p className="text-[11px] text-muted-foreground">Validées ce mois</p>
            </div>
            <div className="rounded-xl border-l-4 border-destructive bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-destructive">
                <XCircle className="h-4 w-4" />
                <span>Rejetées</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums">{String(stats.rejected).padStart(2, "0")}</p>
              <p className="text-[11px] text-muted-foreground">À réviser</p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une demande..."
              className="pl-9"
            />
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold">Historique des Demandes</h2>
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
                Aucune demande pour le moment. Utilisez le formulaire pour en créer une.
              </div>
            ) : (
              <ul className="space-y-3">
                {filtered.map((r) => {
                  const days = workingDaysBetween(r.start_date, r.end_date);
                  const borderColor =
                    r.status === "approved"
                      ? "border-l-green-500"
                      : r.status === "rejected"
                      ? "border-l-destructive"
                      : "border-l-amber-500";
                  return (
                    <li
                      key={r.id}
                      className={`rounded-xl border border-l-4 ${borderColor} bg-card p-4 shadow-sm transition hover:shadow-md`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{typeLabel(r.leave_type)}</p>
                          <p className="text-xs text-muted-foreground">
                            Du {fmtDate(r.start_date)} au {fmtDate(r.end_date)} • {days} jour{days > 1 ? "s" : ""}
                          </p>
                          {r.reason && (
                            <p className="mt-1.5 text-sm text-foreground/80 line-clamp-2">{r.reason}</p>
                          )}
                          {r.attachment_url && (
                            <button
                              type="button"
                              onClick={async () => {
                                const { data, error } = await supabase.storage
                                  .from("documents")
                                  .createSignedUrl(r.attachment_url!, 60);
                                if (error || !data) { toast.error("Impossible d'ouvrir la pièce jointe"); return; }
                                window.open(data.signedUrl, "_blank");
                              }}
                              className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                            >
                              <Paperclip className="h-3 w-3" /> Voir la pièce jointe
                            </button>
                          )}
                          {r.review_comment && r.status !== "pending" && (
                            <p className="mt-1.5 rounded-md bg-muted/50 p-2 text-xs italic text-muted-foreground">
                              <b>Réponse :</b> {r.review_comment}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <StatusBadge status={r.status} />
                          <p className="text-[11px] text-muted-foreground">
                            Soumis le {new Date(r.created_at).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground/80">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              Les demandes de congés doivent être soumises au moins <b>15 jours à l'avance</b> conformément à la politique de l'entreprise.
            </p>
          </div>
        </section>

        {/* ====== Colonne droite : nouveau formulaire ====== */}
        <section className="space-y-4">
          <form onSubmit={submit} className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
            <h2 className="font-semibold">Détails de la demande</h2>

            <div className="space-y-1.5">
              <Label htmlFor="leave_type" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Type de demande
              </Label>
              <select
                id="leave_type"
                value={form.leave_type}
                onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {LEAVE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start_date" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Date de début
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end_date" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Date de fin
                </Label>
                <Input
                  id="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reason" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Motif / Commentaire
              </Label>
              <Textarea
                id="reason"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Précisez les raisons de votre demande..."
                rows={4}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="attachment" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Pièce jointe (optionnel)
              </Label>
              <input
                ref={fileInputRef}
                id="attachment"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary/20"
              />
              {file && (
                <div className="flex items-center justify-between rounded-md border bg-muted/40 px-2 py-1.5 text-xs">
                  <span className="flex items-center gap-1.5 truncate">
                    <Paperclip className="h-3 w-3 shrink-0" /> {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="ml-2 text-muted-foreground hover:text-destructive"
                    aria-label="Retirer la pièce jointe"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                PDF, image ou document Word. Taille max : 10 Mo.
              </p>
            </div>
          </form>

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 font-semibold">Récapitulatif</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Type</span>
                <span className="font-semibold">{typeLabel(form.leave_type)}</span>
              </div>
              <div className="flex items-center justify-between pb-1">
                <span className="text-muted-foreground">Durée estimée</span>
                <span className="text-2xl font-bold tabular-nums text-primary">
                  {duration} <span className="text-xs font-medium text-muted-foreground">JOURS</span>
                </span>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-muted/50 p-2 text-[11px] italic text-muted-foreground">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                Le calcul des jours est basé sur les jours ouvrables officiels en RDC (dimanche exclu).
              </div>
            </div>

            <Button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="mt-4 h-12 w-full text-base font-semibold"
            >
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi…</>
              ) : (
                <><Send className="mr-2 h-4 w-4" /> Soumettre la demande</>
              )}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MesConges;
