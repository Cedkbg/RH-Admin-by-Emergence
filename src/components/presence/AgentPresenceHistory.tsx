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
  Award, Minus, AlertTriangle, AlertOctagon,
  Clock, CalendarDays, FileText, TrendingUp, DollarSign,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend,
} from "recharts";
import { toast } from "sonner";

const fmtUSD = (n: number) =>
  "$ " + new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

type Mention = "excellent" | "moyenne" | "faible" | "tres_faible";

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

const periodKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const periodLabel = (p: string) => {
  const [y, m] = p.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());
};

const fmtDate = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

interface AttendanceRecord {
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
}

interface Justification {
  id: string;
  period: string;
  reason: string;
  status: string;
  created_at: string;
}

interface AgentPresenceHistoryProps {
  agentId: string | null;
  firstName: string;
  lastName: string;
  matricule: string | null;
  direction: string;
  onClose: () => void;
}

export function AgentPresenceHistory({
  agentId,
  firstName,
  lastName,
  matricule,
  direction,
  onClose,
}: AgentPresenceHistoryProps) {
  const [historyPeriod, setHistoryPeriod] = useState(periodKey(new Date()));
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate last 12 months for the evolution chart
  const monthlyEvolution = useMemo(() => {
    const now = new Date();
    const months: { period: string; label: string; rate: number; days: number; totalDays: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const p = periodKey(d);
      const label = periodLabel(p).split(" ")[0];
      // Count working days (Mon-Sat in RDC: exclude Sunday only)
      const y = d.getFullYear();
      const m = d.getMonth();
      let totalDays = 0;
      for (let dd = new Date(y, m, 1); dd.getMonth() === m; dd.setDate(dd.getDate() + 1)) {
        if (dd.getDay() !== 0) totalDays++;
      }
      months.push({ period: p, label: label.substring(0, 3), rate: 0, days: 0, totalDays });
    }
    return months;
  }, []);

  const loadData = async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().slice(0, 10);

      // Load attendance for the last 12 months
      const { data: attData, error: attErr } = await supabase
        .from("attendance")
        .select("date,check_in,check_out,status")
        .eq("employee_id", agentId)
        .gte("date", startDate)
        .order("date", { ascending: false });

      if (attErr) throw attErr;

      // Load justifications
      const { data: justData, error: justErr } = await supabase
        .from("absence_justifications")
        .select("id,period,reason,status,created_at")
        .eq("employee_id", agentId)
        .order("created_at", { ascending: false });

      if (justErr) throw justErr;

      setAttendance((attData as AttendanceRecord[]) || []);
      setJustifications((justData as Justification[]) || []);
    } catch (err: any) {
      console.error("[AgentPresenceHistory] Error:", err);
      toast.error("Erreur lors du chargement de l'historique");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (agentId) loadData();
  }, [agentId]);

  // Compute monthly rates from raw attendance data
  const computedMonths = useMemo(() => {
    const map = new Map<string, { present: number; total: number }>();

    // Initialize all months
    monthlyEvolution.forEach((m) => {
      map.set(m.period, { present: 0, total: m.totalDays });
    });

    attendance.forEach((a) => {
      const p = a.date.substring(0, 7);
      const rec = map.get(p);
      if (rec && ["present", "mission", "deplacement"].includes(a.status)) {
        rec.present++;
      }
    });

    return monthlyEvolution.map((m) => {
      const rec = map.get(m.period);
      const present = rec?.present || 0;
      const total = rec?.totalDays || 1;
      return {
        ...m,
        days: present,
        rate: Math.round((present / total) * 100),
      };
    });
  }, [attendance, monthlyEvolution]);

  // Detailed records for the selected period
  const periodAttendance = useMemo(() => {
    return attendance.filter((a) => a.date.startsWith(historyPeriod));
  }, [attendance, historyPeriod]);

  const periodJustifications = useMemo(() => {
    return justifications.filter((j) => j.period === historyPeriod);
  }, [justifications, historyPeriod]);

  // Stats for selected period
  const periodStats = useMemo(() => {
    const total = computedMonths.find((m) => m.period === historyPeriod);
    const presentCount = periodAttendance.filter((a) =>
      ["present", "mission", "deplacement"].includes(a.status)
    ).length;
    const hours = periodAttendance.reduce((s, a) => {
      if (!a.check_in || !a.check_out) return s;
      const [h1, m1] = a.check_in.split(":").map(Number);
      const [h2, m2] = a.check_out.split(":").map(Number);
      const diff = (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
      return s + (diff > 0 ? diff : 0);
    }, 0);
    return {
      rate: total?.rate || 0,
      present: presentCount,
      total: total?.totalDays || 0,
      hours: +hours.toFixed(1),
    };
  }, [historyPeriod, periodAttendance, computedMonths]);

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
            {/* Quick stats row */}
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-lg border bg-card p-2.5 text-center">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Direction</p>
                <p className="text-xs font-medium mt-0.5 truncate">{direction}</p>
              </div>
              <div className="rounded-lg border bg-card p-2.5 text-center">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Présence</p>
                <p className="text-lg font-bold mt-0.5">{periodStats.rate}%</p>
              </div>
              <div className="rounded-lg border bg-card p-2.5 text-center">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Jours</p>
                <p className="text-lg font-bold mt-0.5">{periodStats.present}<span className="text-sm font-normal text-muted-foreground">/{periodStats.total}</span></p>
              </div>
              <div className="rounded-lg border bg-card p-2.5 text-center">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Heures</p>
                <p className="text-lg font-bold mt-0.5">{periodStats.hours}<span className="text-sm font-normal text-muted-foreground">h</span></p>
              </div>
            </div>

            {/* Mention badge */}
            <div className="flex justify-center">
              <MentionBadge m={mentionFor(periodStats.rate)} />
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
                      <YAxis fontSize={10} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        formatter={(v: any, name: string) => {
                          if (name === "rate") return [`${v}%`, "Présence"];
                          return [v, name];
                        }}
                        labelFormatter={(label: string, payload: any[]) => {
                          if (payload?.[0]?.payload?.period) {
                            return periodLabel(payload[0].payload.period);
                          }
                          return label;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="rate"
                        name="rate"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 4, strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Period selector for detail */}
            <div className="flex items-center gap-3">
              <CalendarDays className="h-4 w-4 text-primary" />
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

            {/* Attendance detail table */}
            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Entrée</th>
                      <th className="px-3 py-2 text-left">Sortie</th>
                      <th className="px-3 py-2 text-left">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodAttendance.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                          Aucune donnée pour cette période.
                        </td>
                      </tr>
                    )}
                    {periodAttendance.map((a, i) => (
                      <tr key={i} className="border-t hover:bg-muted/40">
                        <td className="px-3 py-1.5">{fmtDate(a.date)}</td>
                        <td className="px-3 py-1.5 font-mono text-xs">{a.check_in || "—"}</td>
                        <td className="px-3 py-1.5 font-mono text-xs">{a.check_out || "—"}</td>
                        <td className="px-3 py-1.5">
                          <Badge
                            variant={
                              a.status === "present" ? "default" :
                              a.status === "mission" || a.status === "deplacement" ? "secondary" :
                              "outline"
                            }
                            className="text-[10px]"
                          >
                            {a.status === "present" ? "Présent" :
                             a.status === "mission" ? "Mission" :
                             a.status === "deplacement" ? "Déplacement" :
                             a.status === "late" ? "Retard" :
                             a.status === "absent" ? "Absent" : a.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Justifications */}
            {periodJustifications.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold">Justifications</h4>
                </div>
                <div className="space-y-2">
                  {periodJustifications.map((j) => (
                    <div key={j.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] font-mono">{j.period}</Badge>
                        <Badge
                          variant={
                            j.status === "approved" ? "default" :
                            j.status === "rejected" ? "destructive" : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {j.status === "approved" ? "Approuvé" :
                           j.status === "rejected" ? "Rejeté" : "En attente"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{j.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Fermer</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

