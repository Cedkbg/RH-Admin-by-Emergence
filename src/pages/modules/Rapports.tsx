import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, FileText, Plus, Trash2, CheckCircle2, XCircle, Clock, Send, Pencil,
  TrendingUp, AlertTriangle, Target, ClipboardList, Filter, Download, Calendar,
  Lock, Globe, ShieldCheck, UploadCloud, Info, ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
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

const CATEGORIES = [
  { value: "rh",         label: "RH" },
  { value: "audit",      label: "Audit" },
  { value: "financier",  label: "Financier" },
  { value: "compliance", label: "Conformité" },
];

const CONFIDENTIALITY = [
  { value: "public",       label: "Public",       desc: "Visible par toute l'organisation",      icon: Globe },
  { value: "confidentiel", label: "Confidentiel", desc: "Réservé aux managers et RH",            icon: Lock },
  { value: "secret",       label: "Hautement sécurisé", desc: "Comité de direction uniquement", icon: ShieldCheck },
];

const STEPS = [
  { key: "redaction",  label: "Rédaction",  icon: Pencil },
  { key: "revision",   label: "Révision",   icon: ClipboardCheck },
  { key: "validation", label: "Validation", icon: CheckCircle2 },
];

const STATUS_META: Record<string, { label: string; cls: string; icon: any }> = {
  draft:     { label: "Brouillon", cls: "bg-muted text-muted-foreground", icon: Pencil },
  submitted: { label: "Soumis",    cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400", icon: Clock },
  approved:  { label: "Validé",    cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 },
  rejected:  { label: "Rejeté",    cls: "bg-red-500/15 text-red-600 dark:text-red-400", icon: XCircle },
};

const PRIORITY_META: Record<string, string> = {
  haute: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  moyenne: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  basse: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
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
  reference?: string | null;
  category?: string | null;
  confidentiality?: string | null;
  department_id?: string | null;
  executive_summary?: string | null;
  employee_name?: string;
  direction_id?: string | null;
  direction_name?: string;
  department_name?: string;
}

const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

const newReference = () =>
  `RPT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;

const Rapports = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasAny } = useUserRoles();
  const isStaff = hasAny(STAFF_ROLES);

  const [reports, setReports] = useState<AgentReport[]>([]);
  const [directions, setDirections] = useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>("6m");
  const [filterDept, setFilterDept] = useState<string>("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AgentReport | null>(null);
  const [step, setStep] = useState<number>(0);
  const [form, setForm] = useState({
    title: "",
    reference: "",
    report_type: "journalier",
    category: "rh",
    department_id: "",
    confidentiality: "confidentiel",
    period_start: "",
    period_end: "",
    executive_summary: "",
    content: "",
  });
  const [saving, setSaving] = useState(false);

  const [reviewing, setReviewing] = useState<AgentReport | null>(null);
  const [reviewComment, setReviewComment] = useState("");

  const [tab, setTab] = useState<string>(isStaff ? "overview" : "mine");

  const loadAll = async () => {
    const [dirRes, depRes, repRes, empMineRes] = await Promise.all([
      supabase.from("directions").select("id,name"),
      supabase.from("departments").select("id,name").order("name"),
      (supabase as any).from("agent_reports").select("*").order("created_at", { ascending: false }).limit(500),
      user?.email
        ? supabase.from("employees").select("id,direction_id").ilike("email", user.email).maybeSingle()
        : Promise.resolve({ data: null } as any),
    ]);

    setDirections((dirRes.data as any) || []);
    setDepartments((depRes.data as any) || []);
    setMyEmployeeId((empMineRes as any).data?.id ?? null);

    const list = ((repRes as any).data || []) as AgentReport[];
    const empIds = Array.from(new Set(list.map(r => r.employee_id)));
    const depMap = new Map(((depRes.data as any) || []).map((d: any) => [d.id, d.name]));
    if (empIds.length) {
      const { data: emps } = await supabase
        .from("employees").select("id,first_name,last_name,direction_id").in("id", empIds);
      const dirMap = new Map(((dirRes.data as any) || []).map((d: any) => [d.id, d.name]));
      const map = new Map((emps || []).map((e: any) => [e.id, e]));
      list.forEach(r => {
        const e: any = map.get(r.employee_id);
        r.employee_name = e ? `${e.first_name} ${e.last_name}` : "—";
        r.direction_id = e?.direction_id ?? null;
        r.direction_name = e?.direction_id ? (dirMap.get(e.direction_id) as string) : "—";
        r.department_name = r.department_id ? (depMap.get(r.department_id) as string) : "—";
      });
    }
    setReports(list);
  };

  useEffect(() => {
    (async () => { setLoading(true); await loadAll(); setLoading(false); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const visibleReports = useMemo(
    () => (filterDept ? reports.filter((r) => r.department_id === filterDept) : reports),
    [reports, filterDept]
  );

  // ---------- KPIs ----------
  const kpis = useMemo(() => {
    const total = visibleReports.length;
    const pending = visibleReports.filter(r => r.status === "submitted").length;
    const approved = visibleReports.filter(r => r.status === "approved").length;
    const now = Date.now();
    const late = visibleReports.filter(r => {
      if (r.status !== "submitted") return false;
      const days = (now - new Date(r.created_at).getTime()) / 86400000;
      return days > 7;
    }).length;
    const rate = total ? Math.round((approved / total) * 100) : 0;
    return { total, pending, late, rate };
  }, [visibleReports]);

  // ---------- Monthly trend ----------
  const monthly = useMemo(() => {
    const monthsBack = period === "12m" ? 12 : period === "3m" ? 3 : 6;
    const now = new Date();
    const buckets: { key: string; label: string; soumis: number; valides: number }[] = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: MONTHS_FR[d.getMonth()],
        soumis: 0, valides: 0,
      });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    visibleReports.forEach(r => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const i = idx.get(key);
      if (i === undefined) return;
      buckets[i].soumis++;
      if (r.status === "approved") buckets[i].valides++;
    });
    return buckets;
  }, [visibleReports, period]);

  // ---------- By department ----------
  const byDepartment = useMemo(() => {
    const counts = new Map<string, number>();
    visibleReports.forEach(r => {
      const name = r.department_name || "Non assigné";
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    const arr = Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
    arr.sort((a, b) => b.count - a.count);
    const max = Math.max(...arr.map(a => a.count), 1);
    return arr.slice(0, 6).map(x => ({ ...x, pct: Math.round((x.count / max) * 100) }));
  }, [visibleReports]);

  // ---------- Recommendations (incident + rejected reports = action items) ----------
  const recommendations = useMemo(() => {
    return visibleReports
      .filter(r => r.report_type === "incident" || r.status === "rejected" || r.status === "submitted")
      .slice(0, 8)
      .map(r => ({
        id: r.id,
        action: r.title,
        source: r.report_type === "incident" ? "Incident terrain" : r.status === "rejected" ? "À retravailler" : "À examiner",
        direction: r.department_name || r.direction_name || "—",
        echeance: r.period_end || r.created_at,
        priorite: r.report_type === "incident" ? "haute" : r.status === "rejected" ? "moyenne" : "basse",
        status: r.status,
      }));
  }, [visibleReports]);

  const myReports = useMemo(
    () => visibleReports.filter(r => myEmployeeId && r.employee_id === myEmployeeId),
    [visibleReports, myEmployeeId]
  );
  const pendingReports = useMemo(() => visibleReports.filter(r => r.status === "submitted"), [visibleReports]);

  // ---------- Form actions ----------
  const resetForm = (r?: AgentReport | null) => ({
    title: r?.title ?? "",
    reference: r?.reference ?? newReference(),
    report_type: r?.report_type ?? "journalier",
    category: r?.category ?? "rh",
    department_id: r?.department_id ?? "",
    confidentiality: r?.confidentiality ?? "confidentiel",
    period_start: r?.period_start ?? "",
    period_end: r?.period_end ?? "",
    executive_summary: r?.executive_summary ?? "",
    content: r?.content ?? "",
  });

  const openCreate = () => {
    setEditing(null);
    setStep(0);
    setForm(resetForm(null));
    setOpen(true);
  };
  const openEdit = (r: AgentReport) => {
    setEditing(r);
    setStep(0);
    setForm(resetForm(r));
    setOpen(true);
  };


  const submit = async (asDraft: boolean) => {
    if (!user) return;
    if (!form.title.trim()) { toast.error("Titre requis"); return; }
    if (!form.content.trim() && !form.executive_summary.trim()) {
      toast.error("Ajoute un résumé ou un contenu"); return;
    }
    if (!myEmployeeId) { toast.error("Profil agent introuvable, contactez la RH"); return; }
    setSaving(true);
    const payload: any = {
      title: form.title.trim(),
      reference: form.reference || null,
      report_type: form.report_type,
      category: form.category,
      department_id: form.department_id || null,
      confidentiality: form.confidentiality,
      period_start: form.period_start || null,
      period_end: form.period_end || null,
      executive_summary: form.executive_summary.trim() || null,
      content: (form.content.trim() || form.executive_summary.trim()),
      status: asDraft ? "draft" : "submitted",
    };
    let error;
    if (editing) {
      ({ error } = await (supabase as any).from("agent_reports").update(payload).eq("id", editing.id));
    } else {
      payload.employee_id = myEmployeeId; payload.author_id = user.id;
      ({ error } = await (supabase as any).from("agent_reports").insert(payload));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(asDraft ? "Brouillon enregistré" : "Rapport soumis");
    setOpen(false); loadAll();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce rapport ?")) return;
    const { error } = await (supabase as any).from("agent_reports").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Rapport supprimé"); loadAll();
  };

  const review = async (status: "approved" | "rejected") => {
    if (!reviewing || !user) return;
    const { error } = await (supabase as any).from("agent_reports").update({
      status, review_comment: reviewComment || null,
      reviewed_by: user.id, reviewed_at: new Date().toISOString(),
    }).eq("id", reviewing.id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "Rapport validé" : "Rapport rejeté");
    setReviewing(null); setReviewComment(""); loadAll();
  };

  // ---------- KPI cards ----------
  const kpiCards = [
    {
      label: "TOTAL RAPPORTS", value: kpis.total.toLocaleString("fr-FR"),
      icon: FileText, trend: "+15%", trendUp: true,
      tint: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    },
    {
      label: "EN ATTENTE", value: kpis.pending.toString(),
      icon: ClipboardList, trend: kpis.pending > 0 ? `${kpis.pending} à traiter` : "À jour", trendUp: false,
      tint: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-300",
    },
    {
      label: "ACTIONS EN RETARD", value: kpis.late.toString(),
      icon: AlertTriangle, trend: kpis.late > 0 ? "À traiter" : "Aucun", trendUp: false,
      tint: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    },
    {
      label: "TAUX D'EXÉCUTION", value: `${kpis.rate}%`,
      icon: Target, trend: kpis.rate >= 80 ? "Objectif atteint" : "À améliorer", trendUp: kpis.rate >= 80,
      tint: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    },
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
              {isStaff && r.department_name && r.department_name !== "—" && ` · ${r.department_name}`}
              {" · "}{new Date(r.created_at).toLocaleDateString("fr-FR")}
              {r.period_start && ` · du ${new Date(r.period_start).toLocaleDateString("fr-FR")}`}
              {r.period_end && ` au ${new Date(r.period_end).toLocaleDateString("fr-FR")}`}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90 line-clamp-3">{r.content}</p>
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
    <div className="mx-auto max-w-[1500px] space-y-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate(-1)} className="w-fit -ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
      </Button>

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vue d'ensemble stratégique</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analyse des performances RH et suivi des plans d'action
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[170px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">3 derniers mois</SelectItem>
              <SelectItem value="6m">6 derniers mois</SelectItem>
              <SelectItem value="12m">12 derniers mois</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterDept || "all"} onValueChange={(v) => setFilterDept(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[200px]">
              <Filter className="mr-2 h-4 w-4 shrink-0" />
              <SelectValue placeholder="Filtrer par département" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les départements</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nouveau rapport
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      {isStaff && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((c) => {
            const I = c.icon;
            return (
              <div key={c.label} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.tint}`}>
                    <I className="h-5 w-5" />
                  </div>
                  <span className={`text-xs font-medium ${c.trendUp ? "text-emerald-600" : "text-muted-foreground"}`}>
                    {c.trend}
                  </span>
                </div>
                <p className="mt-4 text-xs font-medium tracking-wide text-muted-foreground">{c.label}</p>
                <p className="mt-1 text-3xl font-bold tracking-tight">{c.value}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Trends + By Department */}
      {isStaff && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  Tendance des rapports
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Comparaison mensuelle : soumis vs validés
                </p>
              </div>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Line type="monotone" dataKey="soumis" stroke="#3b82f6" strokeWidth={2.5} name="Soumis" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="valides" stroke="#10b981" strokeWidth={2.5} name="Validés" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Rapports par département</h3>
            <div className="space-y-4">
              {byDepartment.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune donnée.</p>
              ) : byDepartment.map((d, i) => {
                const colors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-pink-500", "bg-cyan-500"];
                return (
                  <div key={d.name}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="truncate pr-2">{d.name}</span>
                      <span className="font-semibold tabular-nums">{d.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${colors[i % colors.length]}`} style={{ width: `${d.pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {byDepartment.length > 0 && (
              <Button variant="link" className="px-0 mt-3" onClick={() => setTab("all")}>
                Voir les détails complets →
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Recommendations table */}
      {isStaff && recommendations.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b">
            <h3 className="font-semibold">Dernières recommandations stratégiques</h3>
            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
              Alertes de conformité
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs uppercase tracking-wide">Action</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Département</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Échéance</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Priorité</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recommendations.map((rec) => {
                const meta = STATUS_META[rec.status] || STATUS_META.submitted;
                const Icon = meta.icon;
                return (
                  <TableRow key={rec.id}>
                    <TableCell>
                      <div className="font-medium">{rec.action}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Source : {rec.source}</div>
                    </TableCell>
                    <TableCell className="text-sm">{rec.direction}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(rec.echeance).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`uppercase text-[10px] ${PRIORITY_META[rec.priorite]}`}>
                        {rec.priorite}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
                        <Icon className="h-3 w-3" /> {meta.label}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Reports list */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold">Centre de reporting</h3>
            <TabsList>
              {isStaff && <TabsTrigger value="overview">Tous ({visibleReports.length})</TabsTrigger>}
              {isStaff && <TabsTrigger value="all">Liste complète</TabsTrigger>}
              {isStaff && <TabsTrigger value="pending">À examiner ({pendingReports.length})</TabsTrigger>}
              <TabsTrigger value="mine">Mes rapports ({myReports.length})</TabsTrigger>
            </TabsList>
          </div>

          {isStaff && (
            <TabsContent value="overview" className="space-y-3 mt-0">
              {loading ? <p className="text-sm text-muted-foreground">Chargement…</p>
                : reports.length === 0 ? <p className="text-sm text-muted-foreground">Aucun rapport.</p>
                : reports.slice(0, 5).map(renderRow)}
            </TabsContent>
          )}
          {isStaff && (
            <TabsContent value="all" className="space-y-3 mt-0">
              {reports.length === 0 ? <p className="text-sm text-muted-foreground">Aucun rapport.</p>
                : reports.map(renderRow)}
            </TabsContent>
          )}
          {isStaff && (
            <TabsContent value="pending" className="space-y-3 mt-0">
              {pendingReports.length === 0
                ? <p className="text-sm text-muted-foreground">Rien à examiner pour le moment.</p>
                : pendingReports.map(renderRow)}
            </TabsContent>
          )}
          <TabsContent value="mine" className="space-y-3 mt-0">
            {myReports.length === 0
              ? <p className="text-sm text-muted-foreground">Vous n'avez encore soumis aucun rapport.</p>
              : myReports.map(renderRow)}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog création / édition — Création de Rapport décisionnel */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0">
          {/* Top header */}
          <div className="border-b px-6 pt-6 pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  Reporting Center · {editing ? "Édition" : "Nouveau Rapport Stratégique"}
                </p>
                <DialogTitle className="text-2xl mt-1">
                  {editing ? "Modifier le Rapport" : "Création de Rapport"}
                </DialogTitle>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => submit(true)} disabled={saving}>
                  Brouillon
                </Button>
                <Button onClick={() => submit(false)} disabled={saving}>
                  <Send className="mr-2 h-4 w-4" /> Soumettre
                </Button>
              </div>
            </div>

            {/* Stepper */}
            <div className="mt-6 flex items-center gap-2">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const active = i === step;
                const done = i < step;
                return (
                  <div key={s.key} className="flex items-center flex-1 last:flex-none">
                    <button
                      type="button"
                      onClick={() => setStep(i)}
                      className="flex flex-col items-center gap-1.5 shrink-0"
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                        active ? "border-primary bg-primary text-primary-foreground"
                        : done ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-muted bg-muted text-muted-foreground"
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
                        {s.label}
                      </span>
                    </button>
                    {i < STEPS.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-2 ${i < step ? "bg-emerald-500" : "bg-muted"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Body */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 p-6">
            {/* Left col – main form */}
            <div className="lg:col-span-2 space-y-5">
              {step === 0 && (
                <>
                  <section className="rounded-xl border bg-card p-5">
                    <h3 className="flex items-center gap-2 font-semibold mb-4">
                      <Info className="h-4 w-4 text-blue-600" /> Informations Générales
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Titre du rapport</Label>
                        <Input
                          className="mt-1.5"
                          value={form.title}
                          onChange={(e) => setForm({ ...form, title: e.target.value })}
                          placeholder="ex: Analyse du Turnover Q2 2026"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Référence</Label>
                          <Input
                            className="mt-1.5"
                            value={form.reference}
                            onChange={(e) => setForm({ ...form, reference: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Département</Label>
                          <Select
                            value={form.department_id || "none"}
                            onValueChange={(v) => setForm({ ...form, department_id: v === "none" ? "" : v })}
                          >
                            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— Aucun —</SelectItem>
                              {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Type</Label>
                          <Select value={form.report_type} onValueChange={(v) => setForm({ ...form, report_type: v })}>
                            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {REPORT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Du</Label>
                          <Input type="date" className="mt-1.5" value={form.period_start}
                            onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Au</Label>
                          <Input type="date" className="mt-1.5" value={form.period_end}
                            onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-xl border bg-card p-5">
                    <h3 className="flex items-center gap-2 font-semibold mb-4">
                      <ClipboardCheck className="h-4 w-4 text-blue-600" /> Résumé Exécutif
                    </h3>
                    <Textarea
                      rows={7}
                      value={form.executive_summary}
                      onChange={(e) => setForm({ ...form, executive_summary: e.target.value })}
                      placeholder="Rédigez le résumé exécutif de votre rapport…"
                    />
                  </section>
                </>
              )}

              {step === 1 && (
                <section className="rounded-xl border bg-card p-5">
                  <h3 className="flex items-center gap-2 font-semibold mb-4">
                    <ClipboardCheck className="h-4 w-4 text-blue-600" /> Contenu détaillé
                  </h3>
                  <Textarea
                    rows={14}
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="Analyse détaillée, données, méthodologie, conclusions, recommandations…"
                  />
                </section>
              )}

              {step === 2 && (
                <section className="rounded-xl border bg-card p-5 space-y-3">
                  <h3 className="flex items-center gap-2 font-semibold mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Récapitulatif
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Titre :</span> <span className="font-medium">{form.title || "—"}</span></div>
                    <div><span className="text-muted-foreground">Référence :</span> <span className="font-medium">{form.reference}</span></div>
                    <div><span className="text-muted-foreground">Catégorie :</span> <span className="font-medium">{CATEGORIES.find(c => c.value === form.category)?.label}</span></div>
                    <div><span className="text-muted-foreground">Confidentialité :</span> <span className="font-medium">{CONFIDENTIALITY.find(c => c.value === form.confidentiality)?.label}</span></div>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap max-h-48 overflow-auto">
                    {form.executive_summary || form.content || "Aucun contenu rédigé."}
                  </div>
                </section>
              )}

              {/* Stepper nav */}
              <div className="flex items-center justify-between">
                <Button variant="outline" disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))}>
                  Précédent
                </Button>
                {step < STEPS.length - 1 ? (
                  <Button onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}>
                    Suivant
                  </Button>
                ) : (
                  <Button onClick={() => submit(false)} disabled={saving}>
                    <Send className="mr-2 h-4 w-4" /> Soumettre
                  </Button>
                )}
              </div>
            </div>

            {/* Right col – settings */}
            <aside className="space-y-5">
              <section className="rounded-xl border bg-card p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Paramètres de diffusion</p>
                <Label className="text-xs font-medium">Catégorie du rapport</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {CATEGORIES.map(c => {
                    const active = form.category === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setForm({ ...form, category: c.value })}
                        className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card hover:bg-muted/50"
                        }`}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>

                <Label className="mt-5 block text-xs font-medium">Niveau de confidentialité</Label>
                <div className="mt-2 space-y-2">
                  {CONFIDENTIALITY.map(c => {
                    const Icon = c.icon;
                    const active = form.confidentiality === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setForm({ ...form, confidentiality: c.value })}
                        className={`w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                          active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                          active ? "border-primary" : "border-muted-foreground/40"
                        }`}>
                          {active && <div className="h-2 w-2 rounded-full bg-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <Icon className="h-3.5 w-3.5" /> {c.label}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-xl border bg-card p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                  Pièces jointes & données
                </p>
                <label className="block cursor-pointer rounded-lg border-2 border-dashed border-border bg-muted/20 p-6 text-center hover:bg-muted/40 transition-colors">
                  <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">Glisser-déposer des fichiers</p>
                  <p className="text-xs text-muted-foreground mt-0.5">PDF, Excel, CSV (max 10 Mo)</p>
                  <input type="file" multiple className="hidden" onChange={() => toast.info("Upload à venir")} />
                </label>
              </section>
            </aside>
          </div>
        </DialogContent>
      </Dialog>


      {/* Dialog examen */}
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
