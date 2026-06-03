import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TextField, AreaField, SelectField, FormGrid } from "@/lib/forms";
import { Sparkles, AlertTriangle, Crown, TrendingUp, Users, Maximize2, Plus, Pencil, Trash2, Search, Award, Target } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Employee {
  id: string; first_name: string; last_name: string; position: string | null;
  direction_id: string | null;
}
interface Talent {
  id: string;
  employee_id: string;
  potential: string; // low | medium | high
  performance_score: number | null; // 1..3 (low/mid/high) ou note convertie
  readiness: string; // ready_now | 1_year | 2_3_years
  retention_risk: string; // low | medium | high
  target_position: string | null;
  skills: string | null;
  strengths: string | null;
  development_areas: string | null;
  career_plan: string | null;
  review_notes: string | null;
  mentor_id: string | null;
  last_review_at: string | null;
}

const POTENTIAL_LABEL: Record<string, string> = { low: "Faible", medium: "Moyen", high: "Élevé" };
const PERF_LABEL: Record<number, string> = { 1: "Sous attentes", 2: "Conforme", 3: "Au-dessus" };
const READINESS_LABEL: Record<string, string> = { ready_now: "Prêt", "1_year": "≤ 1 an", "2_3_years": "2–3 ans" };
const RISK_LABEL: Record<string, string> = { low: "Faible", medium: "Moyen", high: "Élevé" };

// Cellule 9-box : libellé + couleur
const BOX_META: Record<string, { label: string; tone: string; icon: any }> = {
  "3-3": { label: "Star", tone: "bg-emerald-500/15 border-emerald-500/40", icon: Crown },
  "3-2": { label: "Haut Potentiel", tone: "bg-emerald-500/10 border-emerald-500/30", icon: Sparkles },
  "2-3": { label: "Haut Performeur", tone: "bg-blue-500/10 border-blue-500/30", icon: Award },
  "2-2": { label: "Core", tone: "bg-amber-500/10 border-amber-500/30", icon: Users },
  "3-1": { label: "Énigme", tone: "bg-amber-500/15 border-amber-500/40", icon: Target },
  "1-3": { label: "Spécialiste", tone: "bg-blue-500/10 border-blue-500/30", icon: Award },
  "2-1": { label: "À développer", tone: "bg-orange-500/15 border-orange-500/40", icon: TrendingUp },
  "1-2": { label: "Effective", tone: "bg-orange-500/10 border-orange-500/30", icon: Users },
  "1-1": { label: "À risque", tone: "bg-rose-500/15 border-rose-500/40", icon: AlertTriangle },
};

const potentialIdx = (p: string) => (p === "high" ? 3 : p === "medium" ? 2 : 1);
const perfIdx = (s: number | null) => {
  if (s == null) return 2;
  if (s >= 7) return 3;
  if (s >= 5) return 2;
  return 1;
};

const emptyForm = (): Partial<Talent> => ({
  employee_id: "", potential: "medium", performance_score: null,
  readiness: "2_3_years", retention_risk: "low",
  target_position: "", skills: "", strengths: "", development_areas: "",
  career_plan: "", review_notes: "", mentor_id: null,
});

