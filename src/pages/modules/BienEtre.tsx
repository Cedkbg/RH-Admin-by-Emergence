import { useEffect, useMemo, useState } from "react";
import { HeartHandshake, Smile, Frown, Meh, ArrowLeft, Sunrise, Sunset, Zap, Activity, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/useUserRoles";

interface EmployeeShort {
  first_name: string;
  last_name: string;
}

interface Survey {
  id: string;
  mood_score: number | null;
  energy_score: number | null;
  stress_score: number | null;
  comments: string | null;
  highlight: string | null;
  moment: string;
  submitted_at: string;
  employee_id: string | null;
  employees?: EmployeeShort | null;
}

const moodIcons = [Frown, Frown, Meh, Smile, Smile];
const moodLabels = ["Très bas", "Bas", "Neutre", "Bien", "Excellent"];

type Moment = "morning" | "evening";

const BienEtre = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasAny } = useUserRoles();
  const isHrPrivileged = hasAny(["admin", "rh", "dg", "dga", "manager", "assistant_direction", "secretaire"]);
  const [fullName, setFullName] = useState<string>("");
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);
  const [items, setItems] = useState<Survey[]>([]);
  const [moment, setMoment] = useState<Moment>(() => (new Date().getHours() < 14 ? "morning" : "evening"));
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [highlight, setHighlight] = useState("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => {
    const { data } = await supabase
      .from("wellbeing_surveys")
      .select("*, employees(first_name, last_name)")
      .order("submitted_at", { ascending: false })
      .limit(60);
    setItems((data as unknown as Survey[]) || []);
  };
  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setFullName(data.full_name);
      });
  }, [user?.id]);

  useEffect(() => {
    if (!user?.email) return;
    supabase
      .from("employees")
      .select("id")
      .ilike("email", user.email)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.id) setMyEmployeeId(data.id);
      });
  }, [user?.email]);

  const today = new Date().toISOString().slice(0, 10);
  const mine = useMemo(() => items.filter((i) => i.employee_id), [items]);
  const todayMine = useMemo(
    () => mine.filter((i) => i.submitted_at === today),
    [mine, today],
  );
  const doneMorning = todayMine.some((i) => i.moment === "morning");
  const doneEvening = todayMine.some((i) => i.moment === "evening");

  const avgFor = (key: "mood_score" | "energy_score" | "stress_score") => {
    const vals = mine.map((i) => i[key]).filter((v): v is number => v != null);
    if (!vals.length) return null;
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  };

  const reset = () => {
    setMood(null);
    setEnergy(null);
    setStress(null);
    setHighlight("");
    setComments("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mood) {
      toast.error("Choisissez votre humeur");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("wellbeing_surveys").insert({
      mood_score: mood,
      energy_score: energy,
      stress_score: stress,
      highlight: highlight || null,
      comments: comments || null,
      moment,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(moment === "morning" ? "Bonne journée ! ☀️" : "Bonne soirée ! 🌙");
    reset();
    refresh();
  };

  const Scale = ({
    value,
    onChange,
    color = "primary",
  }: {
    value: number | null;
    onChange: (n: number) => void;
    color?: string;
  }) => (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn(
            "flex-1 rounded-md border-2 py-2 text-sm font-semibold transition",
            value === n
              ? `border-${color} bg-${color}/10 text-${color}`
              : "border-border hover:border-primary/40 text-muted-foreground",
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in pb-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="w-fit -ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mon journal de bien-être</h1>
        <p className="text-sm text-muted-foreground">
          Marquez votre humeur le matin et le soir. Vos réponses restent confidentielles.
        </p>
      </div>

      {/* Statut du jour */}
      <div className="grid grid-cols-2 gap-3">
        <div className={cn("rounded-xl border p-3 text-sm flex items-center gap-2", doneMorning ? "bg-primary/5 border-primary/30" : "bg-card")}>
          <Sunrise className="h-4 w-4 text-amber-500" />
          <span className="flex-1">Check-in matin</span>
          <Badge variant={doneMorning ? "default" : "outline"}>{doneMorning ? "Fait" : "À faire"}</Badge>
        </div>
        <div className={cn("rounded-xl border p-3 text-sm flex items-center gap-2", doneEvening ? "bg-primary/5 border-primary/30" : "bg-card")}>
          <Sunset className="h-4 w-4 text-orange-500" />
          <span className="flex-1">Check-out soir</span>
          <Badge variant={doneEvening ? "default" : "outline"}>{doneEvening ? "Fait" : "À faire"}</Badge>
        </div>
      </div>

      {/* Formulaire */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <Tabs value={moment} onValueChange={(v) => setMoment(v as Moment)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="morning" disabled={doneMorning}>
              <Sunrise className="mr-2 h-4 w-4" /> Matin
            </TabsTrigger>
            <TabsTrigger value="evening" disabled={doneEvening}>
              <Sunset className="mr-2 h-4 w-4" /> Soir
            </TabsTrigger>
          </TabsList>

          <TabsContent value={moment} className="mt-5">
            <form onSubmit={submit} className="space-y-5">
              {fullName && (
                <p className="text-sm font-medium text-muted-foreground">
                  {moment === "morning" ? "Bonjour" : "Bonsoir"}, <span className="text-foreground font-semibold">{fullName}</span>
                </p>
              )}
              <div>
                <Label className="mb-2 flex items-center gap-2"><HeartHandshake className="h-4 w-4" /> Humeur</Label>
                <div className="flex justify-between gap-2">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const Icon = moodIcons[n - 1];
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setMood(n)}
                        className={cn(
                          "flex flex-1 flex-col items-center gap-1 rounded-lg border-2 p-2 transition",
                          mood === n ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
                        )}
                      >
                        <Icon className={cn("h-6 w-6", mood === n ? "text-primary" : "text-muted-foreground")} />
                        <span className="text-[10px] font-medium">{moodLabels[n - 1]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="mb-2 flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-500" /> Énergie</Label>
                <Scale value={energy} onChange={setEnergy} />
              </div>

              <div>
                <Label className="mb-2 flex items-center gap-2"><Activity className="h-4 w-4 text-red-500" /> Niveau de stress</Label>
                <Scale value={stress} onChange={setStress} />
              </div>

              <div>
                <Label className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-500" /> {moment === "morning" ? "Objectif du jour" : "Point fort de la journée"}</Label>
                <Input
                  value={highlight}
                  onChange={(e) => setHighlight(e.target.value)}
                  placeholder={moment === "morning" ? "Ex : Finir le rapport mensuel" : "Ex : Réunion réussie avec l'équipe"}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Commentaire (optionnel)</Label>
                <Textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={2} className="mt-1" />
              </div>

              <Button type="submit" disabled={submitting || !mood} className="w-full">
                {moment === "morning" ? "Démarrer ma journée" : "Clôturer ma journée"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </section>

      {/* Mes statistiques */}
      <section className="grid grid-cols-3 gap-3">
        {[
          { label: "Humeur moy.", value: avgFor("mood_score"), icon: HeartHandshake },
          { label: "Énergie moy.", value: avgFor("energy_score"), icon: Zap },
          { label: "Stress moy.", value: avgFor("stress_score"), icon: Activity },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-3 text-center shadow-sm">
            <s.icon className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
            <div className="text-lg font-bold">{s.value ?? "—"}<span className="text-xs text-muted-foreground">/5</span></div>
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </section>

      {/* Historique */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">Mon historique</h2>
        {mine.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Aucune entrée pour l'instant.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {mine.slice(0, 15).map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 border-b py-2 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  {i.moment === "morning" ? (
                    <Sunrise className="h-4 w-4 text-amber-500 shrink-0" />
                  ) : i.moment === "evening" ? (
                    <Sunset className="h-4 w-4 text-orange-500 shrink-0" />
                  ) : (
                    <Meh className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs">{new Date(i.submitted_at).toLocaleDateString("fr-FR")}</div>
                    {i.highlight && <div className="truncate text-xs text-muted-foreground">{i.highlight}</div>}
                  </div>
                </div>
                <div className="flex gap-1">
                  {i.mood_score != null && (
                    <Badge variant={i.mood_score >= 4 ? "default" : i.mood_score <= 2 ? "destructive" : "outline"} className="text-[10px]">
                      😊 {i.mood_score}
                    </Badge>
                  )}
                  {i.energy_score != null && <Badge variant="outline" className="text-[10px]">⚡ {i.energy_score}</Badge>}
                  {i.stress_score != null && <Badge variant="outline" className="text-[10px]">💢 {i.stress_score}</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default BienEtre;
