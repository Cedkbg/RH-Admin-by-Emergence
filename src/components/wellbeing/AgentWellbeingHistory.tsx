import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  HeartHandshake, Zap, Activity, Sparkles,
  Sunrise, Sunset, TrendingUp, Trash2, Smile, Frown, Meh,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const periodKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const periodLabel = (p: string) => {
  const [y, m] = p.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());
};

const fmtDate = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

interface Survey {
  id: string;
  mood_score: number | null;
  energy_score: number | null;
  stress_score: number | null;
  comments: string | null;
  highlight: string | null;
  moment: string;
  submitted_at: string;
}

interface AgentWellbeingHistoryProps {
  agentId: string | null;
  firstName: string;
  lastName: string;
  matricule: string | null;
  direction: string;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

const moodEmoji = (score: number | null) => {
  if (score == null) return { icon: HeartHandshake, label: "—", color: "text-muted-foreground" };
  if (score >= 4) return { icon: Smile, label: "Excellent", color: "text-emerald-500" };
  if (score >= 3) return { icon: Smile, label: "Bien", color: "text-blue-500" };
  if (score >= 2) return { icon: Meh, label: "Neutre", color: "text-amber-500" };
  return { icon: Frown, label: "Bas", color: "text-red-500" };
};

const ScoreBar = ({ value, max = 5, color }: { value: number | null; max?: number; color: string }) => {
  if (value == null) return <div className="h-1.5 rounded-full bg-muted" />;
  const pct = Math.round((value / max) * 100);
  return (
    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
};

export function AgentWellbeingHistory({
  agentId,
  firstName,
  lastName,
  matricule,
  direction,
  onClose,
  onDelete,
}: AgentWellbeingHistoryProps) {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyPeriod, setHistoryPeriod] = useState(periodKey(new Date()));

  // Generate last 12 months for evolution chart
  const monthlyEvolution = useMemo(() => {
    const now = new Date();
    const months: { period: string; label: string; mood: number; energy: number; stress: number; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const p = periodKey(d);
      months.push({
        period: p,
        label: periodLabel(p).split(" ")[0].substring(0, 3),
        mood: 0,
        energy: 0,
        stress: 0,
        count: 0,
      });
    }
    return months;
  }, []);

  useEffect(() => {
    if (!agentId) return;
    const load = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().slice(0, 10);
        const { data, error } = await supabase
          .from("wellbeing_surveys")
          .select("id,mood_score,energy_score,stress_score,comments,highlight,moment,submitted_at")
          .eq("employee_id", agentId)
          .gte("submitted_at", startDate)
          .order("submitted_at", { ascending: false });
        if (error) throw error;
        setSurveys((data as Survey[]) || []);
      } catch (err: any) {
        console.error("[AgentWellbeingHistory] Error:", err);
        toast.error("Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [agentId]);

  // Compute monthly averages
  const computedMonths = useMemo(() => {
    const map = new Map<string, { mood: number[]; energy: number[]; stress: number[] }>();
    monthlyEvolution.forEach((m) => map.set(m.period, { mood: [], energy: [], stress: [] }));

    surveys.forEach((s) => {
      const p = s.submitted_at.substring(0, 7);
      const rec = map.get(p);
      if (!rec) return;
      if (s.mood_score != null) rec.mood.push(s.mood_score);
      if (s.energy_score != null) rec.energy.push(s.energy_score);
      if (s.stress_score != null) rec.stress.push(s.stress_score);
    });

    return monthlyEvolution.map((m) => {
      const rec = map.get(m.period);
      if (!rec) return { ...m, mood: 0, energy: 0, stress: 0, count: 0 };
      const avg = (arr: number[]) =>
        arr.length > 0 ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;
      return {
        ...m,
        mood: avg(rec.mood),
        energy: avg(rec.energy),
        stress: avg(rec.stress),
        count: rec.mood.length,
      };
    });
  }, [surveys, monthlyEvolution]);

  // Entries for selected period
  const periodSurveys = useMemo(
    () => surveys.filter((s) => s.submitted_at.startsWith(historyPeriod)),
    [surveys, historyPeriod],
  );

  // Overall stats
  const overallStats = useMemo(() => {
    const moodVals = surveys.map((s) => s.mood_score).filter((v): v is number => v != null);
    const energyVals = surveys.map((s) => s.energy_score).filter((v): v is number => v != null);
    const stressVals = surveys.map((s) => s.stress_score).filter((v): v is number => v != null);
    const avg = (arr: number[]) =>
      arr.length > 0 ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;
    const recent = surveys.length > 0 ? surveys[0] : null;
    return {
      avgMood: avg(moodVals),
      avgEnergy: avg(energyVals),
      avgStress: avg(stressVals),
      recentMood: recent?.mood_score ?? null,
      recentEnergy: recent?.energy_score ?? null,
      recentStress: recent?.stress_score ?? null,
      recentHighlight: recent?.highlight ?? null,
      recentDate: recent?.submitted_at ?? null,
      entries: surveys.length,
    };
  }, [surveys]);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette entrée ?")) return;
    const { error } = await supabase.from("wellbeing_surveys").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Supprimée");
    setSurveys((prev) => prev.filter((s) => s.id !== id));
    onDelete?.(id);
  };

  const mood = moodEmoji(overallStats.recentMood ?? overallStats.avgMood);
  const MoodIcon = mood.icon;

  return (
    <Dialog open={!!agentId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {lastName} {firstName}
            {matricule && <span className="ml-2 font-mono text-xs text-muted-foreground">({matricule})</span>}
          </DialogTitle>
        </DialogHeader>

        {agentId && (
          <div className="space-y-5">
            {/* Quick stats */}
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-lg border bg-card p-2.5 text-center">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Direction</p>
                <p className="text-xs font-medium mt-0.5 truncate">{direction}</p>
              </div>
              <div className="rounded-lg border bg-card p-2.5 text-center">
                <HeartHandshake className="h-4 w-4 mx-auto text-red-400 mb-0.5" />
                <p className="text-base font-bold">{overallStats.avgMood ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground">Humeur moy.</p>
              </div>
              <div className="rounded-lg border bg-card p-2.5 text-center">
                <Zap className="h-4 w-4 mx-auto text-yellow-400 mb-0.5" />
                <p className="text-base font-bold">{overallStats.avgEnergy ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground">Énergie moy.</p>
              </div>
              <div className="rounded-lg border bg-card p-2.5 text-center">
                <Activity className="h-4 w-4 mx-auto text-red-400 mb-0.5" />
                <p className="text-base font-bold">{overallStats.avgStress ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground">Stress moy.</p>
              </div>
            </div>

            {/* Last mood indicator */}
            {overallStats.recentMood != null && (
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-muted-foreground">Dernière humeur :</span>
                <MoodIcon className={cn("h-5 w-5", mood.color)} />
                <span className="font-semibold">{overallStats.recentMood}/5</span>
                {overallStats.recentDate && (
                  <span className="text-xs text-muted-foreground">
                    ({fmtDate(overallStats.recentDate)})
                  </span>
                )}
              </div>
            )}

            {/* Score bars */}
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Humeur</span>
                  <span className="font-semibold">{overallStats.avgMood ?? "—"}/5</span>
                </div>
                <ScoreBar value={overallStats.avgMood} color="bg-red-400" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Énergie</span>
                  <span className="font-semibold">{overallStats.avgEnergy ?? "—"}/5</span>
                </div>
                <ScoreBar value={overallStats.avgEnergy} color="bg-yellow-400" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Stress</span>
                  <span className="font-semibold">{overallStats.avgStress ?? "—"}/5</span>
                </div>
                <ScoreBar value={overallStats.avgStress} color="bg-orange-400" />
              </div>
            </div>

            {/* Monthly evolution chart */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold">Évolution mensuelle — 12 mois</h4>
              </div>
              <div className="h-56">
                {loading ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Chargement…
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={computedMonths}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="label" fontSize={10} />
                      <YAxis fontSize={10} domain={[0, 5]} />
                      <Tooltip
                        formatter={(v: any, name: string) => {
                          if (name === "mood") return [`${v}/5`, "Humeur"];
                          if (name === "energy") return [`${v}/5`, "Énergie"];
                          if (name === "stress") return [`${v}/5`, "Stress"];
                          return [v, name];
                        }}
                        labelFormatter={(label: string, payload: any[]) => {
                          if (payload?.[0]?.payload?.period) {
                            return periodLabel(payload[0].payload.period);
                          }
                          return label;
                        }}
                      />
                      <Line type="monotone" dataKey="mood" name="mood" stroke="#f87171" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="energy" name="energy" stroke="#facc15" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="stress" name="stress" stroke="#fb923c" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Period selector for detail */}
            <div className="flex items-center gap-3">
              <Sunrise className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Détail du mois :</span>
              <Select value={historyPeriod} onValueChange={setHistoryPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {computedMonths.map((m) => (
                    <SelectItem key={m.period} value={m.period}>
                      {periodLabel(m.period)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Entries for selected period */}
            <div className="space-y-2">
              {periodSurveys.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Aucune entrée pour cette période.
                </p>
              ) : (
                periodSurveys.slice(0, 20).map((s) => {
                  const entryMood = moodEmoji(s.mood_score);
                  const EntryIcon = entryMood.icon;
                  return (
                    <div key={s.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={s.moment === "morning" ? "default" : "secondary"} className="text-[10px] gap-1">
                            {s.moment === "morning" ? <Sunrise className="h-3 w-3" /> : <Sunset className="h-3 w-3" />}
                            {s.moment === "morning" ? "Matin" : "Soir"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{fmtDate(s.submitted_at)}</span>
                        </div>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(s.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-1">
                        {s.mood_score != null && (
                          <Badge variant="outline" className="text-[10px] font-normal gap-1">
                            <EntryIcon className={cn("h-3 w-3", entryMood.color)} />
                            Humeur: {s.mood_score}/5
                          </Badge>
                        )}
                        {s.energy_score != null && (
                          <Badge variant="outline" className="text-[10px] font-normal gap-1">
                            <Zap className="h-3 w-3 text-yellow-400" />
                            Énergie: {s.energy_score}/5
                          </Badge>
                        )}
                        {s.stress_score != null && (
                          <Badge variant="outline" className="text-[10px] font-normal gap-1">
                            <Activity className="h-3 w-3 text-orange-400" />
                            Stress: {s.stress_score}/5
                          </Badge>
                        )}
                      </div>
                      {s.highlight && (
                        <div className="flex items-start gap-1.5 mt-1">
                          <Sparkles className="h-3 w-3 text-violet-400 mt-0.5 shrink-0" />
                          <p className="text-xs text-muted-foreground">{s.highlight}</p>
                        </div>
                      )}
                      {s.comments && (
                        <p className="text-xs text-muted-foreground mt-1 italic">"{s.comments}"</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Fermer</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

