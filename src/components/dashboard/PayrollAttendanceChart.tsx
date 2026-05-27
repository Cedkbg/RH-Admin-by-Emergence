import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell,
} from "recharts";
import { CalendarIcon, RefreshCw, TrendingUp, Users, Wallet, Activity } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, isWeekend, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

type Preset = "week" | "month" | "prev_month" | "custom";

interface Row {
  employee_id: string;
  name: string;
  matricule: string | null;
  salary: number;       // somme net_pay sur la période (USD)
  workedDays: number;   // jours pointés dans la plage
  expectedDays: number; // jours ouvrés théoriques dans la plage
  attendance: number;   // % présence
}

const fmtUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(n || 0)) + " USD";

const presetRange = (preset: Preset): { from: Date; to: Date } => {
  const now = new Date();
  if (preset === "week") return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
  if (preset === "month") return { from: startOfMonth(now), to: endOfMonth(now) };
  if (preset === "prev_month") { const d = subMonths(now, 1); return { from: startOfMonth(d), to: endOfMonth(d) }; }
  return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
};

const workingDaysIn = (from: Date, to: Date) =>
  eachDayOfInterval({ start: from, end: to }).filter((d) => !isWeekend(d)).length;

const periodsCovered = (from: Date, to: Date): string[] => {
  const set = new Set<string>();
  const cur = new Date(from.getFullYear(), from.getMonth(), 1);
  const last = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cur <= last) {
    set.add(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return Array.from(set);
};

export function PayrollAttendanceChart() {
  const [preset, setPreset] = useState<Preset>("week");
  const [range, setRange] = useState<DateRange>(presetRange("week"));
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const from = range.from!;
  const to = range.to ?? range.from!;

  const reload = async () => {
    setLoading(true);
    try {
      const fromStr = format(from, "yyyy-MM-dd");
      const toStr = format(to, "yyyy-MM-dd");
      const periods = periodsCovered(from, to);

      const [{ data: emps }, { data: att }, { data: pay }] = await Promise.all([
        supabase.from("employees").select("id,first_name,last_name,matricule,status").eq("status", "active").order("last_name"),
        supabase.from("attendance").select("employee_id,date,status").gte("date", fromStr).lte("date", toStr),
        supabase.from("payroll").select("employee_id,net_pay,period").in("period", periods),
      ]);

      const expected = workingDaysIn(from, to);
      const monthsCount = periods.length || 1;
      // proportion de la plage couverte au sein des mois (pour pondérer le net_pay mensuel)
      const totalDaysInRange = differenceInCalendarDays(to, from) + 1;
      const totalDaysInMonths = periods.reduce((s, p) => {
        const [y, m] = p.split("-").map(Number);
        return s + new Date(y, m, 0).getDate();
      }, 0);
      const weight = Math.min(1, totalDaysInRange / Math.max(1, totalDaysInMonths / monthsCount * monthsCount));

      const presentByEmp = new Map<string, number>();
      (att || []).forEach((a: any) => {
        if (a.status === "present" || a.status === "mission" || a.status === "deplacement") {
          presentByEmp.set(a.employee_id, (presentByEmp.get(a.employee_id) || 0) + 1);
        }
      });
      const salaryByEmp = new Map<string, number>();
      (pay || []).forEach((p: any) => {
        salaryByEmp.set(p.employee_id, (salaryByEmp.get(p.employee_id) || 0) + Number(p.net_pay || 0));
      });

      const result: Row[] = (emps || []).map((e: any) => {
        const worked = presentByEmp.get(e.id) || 0;
        const salaryMonth = salaryByEmp.get(e.id) || 0;
        const proratedSalary = +(salaryMonth * weight).toFixed(2);
        const attendance = expected > 0 ? Math.round((worked / expected) * 100) : 0;
        // Salaire effectif = salaire au prorata × taux de présence (rémunération réelle si on tient compte de la présence)
        const effectiveSalary = +(proratedSalary * (attendance / 100)).toFixed(2);
        return {
          employee_id: e.id,
          name: `${e.first_name} ${e.last_name}`,
          matricule: e.matricule,
          salary: effectiveSalary,
          workedDays: worked,
          expectedDays: expected,
          attendance,
        };
      }).sort((a, b) => b.salary - a.salary);

      setRows(result);
    } catch (e) {
      console.error("[PayrollAttendanceChart] reload:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [from.getTime(), to.getTime(), refreshKey]);

  // Auto-refresh chaque semaine (toutes les 60s + on déclenche un reload si on passe à une nouvelle semaine ISO)
  useEffect(() => {
    const id = setInterval(() => setRefreshKey((k) => k + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Realtime : recharge dès qu'un pointage ou un bulletin change
  useEffect(() => {
    const ch = supabase.channel("payroll-attendance-chart");
    ["attendance", "payroll"].forEach((t) => {
      ch.on("postgres_changes", { event: "*", schema: "public", table: t }, () => setRefreshKey((k) => k + 1));
    });
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const totals = useMemo(() => {
    const totalSalary = rows.reduce((s, r) => s + r.salary, 0);
    const avgAttendance = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.attendance, 0) / rows.length) : 0;
    const fullAttendance = rows.filter((r) => r.attendance >= 95).length;
    return { totalSalary, avgAttendance, fullAttendance };
  }, [rows]);

  const chartData = rows.slice(0, 15).map((r) => ({
    name: r.name.length > 18 ? r.name.slice(0, 16) + "…" : r.name,
    full: r.name,
    Salaire: r.salary,
    Présence: r.attendance,
  }));

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") setRange(presetRange(p));
  };

  return (
    <Card className="p-5 ring-1 ring-primary/10">
      {/* En-tête */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="inline-flex p-1.5 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-base">Salaires effectifs × Présence</h3>
            <Badge variant="outline" className="text-[10px] font-mono">
              {format(from, "dd MMM", { locale: fr })} → {format(to, "dd MMM yyyy", { locale: fr })}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Net mensuel pondéré par le taux de présence réel sur la période.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={preset} onValueChange={(v) => applyPreset(v as Preset)}>
            <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Mois en cours</SelectItem>
              <SelectItem value="prev_month">Mois précédent</SelectItem>
              <SelectItem value="custom">Plage personnalisée</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                {format(from, "dd/MM")} – {format(to, "dd/MM")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={range}
                onSelect={(r) => { if (r?.from) { setRange({ from: r.from, to: r.to ?? r.from }); setPreset("custom"); } }}
                numberOfMonths={2}
                locale={fr}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setRefreshKey((k) => k + 1)}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* KPIs résumé */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <Kpi icon={Wallet} label="Masse pondérée" value={fmtUSD(totals.totalSalary)} tone="emerald" />
        <Kpi icon={Users} label="Agents suivis" value={String(rows.length)} tone="blue" />
        <Kpi icon={Activity} label="Présence moy." value={`${totals.avgAttendance}%`} tone="amber" />
        <Kpi icon={TrendingUp} label="Assidus (≥95%)" value={String(totals.fullAttendance)} tone="indigo" />
      </div>

      {/* Chart */}
      <div className="h-80 w-full">
        {rows.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            {loading ? "Chargement…" : "Aucune donnée sur la période."}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}$`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: any, k: any) => k === "Salaire" ? [fmtUSD(Number(v)), "Salaire effectif"] : [`${v}%`, "Présence"]}
                labelFormatter={(_l, payload) => (payload && payload[0]?.payload?.full) || _l}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="Salaire" radius={[6, 6, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={`hsl(${(i * 28) % 360} 70% 50%)`} />
                ))}
              </Bar>
              <Bar yAxisId="right" dataKey="Présence" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" fillOpacity={0.35} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tableau détaillé */}
      {rows.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2 text-left">Agent</th>
                <th className="p-2 text-right">Jours pointés</th>
                <th className="p-2 text-right">Jours ouvrés</th>
                <th className="p-2 text-right">Présence</th>
                <th className="p-2 text-right">Salaire effectif</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.employee_id} className="border-t hover:bg-muted/40">
                  <td className="p-2">
                    <div className="font-medium">{r.name}</div>
                    {r.matricule && <div className="text-[10px] font-mono text-muted-foreground">{r.matricule}</div>}
                  </td>
                  <td className="p-2 text-right">{r.workedDays}</td>
                  <td className="p-2 text-right">{r.expectedDays}</td>
                  <td className="p-2 text-right">
                    <Badge variant={r.attendance >= 95 ? "default" : r.attendance >= 70 ? "secondary" : "destructive"}>
                      {r.attendance}%
                    </Badge>
                  </td>
                  <td className="p-2 text-right font-bold text-primary">{fmtUSD(r.salary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Kpi({ icon: Icon, label, value, tone }: any) {
  const toneClasses: Record<string, string> = {
    emerald: "from-emerald-500 to-emerald-600",
    blue: "from-blue-500 to-blue-600",
    amber: "from-amber-500 to-amber-600",
    indigo: "from-indigo-500 to-indigo-600",
  };
  return (
    <div className="rounded-lg border p-3 bg-card">
      <div className={cn("inline-flex p-1.5 rounded-md bg-gradient-to-br text-white mb-1.5", toneClasses[tone])}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-sm font-bold mt-0.5">{value}</p>
    </div>
  );
}
