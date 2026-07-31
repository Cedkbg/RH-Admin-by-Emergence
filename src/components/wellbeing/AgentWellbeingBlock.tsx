import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeartHandshake, Zap, Activity, Smile, Frown, Meh, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentWellbeingBlockProps {
  agentId: string;
  firstName: string;
  lastName: string;
  matricule: string | null;
  direction: string;
  department: string;
  position: string | null;
  avgMood: number | null;
  avgEnergy: number | null;
  avgStress: number | null;
  lastMood: number | null;
  lastEnergy: number | null;
  lastStress: number | null;
  lastHighlight: string | null;
  lastDate: string | null;
  totalEntries: number;
  morningDone: boolean;
  eveningDone: boolean;
  onClick: () => void;
}

const initials = (first: string, last: string) =>
  `${(first?.[0] || "")}${(last?.[0] || "")}`.toUpperCase();

const moodEmoji = (score: number | null) => {
  if (score == null) return null;
  if (score >= 4) return { icon: Smile, label: "Excellent", color: "text-emerald-500" };
  if (score >= 3) return { icon: Smile, label: "Bien", color: "text-blue-500" };
  if (score >= 2) return { icon: Meh, label: "Neutre", color: "text-amber-500" };
  return { icon: Frown, label: "Bas", color: "text-red-500" };
};

const fmtVal = (v: number | null) => (v != null ? v.toFixed(1) : "—");

export function AgentWellbeingBlock({
  firstName,
  lastName,
  matricule,
  direction,
  position,
  avgMood,
  avgEnergy,
  avgStress,
  lastMood,
  lastDate,
  lastHighlight,
  totalEntries,
  morningDone,
  eveningDone,
  onClick,
}: AgentWellbeingBlockProps) {
  const mood = moodEmoji(lastMood ?? avgMood);
  const MoodIcon = mood?.icon || HeartHandshake;

  return (
    <Card
      className="p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/40 active:scale-[0.99]"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-sm font-bold text-red-600 dark:text-red-400 ring-2 ring-red-200 dark:ring-red-800">
            {initials(firstName, lastName)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{lastName} {firstName}</p>
            <div className="text-xs text-muted-foreground truncate">
              {matricule || direction}
            </div>
          </div>
        </div>
        <div className="shrink-0">
          <MoodIcon className={cn("h-6 w-6", mood?.color || "text-muted-foreground")} />
        </div>
      </div>

      {/* Position */}
      {position && (
        <p className="text-xs text-muted-foreground mb-2 truncate">{position}</p>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-md border bg-card p-2 text-center">
          <HeartHandshake className="h-3.5 w-3.5 mx-auto text-red-400 mb-0.5" />
          <p className={cn("text-xs font-bold", (avgMood ?? 0) >= 3 ? "text-emerald-600" : (avgMood ?? 0) >= 2 ? "text-amber-600" : "text-red-500")}>
            {fmtVal(avgMood)}
          </p>
          <p className="text-[10px] text-muted-foreground">moy.</p>
        </div>
        <div className="rounded-md border bg-card p-2 text-center">
          <Zap className="h-3.5 w-3.5 mx-auto text-yellow-400 mb-0.5" />
          <p className="text-xs font-bold">{fmtVal(avgEnergy)}</p>
          <p className="text-[10px] text-muted-foreground">énergie</p>
        </div>
        <div className="rounded-md border bg-card p-2 text-center">
          <Activity className="h-3.5 w-3.5 mx-auto text-red-400 mb-0.5" />
          <p className={cn("text-xs font-bold", (avgStress ?? 5) <= 2 ? "text-emerald-600" : (avgStress ?? 5) <= 3 ? "text-amber-600" : "text-red-500")}>
            {fmtVal(avgStress)}
          </p>
          <p className="text-[10px] text-muted-foreground">stress</p>
        </div>
      </div>

      {/* Today's status */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <Badge variant={morningDone ? "default" : "outline"} className="text-[10px]">
          {morningDone ? "☀️ Matin fait" : "Matin —"}
        </Badge>
        <Badge variant={eveningDone ? "default" : "outline"} className="text-[10px]">
          {eveningDone ? "🌙 Soir fait" : "Soir —"}
        </Badge>
        <span className="text-[10px] text-muted-foreground">{totalEntries} entrée{totalEntries > 1 ? "s" : ""}</span>
      </div>

      {/* Last highlight */}
      {lastHighlight && (
        <div className="rounded-md bg-muted/40 p-2">
          <div className="flex items-center gap-1 mb-0.5">
            <Sparkles className="h-3 w-3 text-violet-400" />
            <span className="text-[10px] font-medium text-muted-foreground">Dernier point fort</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{lastHighlight}</p>
        </div>
      )}
    </Card>
  );
}

