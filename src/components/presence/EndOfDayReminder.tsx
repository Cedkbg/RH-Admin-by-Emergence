import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { QrCode, Timer } from "lucide-react";

const DAY_MINUTES = 8 * 60;

const toMinutes = (t?: string | null) => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

const nowKinshasaMinutes = () => {
  const s = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Kinshasa",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  return toMinutes(s) ?? 0;
};

interface Props {
  /** Heure d'entrée du jour "HH:MM(:SS)" */
  checkIn: string | null;
  /** Actif uniquement si l'agent est pointé et pas encore sorti */
  active: boolean;
}

/** Pop-up « journée terminée » dès 8h de travail atteintes. */
export function EndOfDayReminder({ checkIn, active }: Props) {
  const [open, setOpen] = useState(false);
  const [worked, setWorked] = useState(0);
  const [snoozedUntil, setSnoozedUntil] = useState<number>(0);

  useEffect(() => {
    if (!active || !checkIn) {
      setOpen(false);
      return;
    }
    const start = toMinutes(checkIn);
    if (start === null) return;

    const tick = () => {
      const elapsed = Math.max(0, nowKinshasaMinutes() - start);
      setWorked(elapsed);
      if (elapsed >= DAY_MINUTES && elapsed >= snoozedUntil) setOpen(true);
    };
    tick();
    const id = window.setInterval(tick, 60000);
    return () => window.clearInterval(id);
  }, [active, checkIn, snoozedUntil]);

  if (!active || !checkIn) return null;

  const overtime = Math.max(0, worked - DAY_MINUTES);
  const label = `${Math.floor(worked / 60)}h ${String(worked % 60).padStart(2, "0")}min`;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" /> Journée terminée
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>
                Vous avez atteint <b>8h de travail</b> aujourd'hui (temps cumulé : {label}).
                Scannez le QR code pour clôturer votre journée.
              </p>
              <p>
                Si vous continuez à travailler, le temps supplémentaire
                {overtime > 0 && <> (déjà {Math.floor(overtime / 60)}h {String(overtime % 60).padStart(2, "0")}min)</>}
                {" "}sera comptabilisé en <b>heures supplémentaires</b>.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => setSnoozedUntil(worked + 60)}
          >
            Continuer à travailler (heures sup.)
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Link to="/presence/scan">
              <QrCode className="mr-2 h-4 w-4" /> Scanner pour clôturer
            </Link>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
