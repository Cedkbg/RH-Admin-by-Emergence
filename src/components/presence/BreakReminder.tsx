import { useCallback, useEffect, useState } from "react";
import { Coffee, Clock, XCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** Heure de pause par défaut (heure locale RDC) */
const BREAK_HOUR = 12;
const BREAK_MINUTE = 30;

type BreakStatus = "pending" | "on_break" | "postponed" | "skipped" | "done";

interface BreakRow {
  id: string;
  status: BreakStatus;
  postponed_minutes: number;
  started_at: string | null;
}

const kinshasaToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Kinshasa", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date());

const kinshasaMinutes = () => {
  const s = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Kinshasa", hour: "2-digit", minute: "2-digit", hour12: false })
    .format(new Date());
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

const hhmm = (mins: number) => `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

interface Props {
  employeeId: string;
  /** L'agent a pointé son entrée et pas encore sa sortie */
  active: boolean;
}

export function BreakReminder({ employeeId, active }: Props) {
  const [row, setRow] = useState<BreakRow | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("break_sessions")
      .select("id,status,postponed_minutes,started_at")
      .eq("employee_id", employeeId)
      .eq("date", kinshasaToday())
      .maybeSingle();
    setRow((data as BreakRow | null) ?? null);
  }, [employeeId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const baseMin = BREAK_HOUR * 60 + BREAK_MINUTE;
  const dueMin = baseMin + (row?.postponed_minutes ?? 0);
  const status: BreakStatus = row?.status ?? "pending";

  useEffect(() => {
    if (!active) return;
    if (status === "skipped" || status === "done" || status === "on_break") return;
    if (kinshasaMinutes() >= dueMin) setOpen(true);
  }, [active, status, dueMin, tick]);

  const save = async (patch: Partial<BreakRow> & { status: BreakStatus }) => {
    setBusy(true);
    const { error } = await supabase
      .from("break_sessions")
      .upsert(
        { employee_id: employeeId, date: kinshasaToday(), ...patch },
        { onConflict: "employee_id,date" },
      );
    setBusy(false);
    if (error) { toast.error(error.message); return false; }
    await load();
    return true;
  };

  const takeBreak = async () => {
    if (await save({ status: "on_break", started_at: new Date().toISOString() })) {
      setOpen(false);
      toast.success("Bonne pause ☕");
    }
  };

  const postpone = async (minutes: number) => {
    if (await save({ status: "postponed", postponed_minutes: (row?.postponed_minutes ?? 0) + minutes })) {
      setOpen(false);
      toast.info(`Pause reportée de ${minutes === 60 ? "1 h" : "30 min"} — rappel à ${hhmm(dueMin + minutes)}`);
    }
  };

  const skip = async () => {
    if (await save({ status: "skipped" })) {
      setOpen(false);
      toast.info("Pause annulée pour aujourd'hui");
    }
  };

  const endBreak = async () => {
    if (await save({ status: "done", ended_at: new Date().toISOString() } as never)) {
      toast.success("Pause terminée, bon retour au travail !");
    }
  };

  if (!active) return null;

  return (
    <>
      {/* Bandeau récapitulatif */}
      <section className="rounded-xl border bg-card p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Coffee className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">Ma pause du jour</p>
            <p className="text-xs text-muted-foreground">
              {status === "on_break" ? "Pause en cours"
                : status === "done" ? "Pause déjà prise"
                : status === "skipped" ? "Vous avez choisi de ne pas prendre de pause"
                : `Prévue à ${hhmm(dueMin)}${(row?.postponed_minutes ?? 0) > 0 ? " (reportée)" : ""}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === "on_break" && <Badge className="bg-amber-500 hover:bg-amber-600">En pause</Badge>}
          {status === "postponed" && <Badge variant="secondary">Reportée</Badge>}
          {status === "done" && <Badge className="bg-emerald-600 hover:bg-emerald-700">Terminée</Badge>}
          {status === "skipped" && <Badge variant="outline">Sans pause</Badge>}
          {status === "on_break" ? (
            <Button size="sm" onClick={endBreak} disabled={busy}>
              <CheckCircle2 className="mr-1 h-4 w-4" /> Terminer la pause
            </Button>
          ) : status !== "done" ? (
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Gérer ma pause</Button>
          ) : null}
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coffee className="h-5 w-5 text-amber-600" /> C'est l'heure de la pause
            </DialogTitle>
            <DialogDescription>
              Il est {hhmm(kinshasaMinutes())}. Souhaitez-vous prendre votre pause maintenant ou la reporter ?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Button onClick={takeBreak} disabled={busy} className="h-12">
              <Coffee className="mr-2 h-4 w-4" /> Prendre ma pause maintenant
            </Button>
            <Button variant="outline" onClick={() => postpone(30)} disabled={busy} className="h-11">
              <Clock className="mr-2 h-4 w-4" /> Reporter de 30 minutes
            </Button>
            <Button variant="outline" onClick={() => postpone(60)} disabled={busy} className="h-11">
              <Clock className="mr-2 h-4 w-4" /> Reporter d'1 heure
            </Button>
            <Button variant="ghost" onClick={skip} disabled={busy} className="h-11 text-destructive">
              <XCircle className="mr-2 h-4 w-4" /> Je ne prends pas de pause aujourd'hui
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
