import { useEffect, useMemo, useState } from "react";
import { HeartHandshake, Smile, Frown, Meh } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Survey { id: string; mood_score: number | null; comments: string | null; submitted_at: string; }

const moodIcons = [Frown, Frown, Meh, Smile, Smile];

const BienEtre = () => {
  const [items, setItems] = useState<Survey[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => {
    const { data } = await supabase.from("wellbeing_surveys").select("*").order("submitted_at", { ascending: false }).limit(50);
    setItems((data as Survey[]) || []);
  };
  useEffect(() => { refresh(); }, []);

  const avg = useMemo(() => {
    const valid = items.filter((i) => i.mood_score != null);
    if (!valid.length) return null;
    return (valid.reduce((s, i) => s + (i.mood_score || 0), 0) / valid.length).toFixed(1);
  }, [items]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!score) { toast.error("Choisissez votre humeur"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("wellbeing_surveys").insert({ mood_score: score, comments: comments || null });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Merci pour votre retour");
    setScore(null); setComments(""); refresh();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bien-être au travail</h1>
        <p className="text-sm text-muted-foreground">Votre avis est anonyme et aide à améliorer la QVT.</p>
      </div>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="mb-4 font-semibold flex items-center gap-2"><HeartHandshake className="h-4 w-4" /> Comment vous sentez-vous aujourd'hui ?</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex justify-between gap-2">
            {[1, 2, 3, 4, 5].map((n) => {
              const Icon = moodIcons[n - 1];
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setScore(n)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 rounded-lg border-2 p-3 transition",
                    score === n ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  )}
                >
                  <Icon className={cn("h-7 w-7", score === n ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-xs font-semibold">{n}</span>
                </button>
              );
            })}
          </div>
          <div>
            <Label>Commentaire (optionnel)</Label>
            <Textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} />
          </div>
          <Button type="submit" disabled={submitting || !score} className="w-full">Envoyer</Button>
        </form>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Tendances</h2>
          {avg && <Badge variant="default">Moyenne : {avg}/5</Badge>}
        </div>
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Aucune réponse pour l'instant.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {items.slice(0, 10).map((i) => (
              <li key={i.id} className="flex items-center justify-between border-b py-2">
                <span>{new Date(i.submitted_at).toLocaleDateString("fr-FR")}</span>
                <Badge variant={i.mood_score && i.mood_score >= 4 ? "default" : i.mood_score && i.mood_score <= 2 ? "destructive" : "outline"}>
                  {i.mood_score}/5
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default BienEtre;
