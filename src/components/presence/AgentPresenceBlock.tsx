import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Minus, AlertTriangle, AlertOctagon, Clock, CalendarDays, User, DollarSign, TrendingUp } from "lucide-react";

type Mention = "excellent" | "moyenne" | "faible" | "tres_faible";
export type TodayStatus = "present" | "late" | "leave" | "absent" | "finished";

interface AgentPresenceBlockProps {
  agentId: string;
  firstName: string;
  lastName: string;
  matricule: string | null;
  direction: string;
  department: string;
  position: string | null;
  daysWorked: number;
  workingDays: number;
  totalHours: number;
  presenceRate: number;
  period: string;
  hourlyRate: number;
  earnedSalary: number;
  /** Statut du jour : présent (vert), retard (orange), congé (rouge), absent (gris), journée terminée (bleu fixe) */
  todayStatus?: TodayStatus;
  /** If agent is currently checked in (no check_out today), we show a live counter */
  isCurrentlyWorking: boolean;
  /** Check-in time string like "08:30" if currently working */
  currentCheckIn: string | null;
  onClick: () => void;
}

const STATUS_STYLES: Record<TodayStatus, { dot: string; label: string; text: string }> = {
  present: { dot: "bg-emerald-500", label: "Présent", text: "text-emerald-600 dark:text-emerald-400" },
  late: { dot: "bg-orange-500", label: "En retard", text: "text-orange-600 dark:text-orange-400" },
  leave: { dot: "bg-red-500", label: "En congé", text: "text-red-600 dark:text-red-400" },
  absent: { dot: "bg-muted-foreground", label: "Absent", text: "text-muted-foreground" },
  finished: { dot: "bg-sky-500", label: "Journée terminée", text: "text-sky-600 dark:text-sky-400" },
};

const BlinkingStatus = ({ status }: { status: TodayStatus }) => {
  const s = STATUS_STYLES[status];
  const still = status === "finished";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex h-2.5 w-2.5">
        {!still && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${s.dot}`}
            style={{ animation: "ping 1s cubic-bezier(0,0,0.2,1) infinite" }}
          />
        )}
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${s.dot}`}
          style={still ? undefined : { animation: "pulse 1s cubic-bezier(0.4,0,0.6,1) infinite" }}
        />
      </span>
      <span className={`text-[10px] font-semibold uppercase tracking-wide ${s.text}`}>{s.label}</span>
    </span>
  );
};


const mentionFor = (rate: number): Mention => {
  if (rate >= 95) return "excellent";
  if (rate >= 70) return "moyenne";
  if (rate >= 50) return "faible";
  return "tres_faible";
};

const MentionBadge = ({ m }: { m: Mention }) => {
  if (m === "excellent")
    return <Badge className="bg-emerald-600 hover:bg-emerald-700 gap-1"><Award className="h-3 w-3" />Excellent</Badge>;
  if (m === "moyenne")
    return <Badge variant="secondary" className="gap-1"><Minus className="h-3 w-3" />Moyenne</Badge>;
  if (m === "faible")
    return <Badge className="bg-orange-500 hover:bg-orange-600 gap-1"><AlertTriangle className="h-3 w-3" />Faible</Badge>;
  return <Badge variant="destructive" className="gap-1"><AlertOctagon className="h-3 w-3" />Très faible</Badge>;
};

const initials = (first: string, last: string) =>
  `${(first?.[0] || "")}${(last?.[0] || "")}`.toUpperCase();

const fmtUSD = (n: number) =>
  "$ " + new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

