import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Filter, TrendingUp, AlertTriangle, Star, ChevronRight } from "lucide-react";

type Emp = {
  id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  department_id: string | null;
  department_name?: string | null;
};

type Review = { employee_id: string; score: number | null; reviewed_at: string | null };

type Dept = { id: string; name: string };

// 9-Box: lignes = potentiel (haut→bas), colonnes = performance (gauche→droite)
const BOXES = [
  // Row Haut potentiel
  { key: "enigma",      label: "Enigma",           tone: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900",   chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",   desc: "Fort potentiel mais performance à confirmer. Coaching prioritaire." },
  { key: "high_pot",    label: "High Potential",   tone: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900", chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", desc: "Bonne performance et fort potentiel. Plan de relève." },
  { key: "future_lead", label: "Future Leader",    tone: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900",         chip: "bg-blue-600 text-white",                                desc: "Performance et potentiel élevés. Candidat clé pour les postes de leadership." },
  // Row Potentiel moyen
  { key: "dilemma",     label: "Dilemma",          tone: "bg-muted/40 border-border",                                                    chip: "bg-muted text-foreground",                              desc: "Potentiel moyen, performance faible. Décision à prendre." },
  { key: "core",        label: "Core Talent",      tone: "bg-muted/40 border-border",                                                    chip: "bg-muted text-foreground",                              desc: "Performance solide, potentiel moyen. Cœur de l'organisation." },
  { key: "high_perf",   label: "High Performer",   tone: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900", chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", desc: "Excellente performance, potentiel à développer." },
  // Row Potentiel faible
  { key: "underperf",   label: "Underperformer",   tone: "bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900",         chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300",       desc: "Performance et potentiel faibles. Plan d'action requis." },
  { key: "to_develop",  label: "Talent à développer", tone: "bg-muted/40 border-border",                                                 chip: "bg-muted text-foreground",                              desc: "Performance moyenne, potentiel limité. Formation ciblée." },
  { key: "expert",      label: "Expert / Spécialiste", tone: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900", chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",   desc: "Forte performance technique, potentiel managérial limité. À valoriser." },
] as const;

type BoxKey = typeof BOXES[number]["key"];

const initials = (e: Emp) => `${e.first_name?.[0] ?? ""}${e.last_name?.[0] ?? ""}`.toUpperCase();

function bucket(score: number | null | undefined): "L" | "M" | "H" {
  if (score == null) return "L";
  if (score >= 7.5) return "H";
  if (score >= 5) return "M";
  return "L";
}

// performance = dernière note ; potentiel = moyenne des notes (proxy)
function classify(perf: "L" | "M" | "H", pot: "L" | "M" | "H"): BoxKey {
  const map: Record<string, BoxKey> = {
    HL: "enigma",     HM: "high_pot",  HH: "future_lead",
    ML: "dilemma",    MM: "core",      MH: "high_perf",
    LL: "underperf",  LM: "to_develop",LH: "expert",
  };
  return map[`${pot}${perf}`];
}

export function NineBoxMatrix() {
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [filterDept, setFilterDept] = useState<string>("all");
  const [activeBox, setActiveBox] = useState<BoxKey>("future_lead");

  useEffect(() => {
    (async () => {
      const [{ data: emps }, { data: revs }, { data: depts }] = await Promise.all([
        supabase.from("employees").select("id,first_name,last_name,position,department_id").eq("status", "active"),
        supabase.from("performance_reviews").select("employee_id,score,reviewed_at").order("reviewed_at", { ascending: false }),
        supabase.from("departments").select("id,name").order("name"),
      ]);
      setEmployees((emps as Emp[]) || []);
      setReviews((revs as Review[]) || []);
      setDepartments((depts as Dept[]) || []);
    })();
  }, []);

  const empWithDept = useMemo(() => {
    const map = new Map(departments.map((d) => [d.id, d.name]));
    return employees.map((e) => ({ ...e, department_name: e.department_id ? map.get(e.department_id) ?? null : null }));
  }, [employees, departments]);

  const filtered = useMemo(
    () => filterDept === "all" ? empWithDept : empWithDept.filter((e) => e.department_id === filterDept),
    [empWithDept, filterDept]
  );

  // Calcul par employé
  const byBox = useMemo(() => {
    const grouped: Record<BoxKey, Emp[]> = {
      enigma: [], high_pot: [], future_lead: [],
      dilemma: [], core: [], high_perf: [],
      underperf: [], to_develop: [], expert: [],
    };
    for (const e of filtered) {
      const list = reviews.filter((r) => r.employee_id === e.id && r.score != null);
      if (list.length === 0) { grouped.core.push(e); continue; }
      const last = list[0].score!;
      const avg = list.reduce((s, r) => s + (r.score ?? 0), 0) / list.length;
      grouped[classify(bucket(last), bucket(avg))].push(e);
    }
    return grouped;
  }, [filtered, reviews]);

  const activeEmployees = byBox[activeBox] || [];
  const activeMeta = BOXES.find((b) => b.key === activeBox)!;

  const totalEvaluated = filtered.length;
  const leaders = byBox.future_lead.length + byBox.high_pot.length + byBox.high_perf.length;
  const risk = byBox.underperf.length;
  const successionReadiness = totalEvaluated ? Math.round((leaders / totalEvaluated) * 100) : 0;
  const retentionRisk = totalEvaluated ? Math.round((risk / totalEvaluated) * 100) : 0;

  return (
    <Card className="overflow-hidden border-border/60">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-gradient-to-br from-primary/5 to-transparent p-5">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Sparkles className="h-5 w-5 text-primary" />
            Matrice Performance-Potentiel (9-Box)
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Identifiez les hauts potentiels et bâtissez votre plan de relève à partir des évaluations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="h-9 w-[220px]"><SelectValue placeholder="Tous les départements" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les départements</SelectItem>
              {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_320px]">
        {/* Matrice */}
        <div>
          <div className="relative">
            {/* Label axe potentiel */}
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Potentiel
            </div>
            <div className="ml-6 grid grid-cols-3 gap-2">
              {BOXES.map((b) => {
                const list = byBox[b.key];
                const isActive = activeBox === b.key;
                return (
                  <button
                    key={b.key}
                    onClick={() => setActiveBox(b.key)}
                    className={`group relative flex h-32 flex-col rounded-lg border p-3 text-left transition-all hover:shadow-md ${b.tone} ${isActive ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wide">{b.label}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${b.chip}`}>{list.length}</span>
                    </div>
                    <div className="mt-auto flex items-center gap-1">
                      {list.slice(0, 3).map((e) => (
                        <div key={e.id} className="flex h-6 w-6 items-center justify-center rounded-full border border-background bg-primary/15 text-[10px] font-bold text-primary">
                          {initials(e)}
                        </div>
                      ))}
                      {list.length > 3 && (
                        <span className="text-[10px] font-semibold text-muted-foreground">+{list.length - 3}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="ml-6 mt-2 grid grid-cols-3 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              <span>Faible</span><span>Moyenne</span><span>Élevée</span>
            </div>
            <div className="ml-6 mt-1 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Performance →
            </div>
          </div>
        </div>

        {/* Panneau latéral */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Star className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold">{activeMeta.label}</h3>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {activeEmployees.length} agent{activeEmployees.length > 1 ? "s" : ""} identifié{activeEmployees.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{activeMeta.desc}</p>

            <div className="mt-3 space-y-2">
              {activeEmployees.length === 0 && (
                <p className="rounded-md border border-dashed bg-muted/30 py-4 text-center text-xs text-muted-foreground">
                  Aucun agent dans cette case.
                </p>
              )}
              {activeEmployees.slice(0, 5).map((e) => (
                <div key={e.id} className="flex items-center gap-2 rounded-md border bg-background p-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {initials(e)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{e.first_name} {e.last_name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{e.position || e.department_name || "—"}</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              ))}
              {activeEmployees.length > 5 && (
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Voir les {activeEmployees.length} profils
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide">Analyse du segment</h3>
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><AlertTriangle className="h-3 w-3" /> Risque de rétention</span>
                  <Badge variant={retentionRisk > 20 ? "destructive" : "outline"} className="text-[10px]">
                    {retentionRisk < 15 ? "Faible" : retentionRisk < 30 ? "Moyen" : "Élevé"} ({retentionRisk}%)
                  </Badge>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-rose-500 transition-all" style={{ width: `${Math.min(100, retentionRisk)}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><TrendingUp className="h-3 w-3" /> Préparation à la relève</span>
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px]">
                    {successionReadiness >= 50 ? "Élevée" : successionReadiness >= 25 ? "Moyenne" : "Faible"} ({successionReadiness}%)
                  </Badge>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, successionReadiness)}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
