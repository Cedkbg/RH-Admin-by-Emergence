import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Clock, RefreshCw, TrendingUp } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import {
  format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, subWeeks, subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";

type Mode = "week" | "month";

interface Employee { id: string; first_name: string; last_name: string; matricule: string | null; }
interface AttRow { employee_id: string; date: string; check_in: string | null; check_out: string | null; }

const hoursBetween = (ci: string | null, co: string | null) => {
  if (!ci || !co) return 0;
  const [h1, m1] = ci.split(":").map(Number);
  const [h2, m2] = co.split(":").map(Number);
  return Math.max(0, ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60);
};

export function AgentHoursStats() {
  const [mode, setMode] = useState<Mode>("week");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [agentId, setAgentId] = useState<string>("__all__");
  const [att, setAtt] = useState<AttRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  // Plage : semaine = lundi → samedi de la semaine courante ; mois = mois courant
  const { from, to } = useMemo(() => {
    const now = new Date();
    if (mode === "week") {
      const monday = startOfWeek(now, { weekStartsOn: 1 });
      return { from: monday, to: addDays(monday, 5) }; // lundi → samedi
    }
    return { from: startOfMonth(now), to: endOfMonth(now) };
  }, [mode]);

  useEffect(() => {
    supabase.from("employees")
      .select("id,first_name,last_name,matricule")
      .eq("status", "active")
      .order("last_name")
      .then(({ data }) => setEmployees((data as Employee[]) || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const fromStr = format(from, "yyyy-MM-dd");
    const toStr = format(to, "yyyy-MM-dd");
    supabase.from("attendance")
      .select("employee_id,date,check_in,check_out")
      .gte("date", fromStr)
      .lte("date", toStr)
      .then(({ data }) => { setAtt((data as AttRow[]) || []); setLoading(false); });
  }, [from, to, refresh]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel("agent-hours-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => setRefresh((k) => k + 1))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(
    () => agentId === "__all__" ? att : att.filter((r) => r.employee_id === agentId),
    [att, agentId]
  );

  // Données du graphique (courbe linéaire)
  const chartData = useMemo(() => {
    if (mode === "week") {
      // Lundi → Samedi
      const days = Array.from({ length: 6 }, (_, i) => addDays(from, i));
      return days.map((d) => {
        const dayRows = filtered.filter((r) => r.date === format(d, "yyyy-MM-dd"));
        const total = dayRows.reduce((s, r) => s + hoursBetween(r.check_in, r.check_out), 0);
        return {
          label: format(d, "EEE dd", { locale: fr }),
          Heures: +total.toFixed(2),
        };
      });
    }
    // Mois : agrégation par semaine ISO
    const days = eachDayOfInterval({ start: from, end: to });
    const byWeek = new Map<string, number>();
    days.forEach((d) => {
      const monday = startOfWeek(d, { weekStartsOn: 1 });
      const key = format(monday, "yyyy-MM-dd");
      const dayRows = filtered.filter((r) => r.date === format(d, "yyyy-MM-dd"));
      const total = dayRows.reduce((s, r) => s + hoursBetween(r.check_in, r.check_out), 0);
      byWeek.set(key, (byWeek.get(key) || 0) + total);
    });
    return Array.from(byWeek.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({
        label: `Sem. ${format(new Date(k), "dd/MM", { locale: fr })}`,
        Heures: +v.toFixed(2),
      }));
  }, [filtered, from, to, mode]);

  const totalHours = chartData.reduce((s, r) => s + r.Heures, 0);
  const avgPerSlot = chartData.length > 0 ? totalHours / chartData.length : 0;

  // Récap par agent (toujours sur la plage)
  const perAgent = useMemo(() => {
    const map = new Map<string, number>();
    att.forEach((r) => {
      const h = hoursBetween(r.check_in, r.check_out);
      map.set(r.employee_id, (map.get(r.employee_id) || 0) + h);
    });
    return employees
      .map((e) => ({ ...e, hours: +(map.get(e.id) || 0).toFixed(2) }))
      .sort((a, b) => b.hours - a.hours);
  }, [att, employees]);

  return (
    <Card className="p-5 ring-1 ring-primary/10">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="inline-flex p-1.5 rounded-md bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
              <Clock className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-base">Heures travaillées des agents</h3>
            <Badge variant="outline" className="text-[10px] font-mono">
              {format(from, "dd MMM", { locale: fr })} → {format(to, "dd MMM yyyy", { locale: fr })}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {mode === "week"
              ? "Cumul du lundi au samedi de la semaine en cours."
              : "Cumul par semaine sur le mois en cours."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Cette semaine (L→S)</SelectItem>
              <SelectItem value="month">Ce mois (par sem.)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={agentId} onValueChange={setAgentId}>
            <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les agents</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setRefresh((k) => k + 1)}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Mini icon={Clock} label="Total" value={`${totalHours.toFixed(1)} h`} />
        <Mini icon={Activity} label={mode === "week" ? "Moy/jour" : "Moy/semaine"} value={`${avgPerSlot.toFixed(1)} h`} />
        <Mini icon={TrendingUp} label="Agents suivis" value={agentId === "__all__" ? String(employees.length) : "1"} />
      </div>

      <div className="h-72 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            {loading ? "Chargement…" : "Aucune donnée sur la période."}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: any) => [`${v} h`, "Heures"]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="Heures"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {agentId === "__all__" && perAgent.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2 text-left">Agent</th>
                <th className="p-2 text-right">Heures sur la période</th>
              </tr>
            </thead>
            <tbody>
              {perAgent.map((a) => (
                <tr key={a.id} className="border-t hover:bg-muted/40">
                  <td className="p-2">
                    <div className="font-medium">{a.first_name} {a.last_name}</div>
                    {a.matricule && <div className="text-[10px] font-mono text-muted-foreground">{a.matricule}</div>}
                  </td>
                  <td className="p-2 text-right font-bold text-primary">{a.hours.toFixed(2)} h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Mini({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-lg border p-3 bg-card">
      <div className="inline-flex p-1.5 rounded-md bg-gradient-to-br from-slate-500 to-slate-600 text-white mb-1.5">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-sm font-bold mt-0.5">{value}</p>
    </div>
  );
}