export default function Talents() {
  const [talents, setTalents] = useState<Talent[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Talent> | null>(null);
  const [tab, setTab] = useState("matrix");

  const load = async () => {
    setLoading(true);
    const [t, e] = await Promise.all([
      supabase.from("talents").select("*").order("created_at", { ascending: false }),
      supabase.from("employees").select("id,first_name,last_name,position,direction_id").order("last_name"),
    ]);
    setTalents((t.data as any) || []);
    setEmployees((e.data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const empName = (id: string | null) => {
    if (!id) return "—";
    const e = empMap[id]; return e ? `${e.first_name} ${e.last_name}` : "—";
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return talents;
    return talents.filter((t) => {
      const name = empName(t.employee_id).toLowerCase();
      return name.includes(q) || (t.skills || "").toLowerCase().includes(q) || (t.target_position || "").toLowerCase().includes(q);
    });
  }, [talents, query, empMap]);

  // KPIs
  const kpis = useMemo(() => {
    const total = talents.length;
    const stars = talents.filter((t) => potentialIdx(t.potential) === 3 && perfIdx(t.performance_score) === 3).length;
    const highPot = talents.filter((t) => t.potential === "high").length;
    const atRisk = talents.filter((t) => t.retention_risk === "high").length;
    const readyNow = talents.filter((t) => t.readiness === "ready_now").length;
    return { total, stars, highPot, atRisk, readyNow };
  }, [talents]);

  // Matrice : 3x3 (perf x potential)
  const matrix = useMemo(() => {
    const grid: Record<string, Talent[]> = {};
    for (let p = 1; p <= 3; p++) for (let s = 1; s <= 3; s++) grid[`${p}-${s}`] = [];
    filtered.forEach((t) => {
      const key = `${potentialIdx(t.potential)}-${perfIdx(t.performance_score)}`;
      grid[key].push(t);
    });
    return grid;
  }, [filtered]);

  const openCreate = () => { setEditing(emptyForm()); setDialogOpen(true); };
  const openEdit = (t: Talent) => { setEditing({ ...t }); setDialogOpen(true); };

  const save = async () => {
    if (!editing?.employee_id) { toast({ title: "Agent requis", variant: "destructive" }); return; }
    const payload: any = {
      employee_id: editing.employee_id,
      potential: editing.potential || "medium",
      performance_score: editing.performance_score === ("" as any) || editing.performance_score == null
        ? null : Number(editing.performance_score),
      readiness: editing.readiness || "2_3_years",
      retention_risk: editing.retention_risk || "low",
      target_position: editing.target_position || null,
      skills: editing.skills || null,
      strengths: editing.strengths || null,
      development_areas: editing.development_areas || null,
      career_plan: editing.career_plan || null,
      review_notes: editing.review_notes || null,
      mentor_id: editing.mentor_id || null,
      last_review_at: editing.last_review_at || new Date().toISOString().slice(0, 10),
    };
    const { error } = editing.id
      ? await supabase.from("talents").update(payload).eq("id", editing.id)
      : await supabase.from("talents").insert(payload);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: editing.id ? "Talent mis à jour" : "Talent ajouté" });
    setDialogOpen(false); setEditing(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce profil talent ?")) return;
    const { error } = await supabase.from("talents").delete().eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Supprimé" }); load();
  };

  // Plan de succession : grouper par target_position
  const succession = useMemo(() => {
    const map: Record<string, { readiness: string; talents: Talent[] }[]> = {};
    talents.forEach((t) => {
      const key = (t.target_position || "").trim();
      if (!key) return;
      if (!map[key]) map[key] = [{ readiness: "ready_now", talents: [] }, { readiness: "1_year", talents: [] }, { readiness: "2_3_years", talents: [] }];
      const bucket = map[key].find((b) => b.readiness === t.readiness) || map[key][2];
      bucket.talents.push(t);
    });
    return map;
  }, [talents]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestion des talents</h1>
          <p className="text-sm text-muted-foreground">Matrice 9-Box · Plans de succession · Revue stratégique</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setReviewOpen(true)} className="gap-2">
            <Maximize2 className="h-4 w-4" /> Mode revue
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Nouveau talent
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiTile icon={Users} label="Talents suivis" value={kpis.total} />
        <KpiTile icon={Crown} label="Stars (9-Box)" value={kpis.stars} tone="text-emerald-500" />
        <KpiTile icon={Sparkles} label="Hauts potentiels" value={kpis.highPot} tone="text-blue-500" />
        <KpiTile icon={TrendingUp} label="Prêts maintenant" value={kpis.readyNow} tone="text-amber-500" />
        <KpiTile icon={AlertTriangle} label="Risque de départ" value={kpis.atRisk} tone="text-rose-500" />
      </div>

      {/* Recherche */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Rechercher (agent, compétences, poste cible)…"
          value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="matrix">Matrice 9-Box</TabsTrigger>
          <TabsTrigger value="cards">Fiches talents</TabsTrigger>
          <TabsTrigger value="succession">Plan de succession</TabsTrigger>
        </TabsList>

        {/* 9-BOX */}
        <TabsContent value="matrix" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance × Potentiel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {/* Axe Y */}
                <div className="flex flex-col justify-between text-xs font-medium text-muted-foreground pt-2 pb-8">
                  <span className="-rotate-90 origin-left translate-y-12 whitespace-nowrap">Potentiel ▲</span>
                </div>
                <div className="flex-1">
                  <div className="grid grid-cols-3 gap-2">
                    {/* Lignes du haut au bas : potential 3 → 1 */}
                    {[3, 2, 1].map((pot) =>
                      [1, 2, 3].map((perf) => {
                        const key = `${pot}-${perf}`;
                        const cell = matrix[key] || [];
                        const meta = BOX_META[key];
                        const Icon = meta.icon;
                        return (
                          <div key={key} className={cn("rounded-lg border p-3 min-h-[140px] transition", meta.tone)}>
                            <div className="mb-2 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-xs font-semibold">
                                <Icon className="h-3.5 w-3.5" />
                                {meta.label}
                              </div>
                              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{cell.length}</Badge>
                            </div>
                            <div className="space-y-1.5">
                              {cell.slice(0, 5).map((t) => (
                                <button
                                  key={t.id}
                                  onClick={() => openEdit(t)}
                                  className="w-full text-left text-xs bg-background/70 hover:bg-background rounded px-2 py-1 border border-border/50 truncate"
                                  title={empName(t.employee_id)}
                                >
                                  {empName(t.employee_id)}
                                </button>
                              ))}
                              {cell.length > 5 && (
                                <div className="text-[10px] text-muted-foreground pl-1">+ {cell.length - 5} autres</div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="mt-3 text-center text-xs font-medium text-muted-foreground">Performance ▶</div>
                </div>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                💡 Performance = note d'évaluation (1–10). Potentiel = appréciation managériale. Cliquez sur un agent pour éditer.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FICHES */}
        <TabsContent value="cards" className="mt-4">
          {loading ? (
            <div className="text-center text-muted-foreground py-12">Chargement…</div>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun talent. Ajoutez le premier profil.</CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((t) => <TalentCard key={t.id} t={t} empName={empName} onEdit={openEdit} onDelete={remove} />)}
            </div>
          )}
        </TabsContent>

        {/* SUCCESSION */}
        <TabsContent value="succession" className="mt-4">
          {Object.keys(succession).length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              Aucun poste cible défini. Renseignez le champ « Poste cible » dans une fiche talent.
            </CardContent></Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(succession).map(([pos, buckets]) => (
                <Card key={pos}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" /> {pos}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-3">
                      {buckets.map((b) => (
                        <div key={b.readiness} className="rounded-lg border bg-card p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {READINESS_LABEL[b.readiness]}
                            </span>
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{b.talents.length}</Badge>
                          </div>
                          {b.talents.length === 0 ? (
                            <div className="text-xs text-muted-foreground italic">Aucun successeur</div>
                          ) : (
                            <div className="space-y-1.5">
                              {b.talents.map((t) => (
                                <button
                                  key={t.id}
                                  onClick={() => openEdit(t)}
                                  className="w-full text-left text-sm font-medium hover:text-primary transition"
                                >
                                  {empName(t.employee_id)}
                                  {t.retention_risk === "high" && (
                                    <Badge variant="destructive" className="ml-2 h-4 px-1 text-[9px]">Risque</Badge>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog création/édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Modifier le talent" : "Nouveau talent"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <FormGrid>
              <SelectField label="Agent *" value={editing.employee_id || ""} onChange={(v) => setEditing({ ...editing, employee_id: v })}
                options={employees.map((e) => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))} span={2} />
              <SelectField label="Potentiel" value={editing.potential || "medium"} onChange={(v) => setEditing({ ...editing, potential: v })}
                options={[{ value: "low", label: "Faible" }, { value: "medium", label: "Moyen" }, { value: "high", label: "Élevé" }]} />
              <TextField label="Performance (note /10)" type="number" min="0" step="0.5"
                value={(editing.performance_score ?? "") as any}
                onChange={(v) => setEditing({ ...editing, performance_score: v as any })} placeholder="Ex: 7.5" />
              <SelectField label="Préparation succession" value={editing.readiness || "2_3_years"} onChange={(v) => setEditing({ ...editing, readiness: v })}
                options={[{ value: "ready_now", label: "Prêt maintenant" }, { value: "1_year", label: "≤ 1 an" }, { value: "2_3_years", label: "2 à 3 ans" }]} />
              <SelectField label="Risque de départ" value={editing.retention_risk || "low"} onChange={(v) => setEditing({ ...editing, retention_risk: v })}
                options={[{ value: "low", label: "Faible" }, { value: "medium", label: "Moyen" }, { value: "high", label: "Élevé" }]} />
              <TextField label="Poste cible" value={editing.target_position || ""} onChange={(v) => setEditing({ ...editing, target_position: v })}
                placeholder="Ex: Chef de département IT" span={2} />
              <SelectField label="Mentor" value={editing.mentor_id || ""} onChange={(v) => setEditing({ ...editing, mentor_id: v || null as any })}
                options={[{ value: "", label: "— Aucun —" }, ...employees.map((e) => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))]} span={2} />
              <AreaField label="Compétences clés" value={editing.skills || ""} onChange={(v) => setEditing({ ...editing, skills: v })} />
              <AreaField label="Forces" value={editing.strengths || ""} onChange={(v) => setEditing({ ...editing, strengths: v })} />
              <AreaField label="Axes de développement" value={editing.development_areas || ""} onChange={(v) => setEditing({ ...editing, development_areas: v })} />
              <AreaField label="Plan de carrière" value={editing.career_plan || ""} onChange={(v) => setEditing({ ...editing, career_plan: v })} />
              <AreaField label="Notes de revue" value={editing.review_notes || ""} onChange={(v) => setEditing({ ...editing, review_notes: v })} />
            </FormGrid>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={save}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mode Revue (présentation) */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-[95vw] h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Revue de talents — {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</DialogTitle>
          </DialogHeader>
          <ReviewView talents={talents} empName={empName} matrix={matrix} kpis={kpis} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------- Sous-composants ------------------- */

function KpiTile({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 text-2xl font-bold">{value}</div>
          </div>
          <Icon className={cn("h-5 w-5 text-muted-foreground", tone)} />
        </div>
      </CardContent>
    </Card>
  );
}

function TalentCard({ t, empName, onEdit, onDelete }: {
  t: Talent; empName: (id: string | null) => string;
  onEdit: (t: Talent) => void; onDelete: (id: string) => void;
}) {
  const key = `${potentialIdx(t.potential)}-${perfIdx(t.performance_score)}`;
  const meta = BOX_META[key];
  const Icon = meta.icon;
  return (
    <Card className={cn("border-l-4 transition hover:shadow-md", meta.tone.replace("bg-", "border-l-").split(" ")[0].replace("/15", "").replace("/10", ""))}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold truncate">{empName(t.employee_id)}</div>
            {t.target_position && <div className="text-xs text-muted-foreground truncate">→ {t.target_position}</div>}
          </div>
          <Badge variant="outline" className="shrink-0 gap-1"><Icon className="h-3 w-3" />{meta.label}</Badge>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <Badge variant="secondary">Potentiel : {POTENTIAL_LABEL[t.potential]}</Badge>
          {t.performance_score != null && <Badge variant="secondary">Perf : {t.performance_score}/10</Badge>}
          <Badge variant="outline">{READINESS_LABEL[t.readiness]}</Badge>
          {t.retention_risk !== "low" && (
            <Badge variant={t.retention_risk === "high" ? "destructive" : "outline"}>
              Risque : {RISK_LABEL[t.retention_risk]}
            </Badge>
          )}
        </div>
        {t.skills && <p className="text-xs text-muted-foreground line-clamp-2"><span className="font-medium">Compétences :</span> {t.skills}</p>}
        {t.strengths && <p className="text-xs text-muted-foreground line-clamp-2"><span className="font-medium">Forces :</span> {t.strengths}</p>}
        <div className="flex justify-end gap-1 pt-1">
          <Button size="sm" variant="ghost" onClick={() => onEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(t.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewView({ talents, empName, matrix, kpis }: {
  talents: Talent[]; empName: (id: string | null) => string;
  matrix: Record<string, Talent[]>; kpis: any;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-3">
        <KpiTile icon={Users} label="Talents" value={kpis.total} />
        <KpiTile icon={Crown} label="Stars" value={kpis.stars} tone="text-emerald-500" />
        <KpiTile icon={Sparkles} label="Hauts potentiels" value={kpis.highPot} tone="text-blue-500" />
        <KpiTile icon={TrendingUp} label="Prêts" value={kpis.readyNow} tone="text-amber-500" />
        <KpiTile icon={AlertTriangle} label="À risque" value={kpis.atRisk} tone="text-rose-500" />
      </div>

      <div>
        <h3 className="mb-2 font-semibold">Matrice 9-Box</h3>
        <div className="grid grid-cols-3 gap-2">
          {[3, 2, 1].map((pot) =>
            [1, 2, 3].map((perf) => {
              const key = `${pot}-${perf}`;
              const cell = matrix[key] || [];
              const meta = BOX_META[key];
              return (
                <div key={key} className={cn("rounded-lg border p-3 min-h-[110px]", meta.tone)}>
                  <div className="text-xs font-semibold mb-1">{meta.label} ({cell.length})</div>
                  <div className="space-y-0.5">
                    {cell.map((t) => <div key={t.id} className="text-xs truncate">• {empName(t.employee_id)}</div>)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-rose-500" /> Talents à risque</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {talents.filter((t) => t.retention_risk === "high").map((t) => (
            <Card key={t.id}><CardContent className="p-3">
              <div className="font-medium">{empName(t.employee_id)}</div>
              {t.review_notes && <p className="text-xs text-muted-foreground mt-1">{t.review_notes}</p>}
            </CardContent></Card>
          ))}
          {talents.filter((t) => t.retention_risk === "high").length === 0 && (
            <div className="text-sm text-muted-foreground">Aucun talent en risque élevé.</div>
          )}
        </div>
      </div>
    </div>
  );
}