export function AgentPresenceBlock({
  firstName,
  lastName,
  matricule,
  direction,
  position,
  daysWorked,
  workingDays,
  totalHours,
  presenceRate,
  period,
  hourlyRate,
  earnedSalary,
  todayStatus = "absent",
  isCurrentlyWorking,
  currentCheckIn,

  onClick,
}: AgentPresenceBlockProps) {
  const mention = mentionFor(presenceRate);

  // Live salary counter for agents currently working
  const [liveSalary, setLiveSalary] = useState(earnedSalary);
  const [liveHours, setLiveHours] = useState(totalHours);

  useEffect(() => {
    if (!isCurrentlyWorking || !currentCheckIn) {
      // Not currently working — use static values
      setLiveSalary(earnedSalary);
      setLiveHours(totalHours);
      return;
    }

    // Parse check-in time
    const [h, m] = currentCheckIn.split(":").map(Number);
    const checkInMinutes = h * 60 + m;

    // Update every 10 seconds
    const update = () => {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const elapsedMinutes = Math.max(0, nowMinutes - checkInMinutes);
      const elapsedHours = elapsedMinutes / 60;
      const totalHoursWithLive = (daysWorked - 1) * 8 + elapsedHours; // assume 8h per previous day
      const salary = totalHoursWithLive * hourlyRate;
      setLiveHours(+totalHoursWithLive.toFixed(2));
      setLiveSalary(+salary.toFixed(2));
    };

    update(); // Initial update
    const interval = setInterval(update, 10000); // Every 10s

    return () => clearInterval(interval);
  }, [isCurrentlyWorking, currentCheckIn, hourlyRate, daysWorked, earnedSalary, totalHours]);

  const displaySalary = isCurrentlyWorking ? liveSalary : earnedSalary;
  const displayHours = isCurrentlyWorking ? liveHours : totalHours;

  return (
    <Card
      className="p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/40 active:scale-[0.99]"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary ring-2 ring-muted">
            {initials(firstName, lastName)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{lastName} {firstName}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="truncate">{matricule || "—"}</span>
            </div>
            <div className="mt-1"><BlinkingStatus status={todayStatus} /></div>
          </div>
        </div>
        <MentionBadge m={mention} />
      </div>


      {/* Direction/Position */}
      <div className="text-xs text-muted-foreground mb-3 space-y-0.5">
        <p className="truncate"><span className="font-medium text-foreground/70">Direction :</span> {direction}</p>
        {position && <p className="truncate"><span className="font-medium text-foreground/70">Poste :</span> {position}</p>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md border bg-card p-2 text-center">
          <CalendarDays className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-0.5" />
          <p className="text-xs font-bold">{daysWorked}<span className="text-[10px] font-normal text-muted-foreground">/{workingDays}j</span></p>
        </div>
        <div className="rounded-md border bg-card p-2 text-center">
          <Clock className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-0.5" />
          <p className="text-xs font-bold">{displayHours.toFixed(1)}<span className="text-[10px] font-normal text-muted-foreground">h</span></p>
        </div>
        <div className="rounded-md border bg-card p-2 text-center">
          <div className="inline-flex items-center justify-center mb-0.5">
            <span className={`text-xs font-bold ${
              presenceRate >= 95 ? "text-emerald-600" :
              presenceRate >= 70 ? "text-amber-600" :
              "text-red-500"
            }`}>
              {presenceRate}%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">présence</p>
        </div>
      </div>

      {/* Salary row */}
      <div className="mt-2 rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">
              Salaire accumulé
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">{fmtUSD(hourlyRate)}/h</span>
          </div>
        </div>
        <p className="text-base font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
          {fmtUSD(displaySalary)}
          {isCurrentlyWorking && (
            <span className="inline-block ml-1.5">
              <span className="animate-pulse inline-block h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          )}
        </p>
        {isCurrentlyWorking && (
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
            <TrendingUp className="h-3 w-3" />
            En direct · check-in {currentCheckIn}
          </p>
        )}
      </div>

      {/* Hourly rate footer */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Période : {period}</span>
        <span>{daysWorked > 0 ? `${(displaySalary / daysWorked).toFixed(2)} USD/j` : "—"}</span>
      </div>
    </Card>
  );
}
