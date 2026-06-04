import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { RefreshCw, TrendingUp } from "lucide-react";
import {
  format, startOfWeek, addDays, startOfMonth, endOfMonth, startOfYear, endOfYear,
  eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isWeekend,
} from "date-fns";
import { fr } from "date-fns/locale";

type Mode = "week" | "month" | "year";

interface AttRow { employee_id: string; date: string; status: string | null; check_in: string | null; check_out: string | null; }
interface Employee { id: string; first_name: string; last_name: string; }

const hoursBetween = (ci: string | null, co: string | null) => {
  if (!ci || !co) return 0;
  const [h1, m1] = ci.split(":").map(Number);
  const [h2, m2] = co.split(":").map(Number);
  return Math.max(0, ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60);
};

interface Props {
  selectedAgentId?: string | null;
}

export function PerformanceTimeChart({ selectedAgentId }: Props) {
  const [mode, setMode] = useState<Mode>("month");
  const [att, setAtt] = useState<AttRow[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [totalActive, setTotalActive] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  const { from, to } = useMemo(() => {
    const now = new Date();
    if (mode === "week") {
      const monday = startOfWeek(now, { weekStartsOn: 1 });
      return { from: monday, to: addDays(monday, 5) };
    }
    if (mode === "month") return { from: startOfMonth(now), to: endOfMonth(now) };
    return { from: startOfYear(now), to: endOfYear(now) };
  }, [mode]);

  useEffect(() => {
    if (!selectedAgentId) { setEmployee(null); return; }
    supabase.from("employees").select("id,first_name,last_name").eq("id", selectedAgentId).maybeSingle()
      .then(({ data }) => setEmployee(data as Employee | null));
  }, [selectedAgentId]);

  useEffect(() => {
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "active")
      .then(({ count }) => setTotalActive(count ?? 0));
  }, [refresh]);

  useEffect(() => {
    setLoading(true);
    const fromStr = format(from, "yyyy-MM-dd");
    const toStr = format(to, "yyyy-MM-dd");
    let q = supabase.from("attendance")
      .select("employee_id,date,status,check_in,check_out")
      .gte("date", fromStr).lte("date", toStr);
    if (selectedAgentId) q = q.eq("employee_id", selectedAgentId);
    q.then(({ data }) => { setAtt((data as AttRow[]) || []); setLoading(false); });
  }, [from, to, selectedAgentId, refresh]);

  useEffect(() => {
    const ch = supabase.channel("perf-time-chart")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => setRefresh((k) => k + 1))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const chartData = useMemo(() => {
    const buckets: { label: string; start: Date; end: Date }[] = [];
    if (mode === "week") {
      const days = Array.from({ length: 6 }, (_, i) => addDays(from, i));
      days.forEach((d) => buckets.push({ label: format(d, "EEE dd", { locale: fr }), start: d, end: d }));
    } else if (mode === "month") {
      const weeks = eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 1 });
      weeks.forEach((w) => {
        const end = addDays(w, 5);
        buckets.push({ label: `S.${format(w, "dd/MM", { locale: fr })}`, start: w, end });
      });
    } else {
      const months = eachMonthOfInterval({ start: from, end: to });
      months.forEach((m) => buckets.push({
        label: format(m, "MMM", { locale: fr }),
        start: startOfMonth(m), end: endOfMonth(m),
      }));
    }

    return buckets.map((b) => {
      const startStr = format(b.start, "yyyy-MM-dd");
      const endStr = format(b.end, "yyyy-MM-dd");
      const inRange = att.filter((a) => a.date >= startStr && a.date <= endStr);
      const expected = eachDayOfInterval({ start: b.start, end: b.end }).filter((d) => !isWeekend(d)).length;
      let presence: number;
      if (selectedAgentId) {
        const present = inRange.filter((a) => a.status === "present" || a.status === "mission" || a.status === "deplacement").length;
        presence = expected > 0 ? Math.round((present / expected) * 100) : 0;
      } else {
        const totalPresences = inRange.filter((a) => a.status === "present" || a.status === "mission" || a.status === "deplacement").length;
        const headcount = totalActive || new Set(att.map((a) => a.employee_id)).size || 1;
        presence = expected > 0 ? Math.min(100, Math.round((totalPresences / (expected * headcount)) * 100)) : 0;
      }
      const hours = +inRange.reduce((s, a) => s + hoursBetween(a.check_in, a.check_out), 0).toFixed(1);
      return { label: b.label, Présence: presence, Heures: hours };
    });
  }, [att, from, to, mode, selectedAgentId]);

  const title = selectedAgentId
    ? `Performance — ${employee?.first_name ?? ""} ${employee?.last_name ?? ""}`
    : "Performance globale (tous agents)";

  return (
    <Card className="p-5 ring-1 ring-primary/10">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="inline-flex p-1.5 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-base">{title}</h3>
            <Badge variant="outline" className="text-[10px] font-mono">
              {format(from, "dd MMM", { locale: fr })} → {format(to, "dd MMM yyyy", { locale: fr })}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Évolution de la présence (%) et des heures travaillées sur la période choisie.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setRefresh((k) => k + 1)}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="h-80 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            {loading ? "Chargement…" : "Aucune donnée."}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 16, right: 24, left: 8, bottom: 10 }}>
              <defs>
                <linearGradient id="presenceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="hoursFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(160 70% 40%)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="hsl(160 70% 40%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} dy={6} />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={42}
              />

              <Tooltip
                cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "3 3" }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 10,
                  fontSize: 12,
                  boxShadow: "0 10px 30px -10px hsl(var(--primary) / 0.25)",
                }}
                formatter={(value: number, name: string) => [
                  name === "Présence" ? `${value}%` : `${value} h`,
                  name,
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
              <Area type="monotone" dataKey="Présence" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#presenceFill)" dot={{ r: 3, strokeWidth: 2, fill: "hsl(var(--background))" }} activeDot={{ r: 6 }} />
              <Area type="monotone" dataKey="Heures" stroke="hsl(160 70% 40%)" strokeWidth={2.5} fill="url(#hoursFill)" dot={{ r: 3, strokeWidth: 2, fill: "hsl(var(--background))" }} activeDot={{ r: 6 }} />

            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
