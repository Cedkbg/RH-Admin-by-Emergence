import { useEffect, useMemo, useState } from "react";
import {
  BarChart3, Users, Briefcase, GraduationCap, Wallet, Calendar,
  ArrowLeft, FileText, Plus, Trash2, CheckCircle2, XCircle, Clock, Send, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/useUserRoles";
import { toast } from "sonner";

const STAFF_ROLES = ["admin", "rh", "dg", "dga", "manager", "assistant_direction", "secretaire"];

const REPORT_TYPES = [
  { value: "journalier", label: "Journalier" },
  { value: "hebdomadaire", label: "Hebdomadaire" },
  { value: "mensuel", label: "Mensuel" },
  { value: "mission", label: "Mission" },
  { value: "incident", label: "Incident" },
  { value: "autre", label: "Autre" },
];

const STATUS_META: Record<string, { label: string; cls: string; icon: any }> = {
  draft:     { label: "Brouillon", cls: "bg-muted text-muted-foreground", icon: Pencil },
  submitted: { label: "Soumis",    cls: "bg-module-blue/15 text-module-blue", icon: Clock },
  approved:  { label: "Validé",    cls: "bg-module-green/15 text-module-green", icon: CheckCircle2 },
  rejected:  { label: "Rejeté",    cls: "bg-module-red/15 text-module-red", icon: XCircle },
};

interface AgentReport {
  id: string;
  employee_id: string;
  author_id: string;
  title: string;
  report_type: string;
  period_start: string | null;
  period_end: string | null;
  content: string;
  status: string;
  review_comment: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  employee_name?: string;
}

const Rapports = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasAny } = useUserRoles();
  const isStaff = hasAny(STAFF_ROLES);

  const [stats, setStats] = useState({
    employees: 0, directions: 0, jobs: 0, trainings: 0, leaves: 0, payroll: 0,
  });
  const [reports, setReports] = useState<AgentReport[]>([]);
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AgentReport | null>(null);
  const [form, setForm] = useState({
    title: "", report_type: "journalier", period_start: "", period_end: "", content: "",
  });
  const [saving, setSaving] = useState(false);

  const [reviewing, setReviewing] = useState<AgentReport | null>(null);
  const [reviewComment, setReviewComment] = useState("");

  const [tab, setTab] = useState<string>(isStaff ? "all" : "mine");

  const loadStats = async () => {
    const tables = ["employees", "directions", "job_offers", "trainings", "leave_requests", "payroll"] as const;
    const counts = await Promise.all(
      tables.map((t) => supabase.from(t).select("*", { count: "exact", head: true }))
    );
    setStats({
      employees: counts[0].count ?? 0,
      directions: counts[1].count ?? 0,
      jobs: counts[2].count ?? 0,
      trainings: counts[3].count ?? 0,
      leaves: counts[4].count ?? 0,
      payroll: counts[5].count ?? 0,
    });
  };

  const loadMine = async () => {
    if (!user?.email) return;
    const { data: emp } = await supabase
      .from("employees").select("id").ilike("email", user.email).maybeSingle();
    setMyEmployeeId(emp?.id ?? null);
  };

  const loadReports = async () => {
    const { data, error } = await (supabase as any)
      .from("agent_reports").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) { console.error(error); return; }
    const list = (data || []) as AgentReport[];
    const empIds = Array.from(new Set(list.map(r => r.employee_id)));
    if (empIds.length) {
      const { data: emps } = await supabase
        .from("employees").select("id,first_name,last_name").in("id", empIds);
      const map = new Map((emps || []).map((e: any) => [e.id, `${e.first_name} ${e.last_name}`]));
      list.forEach(r => { r.employee_name = map.get(r.employee_id) || "—"; });
    }
    setReports(list);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadStats(), loadMine(), loadReports()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", report_type: "journalier", period_start: "", period_end: "", content: "" });
    setOpen(true);
  };

  const openEdit = (r: AgentReport) => {
    setEditing(r);
    setForm({
      title: r.title,
      report_type: r.report_type,
      period_start: r.period_start || "",
      period_end: r.period_end || "",
      content: r.content,
    });
    setOpen(true);
  };

  const submit = async (asDraft: boolean) => {
    if (!user) return;
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Titre et contenu requis"); return;
    }
    if (!myEmployeeId) {
      toast.error("Profil agent introuvable, contactez la RH"); return;
    }
    setSaving(true);
    const payload: any = {
      title: form.title.trim(),
      report_type: form.report_type,
      period_start: form.period_start || null,
      period_end: form.period_end || null,
      content: form.content.trim(),
      status: asDraft ? "draft" : "submitted",
    };
    let error;
    if (editing) {
      ({ error } = await (supabase as any).from("agent_reports").update(payload).eq("id", editing.id));
    } else {
      payload.employee_id = myEmployeeId;
      payload.author_id = user.id;
      ({ error } = await (supabase as any).from("agent_reports").insert(payload));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(asDraft ? "Brouillon enregistré" : "Rapport soumis");
    setOpen(false);
    loadReports();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce rapport ?")) return;
    const { error } = await (supabase as any).from("agent_reports").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Rapport supprimé");
    loadReports();
  };

  const review = async (status: "approved" | "rejected") => {
    if (!reviewing || !user) return;
    const { error } = await (supabase as any).from("agent_reports").update({
      status, review_comment: reviewComment || null,
      reviewed_by: user.id, reviewed_at: new Date().toISOString(),
    }).eq("id", reviewing.id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "Rapport validé" : "Rapport rejeté");
    setReviewing(null); setReviewComment("");
    loadReports();
  };

  const myReports = useMemo(
    () => reports.filter(r => myEmployeeId && r.employee_id === myEmployeeId),
    [reports, myEmployeeId]
  );
  const pendingReports = useMemo(() => reports.filter(r => r.status === "submitted"), [reports]);

  const cards = [
    { label: "Agents", value: stats.employees, icon: Users, color: "text-module-blue bg-module-blue/10" },
    { label: "Directions", value: stats.directions, icon: BarChart3, color: "text-module-green bg-module-green/10" },
    { label: "Offres d'emploi", value: stats.jobs, icon: Briefcase, color: "text-module-pink bg-module-pink/10" },
    { label: "Formations", value: stats.trainings, icon: GraduationCap, color: "text-module-teal bg-module-teal/10" },
    { label: "Demandes de congé", value: stats.leaves, icon: Calendar, color: "text-module-orange bg-module-orange/10" },
    { label: "Bulletins de paie", value: stats.payroll, icon: Wallet, color: "text-module-yellow bg-module-yellow/10" },
    { label: "Rapports soumis", value: reports.length, icon: FileText, color: "text-module-indigo bg-module-indigo/10" },
    { label: "En attente", value: pendingReports.length, icon: Clock, color: "text-module-blue bg-module-blue/10" },
  ];

  const renderRow = (r: AgentReport) => {
    const meta = STATUS_META[r.status] || STATUS_META.submitted;
    const Icon = meta.icon;
    const mine = myEmployeeId === r.employee_id;
    const canEdit = mine && (r.status === "draft" || r.status === "submitted");
    return (
      <div key={r.id} className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{r.title}</h3>
              <Badge variant="outline" className="capitalize">{r.report_type}</Badge>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
                <Icon className="h-3 w-3" /> {meta.label}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {isStaff && <span className="font-medium text-foreground">{r.employee_name}</span>}
              {isStaff && " · "}
              {new Date(r.created_at).toLocaleDateString("fr-FR")}
              {r.period_start && ` · du ${new Date(r.period_start).toLocaleDateString("fr-FR")}`}
              {r.period_end && ` au ${new Date(r.period_end).toLocaleDateString("fr-FR")}`}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90 line-clamp-4">{r.content}</p>
            {r.review_comment && (
              <p className="mt-2 rounded-md border border-dashed bg-muted/40 p-2 text-xs">
                <span className="font-medium">Commentaire RH :</span> {r.review_comment}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                <Pencil className="mr-1 h-3.5 w-3.5" /> Éditer
              </Button>
            )}
            {isStaff && r.status === "submitted" && (
              <Button size="sm" onClick={() => { setReviewing(r); setReviewComment(""); }}>
                Examiner
              </Button>
            )}
            {(isStaff || mine) && (
              <Button variant="ghost" size="sm" onClick={() => remove(r.id)} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate(-1)} className="w-fit -ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rapports & Analyses</h1>
          <p className="text-sm text-muted-foreground">
            {isStaff
              ? "Indicateurs clés et rapports soumis par les agents."
              : "Consultez les indicateurs et soumettez vos rapports d'activité."}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Nouveau rapport
        </Button>
      </div>

      {isStaff && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((c) => {
            const I = c.icon;
            return (
              <div key={c.label} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-lg ${c.color}`}>
                  <I className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium uppercase text-muted-foreground">{c.label}</p>
                <p className="mt-1 text-2xl font-bold">{c.value}</p>
              </div>
            );
          })}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList>
          {isStaff && <TabsTrigger value="all">Tous ({reports.length})</TabsTrigger>}
          {isStaff && <TabsTrigger value="pending">À examiner ({pendingReports.length})</TabsTrigger>}
          <TabsTrigger value="mine">Mes rapports ({myReports.length})</TabsTrigger>
        </TabsList>

        {isStaff && (
          <TabsContent value="all" className="mt-4 space-y-3">
            {loading ? <p className="text-sm text-muted-foreground">Chargement…</p>
              : reports.length === 0 ? <p className="text-sm text-muted-foreground">Aucun rapport.</p>
              : reports.map(renderRow)}
          </TabsContent>
        )}

        {isStaff && (
          <TabsContent value="pending" className="mt-4 space-y-3">
            {pendingReports.length === 0
              ? <p className="text-sm text-muted-foreground">Rien à examiner pour le moment.</p>
              : pendingReports.map(renderRow)}
          </TabsContent>
        )}

        <TabsContent value="mine" className="mt-4 space-y-3">
          {myReports.length === 0
            ? <p className="text-sm text-muted-foreground">Vous n'avez encore soumis aucun rapport.</p>
            : myReports.map(renderRow)}
        </TabsContent>
      </Tabs>

      {/* Dialog création / édition */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le rapport" : "Nouveau rapport"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Titre *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex : Rapport hebdomadaire — semaine 23" />
              </div>
              <div>
                <Label>Type *</Label>
                <Select value={form.report_type} onValueChange={(v) => setForm({ ...form, report_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Du</Label>
                  <Input type="date" value={form.period_start}
                    onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
                </div>
                <div>
                  <Label>Au</Label>
                  <Input type="date" value={form.period_end}
                    onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label>Contenu *</Label>
                <Textarea rows={8} value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Activités réalisées, résultats, difficultés, prochaines étapes…" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => submit(true)} disabled={saving}>
              Enregistrer brouillon
            </Button>
            <Button onClick={() => submit(false)} disabled={saving}>
              <Send className="mr-2 h-4 w-4" /> Soumettre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog examen RH */}
      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Examiner : {reviewing?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="max-h-64 overflow-y-auto rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
              {reviewing?.content}
            </div>
            <div>
              <Label>Commentaire (optionnel)</Label>
              <Textarea rows={3} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => review("rejected")} className="text-destructive">
              <XCircle className="mr-2 h-4 w-4" /> Rejeter
            </Button>
            <Button onClick={() => review("approved")}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Rapports;
