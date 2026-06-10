import { ReactNode, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { HeartHandshake, Smile, Frown, Meh, Zap, Activity, Sparkles, Sunrise, Sunset, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Moment = "morning" | "evening";

const moodIcons = [Frown, Frown, Meh, Smile, Smile];
const moodLabels = ["Très bas", "Bas", "Neutre", "Bien", "Excellent"];

const currentMoment = (): Moment => (new Date().getHours() < 14 ? "morning" : "evening");

/**
 * Bloque l'accès aux enfants tant que l'agent n'a pas rempli son check-in bien-être
 * du moment courant (matin/soir) pour la journée. Une fois soumis, les enfants s'affichent.
 */
export function WellbeingGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [moment] = useState<Moment>(currentMoment());
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [highlight, setHighlight] = useState("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().slice(0, 10);
        // RLS limite déjà aux entrées de l'agent connecté (sinon admin → tout passe)
        const { data, error } = await supabase
          .from("wellbeing_surveys")
          .select("id, moment, submitted_at")
          .eq("submitted_at", today)
          .eq("moment", moment)
          .limit(1);
        if (cancelled) return;
        if (error) {
          // En cas d'erreur, on ne bloque pas pour ne pas casser le scan
          console.warn("WellbeingGate check failed", error);
          setDone(true);
        } else {
          setDone((data || []).length > 0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [user?.id, moment]);

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
    setDone(true);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Préparation du check-in…
      </div>
    );
  }

  return (
    <>
      {done && children}
      <Dialog open={!done}>
        <DialogContent
          className="max-w-md max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {moment === "morning" ? <Sunrise className="h-5 w-5 text-amber-500" /> : <Sunset className="h-5 w-5 text-orange-500" />}
              Check-in bien-être {moment === "morning" ? "du matin" : "du soir"}
            </DialogTitle>
            <DialogDescription>
              Avant de scanner votre {moment === "morning" ? "entrée" : "sortie"}, prenez un instant pour partager comment vous vous sentez.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="mb-2 flex items-center gap-2"><HeartHandshake className="h-4 w-4" /> Humeur</Label>
              <div className="flex justify-between gap-1.5">
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
                      <Icon className={cn("h-5 w-5", mood === n ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-[10px] font-medium">{moodLabels[n - 1]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="mb-2 flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-500" /> Énergie</Label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setEnergy(n)}
                    className={cn(
                      "flex-1 rounded-md border-2 py-2 text-sm font-semibold transition",
                      energy === n ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 flex items-center gap-2"><Activity className="h-4 w-4 text-red-500" /> Stress</Label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setStress(n)}
                    className={cn(
                      "flex-1 rounded-md border-2 py-2 text-sm font-semibold transition",
                      stress === n ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                {moment === "morning" ? "Objectif du jour" : "Point fort de la journée"}
              </Label>
              <Input
                value={highlight}
                onChange={(e) => setHighlight(e.target.value)}
                placeholder={moment === "morning" ? "Ex : Finir le rapport mensuel" : "Ex : Réunion réussie"}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Commentaire (optionnel)</Label>
              <Textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={2} className="mt-1" />
            </div>

            <Button type="submit" disabled={submitting || !mood} className="w-full">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Valider et accéder au scan
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              <Badge variant="outline" className="mr-1">Obligatoire</Badge>
              Le scan QR s'active dès que ce check-in est validé.
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
