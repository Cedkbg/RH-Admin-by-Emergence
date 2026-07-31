import { useState } from "react";
import { HeartHandshake, Sunrise, Sunset, Zap, Activity, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Moment = "morning" | "evening";

const moodIcons = [HeartHandshake, HeartHandshake, HeartHandshake, HeartHandshake, HeartHandshake];
const moodLabels = ["Très bas", "Bas", "Neutre", "Bien", "Excellent"];

interface WellbeingSurveyFormProps {
  fullName: string;
  doneMorning: boolean;
  doneEvening: boolean;
  onSuccess: () => void;
}

const currentMoment = (): Moment => (new Date().getHours() < 14 ? "morning" : "evening");

export function WellbeingSurveyForm({ fullName, doneMorning, doneEvening, onSuccess }: WellbeingSurveyFormProps) {
  const [moment, setMoment] = useState<Moment>(currentMoment());
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [highlight, setHighlight] = useState("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    onSuccess();
  };

  const Scale = ({
    value,
    onChange,
  }: {
    value: number | null;
    onChange: (n: number) => void;
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
              ? "border-primary bg-primary/10 text-primary"
              : "border-border hover:border-primary/40 text-muted-foreground",
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      {/* Moment selector */}
      <div className="grid w-full grid-cols-2 gap-1 rounded-md bg-muted p-1">
        <button
          type="button"
          onClick={() => !doneMorning && setMoment("morning")}
          disabled={doneMorning}
          className={cn(
            "flex items-center justify-center rounded px-3 py-1.5 text-sm font-medium transition",
            moment === "morning" ? "bg-background shadow-sm" : "text-muted-foreground",
            doneMorning && "opacity-50 cursor-not-allowed",
          )}
        >
          <Sunrise className="mr-2 h-4 w-4" /> Matin
        </button>
        <button
          type="button"
          onClick={() => !doneEvening && setMoment("evening")}
          disabled={doneEvening}
          className={cn(
            "flex items-center justify-center rounded px-3 py-1.5 text-sm font-medium transition",
            moment === "evening" ? "bg-background shadow-sm" : "text-muted-foreground",
            doneEvening && "opacity-50 cursor-not-allowed",
          )}
        >
          <Sunset className="mr-2 h-4 w-4" /> Soir
        </button>
      </div>

      <div className="mt-5">
        <form onSubmit={submit} className="space-y-5">
          {fullName && (
            <p className="text-sm font-medium text-muted-foreground">
              {moment === "morning" ? "Bonjour" : "Bonsoir"},{" "}
              <span className="text-foreground font-semibold">{fullName}</span>
            </p>
          )}

          {/* Humeur */}
          <div>
            <Label className="mb-2 flex items-center gap-2">
              <HeartHandshake className="h-4 w-4" /> Humeur
            </Label>
            <div className="flex justify-between gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMood(n)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 rounded-lg border-2 p-2 transition",
                    mood === n
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <HeartHandshake
                    className={cn("h-6 w-6", mood === n ? "text-primary" : "text-muted-foreground")}
                  />
                  <span className="text-[10px] font-medium">{moodLabels[n - 1]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Énergie */}
          <div>
            <Label className="mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" /> Énergie
            </Label>
            <Scale value={energy} onChange={setEnergy} />
          </div>

          {/* Stress */}
          <div>
            <Label className="mb-2 flex items-center gap-2">
              <Activity className="h-4 w-4 text-red-500" /> Niveau de stress
            </Label>
            <Scale value={stress} onChange={setStress} />
          </div>

          {/* Highlight / Objectif */}
          <div>
            <Label className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />{" "}
              {moment === "morning" ? "Objectif du jour" : "Point fort de la journée"}
            </Label>
            <Input
              value={highlight}
              onChange={(e) => setHighlight(e.target.value)}
              placeholder={
                moment === "morning"
                  ? "Ex : Finir le rapport mensuel"
                  : "Ex : Réunion réussie avec l'équipe"
              }
              className="mt-1"
            />
          </div>

          {/* Commentaire */}
          <div>
            <Label>Commentaire (optionnel)</Label>
            <Textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={2} className="mt-1" />
          </div>

          <Button type="submit" disabled={submitting || !mood} className="w-full">
            {moment === "morning" ? "Démarrer ma journée" : "Clôturer ma journée"}
          </Button>
        </form>
      </div>

      {/* Status indicators */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div
          className={cn(
            "rounded-xl border p-3 text-sm flex items-center gap-2",
            doneMorning ? "bg-primary/5 border-primary/30" : "bg-card",
          )}
        >
          <Sunrise className="h-4 w-4 text-amber-500" />
          <span className="flex-1">Check-in matin</span>
          <Badge variant={doneMorning ? "default" : "outline"}>
            {doneMorning ? "Fait" : "À faire"}
          </Badge>
        </div>
        <div
          className={cn(
            "rounded-xl border p-3 text-sm flex items-center gap-2",
            doneEvening ? "bg-primary/5 border-primary/30" : "bg-card",
          )}
        >
          <Sunset className="h-4 w-4 text-orange-500" />
          <span className="flex-1">Check-out soir</span>
          <Badge variant={doneEvening ? "default" : "outline"}>
            {doneEvening ? "Fait" : "À faire"}
          </Badge>
        </div>
      </div>
    </section>
  );
}

