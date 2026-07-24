import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Wallet, TrendingUp, Users, Activity, Percent, ReceiptText, Gift, PiggyBank, User as UserIcon, CalendarRange,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, format, subMonths } from "date-fns";
import { fr } from "date-fns/locale";

const fmtUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(n || 0)) + " USD";

const hoursBetween = (ci: string | null, co: string | null) => {
  if (!ci || !co) return 0;
  const [h1, m1] = ci.split(":").map(Number);
  const [h2, m2] = co.split(":").map(Number);
  return Math.max(0, ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60);
};

const periodKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const yearKey = (d: Date) => String(d.getFullYear());

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  matricule: string | null;
  position: string | null;
  contract_type: string | null;
  base_salary: number | null;
  hourly_rate: number | null;
  status: string | null;
}

interface PayRow {
  employee_id: string;
  period: string;
  net_pay: number | null;
  base_salary: number | null;
  total_avantages: number | null;
  deductions: number | null;
  cnss: number | null;
  ipr: number | null;
  inpp: number | null;
  onem: number | null;
  other_deductions: number | null;
  transport: number | null;
  communication: number | null;
  loyer: number | null;
  allocation_familiale: number | null;
  bonus: number | null;
  status: string | null;
}

interface AttRow {
  employee_id: string;
  date: string;
  status: string | null;
  check_in: string | null;
  check_out: string | null;
}

const brutContract = (e: Pick<Employee, "base_salary" | "hourly_rate">) => {
  const base = Number(e.base_salary || 0);
  if (base > 0) return base;
  const hr = Number(e.hourly_rate || 0);
  return hr > 0 ? +(hr * 160).toFixed(2) : 0;
};

interface Props {
  selectedAgentId?: string | null;
}

export function AgentSalaryDetail({ selectedAgentId }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pays, setPays] = useState<PayRow[]>([]);
  const [att, setAtt] = useState<AttRow[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const currentPeriod = periodKey(now);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: emps }, { data: allPays }, { data: allAtt }] = await Promise.all([
        supabase
          .from("employees")
          .select("id,first_name,last_name,matricule,position,contract_type,base_salary,hourly_rate,status")
          .order("last_name"),
        supabase
          .from("payroll")
          .select("employee_id,period,net_pay,base_salary,total_avantages,deductions,cnss,ipr,inpp,onem,other_deductions,transport,communication,loyer,allocation_familiale,bonus,status")
          .gte("period", `${now.getFullYear()}-01`),
        supabase
          .from("attendance")
          .select("employee_id,date,status,check_in,check_out")
          .gte("date", format(yearStart, "yyyy-MM-dd")),
      ]);
      setEmployees((emps as Employee[]) || []);
      setPays((allPays as PayRow[]) || []);
      setAtt((allAtt as AttRow[]) || []);
      setLoading(false);
    })();
  }, []);

  // Jours ouvrables du mois courant
  const workingDaysMonth = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }).filter((d) => !isWeekend(d)).length,
    [monthStart.getTime(), monthEnd.getTime()],
  );

  const activeEmployees = useMemo(() => employees.filter((e) => e.status === "active"), [employees]);

  /** Calcule le net à payer projeté sur le mois selon présence pour un agent. */
  const projectedForAgent = (e: Employee, period: string) => {
    const [y, m] = period.split("-").map(Number);
    const mStart = new Date(y, m - 1, 1);
    const mEnd = endOfMonth(mStart);
    const workingDays = eachDayOfInterval({ start: mStart, end: mEnd }).filter((d) => !isWeekend(d)).length;

    const agentAtt = att.filter(
      (a) => a.employee_id === e.id && a.date >= format(mStart, "yyyy-MM-dd") && a.date <= format(mEnd, "yyyy-MM-dd"),
    );
    const workedHours = agentAtt.reduce((s, a) => s + hoursBetween(a.check_in, a.check_out), 0);
    const presentDays = agentAtt.filter((a) => a.status === "present" || a.status === "mission" || a.status === "deplacement").length;
    const presenceRate = workingDays > 0 ? Math.min(100, Math.round((presentDays / workingDays) * 100)) : 0;

    const hr = Number(e.hourly_rate || 0);
    const base = Number(e.base_salary || 0);
    const brutContractuel = brutContract(e);

    let brutProjete = 0;
    if (hr > 0) brutProjete = +(workedHours * hr).toFixed(2);
    else if (base > 0 && workingDays > 0) brutProjete = +((base * presentDays) / workingDays).toFixed(2);

    // Bulletin existant si présent
    const pay = pays.find((p) => p.employee_id === e.id && p.period === period);
    const avantages = Number(pay?.total_avantages || 0);
    const retenues = {
      cnss: Number(pay?.cnss || 0),
      ipr: Number(pay?.ipr || 0),
      inpp: Number(pay?.inpp || 0),
      onem: Number(pay?.onem || 0),
      autres: Number(pay?.other_deductions || 0),
    };
    const totalRetenues = retenues.cnss + retenues.ipr + retenues.inpp + retenues.onem + retenues.autres;

    const brutFinal = pay?.base_salary != null ? Number(pay.base_salary) : brutProjete;
    const netProjete = pay?.net_pay != null ? Number(pay.net_pay) : +(brutFinal + avantages - totalRetenues).toFixed(2);

    return {
      workedHours: +workedHours.toFixed(2),
      presentDays,
      workingDays,
      presenceRate,
      brutContractuel,
      brutProjete: brutFinal,
      avantages,
      retenues,
      totalRetenues,
      netProjete,
      hasBulletin: !!pay,
      bulletinStatus: pay?.status ?? null,
    };
  };

  // Vue globale (tous agents, mois courant)
  const globalStats = useMemo(() => {
    if (!activeEmployees.length) return null;
    const per = activeEmployees.map((e) => projectedForAgent(e, currentPeriod));
    const sum = (k: keyof typeof per[number]) => per.reduce((s, r: any) => s + Number(r[k] || 0), 0);
    const brutContractuel = sum("brutContractuel");
    const brutCumule = sum("brutProjete");
    const netAPayer = sum("netProjete");
    const avantages = sum("avantages");
    const retCnss = per.reduce((s, r) => s + r.retenues.cnss, 0);
    const retIpr = per.reduce((s, r) => s + r.retenues.ipr, 0);
    const retInpp = per.reduce((s, r) => s + r.retenues.inpp, 0);
    const retOnem = per.reduce((s, r) => s + r.retenues.onem, 0);
    const retAutres = per.reduce((s, r) => s + r.retenues.autres, 0);
    const totalRetenues = retCnss + retIpr + retInpp + retOnem + retAutres;
    const presenceMoy = Math.round(per.reduce((s, r) => s + r.presenceRate, 0) / per.length);
    return {
      brutContractuel, brutCumule, netAPayer, avantages,
      retCnss, retIpr, retInpp, retOnem, retAutres, totalRetenues,
      presenceMoy, headcount: activeEmployees.length,
    };
  }, [activeEmployees, pays, att, currentPeriod]);

  // Vue individuelle
  const agent = selectedAgentId ? employees.find((e) => e.id === selectedAgentId) : null;

  const agentData = useMemo(() => {
    if (!agent) return null;
    const currentM = projectedForAgent(agent, currentPeriod);

    // 6 derniers mois
    const months: { period: string; label: string; data: ReturnType<typeof projectedForAgent> }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const p = periodKey(d);
      months.push({ period: p, label: format(d, "MMM yy", { locale: fr }), data: projectedForAgent(agent, p) });
    }

    // Cumul de l'année (bulletins + projeté du mois en cours si pas encore de bulletin)
    const yearPays = pays.filter((p) => p.employee_id === agent.id && p.period.startsWith(yearKey(now)));
    const cumulNetPaye = yearPays.reduce((s, p) => s + Number(p.net_pay || 0), 0);
    const cumulBrutAnnee = months.reduce((s, m) => s + m.data.brutProjete, 0);
    const cumulRetenuesAnnee = months.reduce((s, m) => s + m.data.totalRetenues, 0);
    const netMoyen = months.length ? cumulNetPaye / Math.max(1, yearPays.length) : 0;
    const presenceMoyAnnee = Math.round(months.reduce((s, m) => s + m.data.presenceRate, 0) / months.length);

    return { currentM, months, cumulNetPaye, cumulBrutAnnee, cumulRetenuesAnnee, netMoyen, presenceMoyAnnee };
  }, [agent, pays, att, currentPeriod]);

  if (loading) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">Chargement des statistiques financières…</Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bandeau global */}
      {globalStats && !agent && (
        <Card className="p-5 ring-1 ring-primary/10">
          <div className="flex items-center gap-2 mb-4">
            <div className="inline-flex p-1.5 rounded-md bg-gradient-to-br from-primary to-primary/70 text-white">
              <Users className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-base">Synthèse globale — {currentPeriod}</h3>
            <Badge variant="outline" className="text-[10px]">{globalStats.headcount} agents actifs</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat icon={Wallet} label="Masse brute contractuelle" value={fmtUSD(globalStats.brutContractuel)} tone="slate" />
            <Stat icon={TrendingUp} label="Brut cumulé (présence)" value={fmtUSD(globalStats.brutCumule)} tone="indigo" />
            <Stat icon={Gift} label="Avantages globaux" value={fmtUSD(globalStats.avantages)} tone="emerald" />
            <Stat icon={PiggyBank} label="Retenues totales" value={fmtUSD(globalStats.totalRetenues)} tone="rose" />
            <Stat icon={ReceiptText} label="Net à payer projeté" value={fmtUSD(globalStats.netAPayer)} tone="primary" />
            <Stat icon={Percent} label="Présence moyenne" value={`${globalStats.presenceMoy}%`} tone="amber" />
            <Stat icon={Activity} label="CNSS" value={fmtUSD(globalStats.retCnss)} small />
            <Stat icon={Activity} label="IPR" value={fmtUSD(globalStats.retIpr)} small />
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            👉 Cliquez sur un agent ci-dessus pour ouvrir sa fiche détaillée (brut, net, retenues, cumul annuel).
          </p>
        </Card>
      )}

      {/* Vue individuelle */}
      {agent && agentData && (
        <Card className="p-5 ring-1 ring-primary/10">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <div className="inline-flex p-1.5 rounded-md bg-gradient-to-br from-primary to-primary/70 text-white">
                <UserIcon className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-base">
                  {agent.first_name} {agent.last_name}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {agent.position || "—"} · {agent.contract_type || "CDI"}
                  {agent.matricule ? ` · ${agent.matricule}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] gap-1">
                <CalendarRange className="h-3 w-3" /> {currentPeriod}
              </Badge>
              {agentData.currentM.hasBulletin ? (
                <Badge className="text-[10px]">Bulletin {agentData.currentM.bulletinStatus}</Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">Projection</Badge>
              )}
            </div>
          </div>

          {/* KPIs mois courant */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Stat icon={Wallet} label="Brut contractuel" value={fmtUSD(agentData.currentM.brutContractuel)} tone="slate" />
            <Stat icon={TrendingUp} label="Brut selon présence" value={fmtUSD(agentData.currentM.brutProjete)} tone="indigo" />
            <Stat icon={Gift} label="Avantages" value={fmtUSD(agentData.currentM.avantages)} tone="emerald" />
            <Stat icon={PiggyBank} label="Retenues" value={fmtUSD(agentData.currentM.totalRetenues)} tone="rose" />
            <Stat icon={ReceiptText} label="Net à payer" value={fmtUSD(agentData.currentM.netProjete)} tone="primary" highlight />
            <Stat icon={Percent} label="Taux de présence" value={`${agentData.currentM.presenceRate}%`} tone="amber" />
            <Stat icon={Activity} label="Heures travaillées" value={`${agentData.currentM.workedHours} h`} small />
            <Stat icon={Activity} label="Jours présents" value={`${agentData.currentM.presentDays}/${agentData.currentM.workingDays}`} small />
          </div>

          {/* Détail retenues */}
          <div className="rounded-lg border p-3 mb-4 bg-muted/20">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Détail des retenues — {currentPeriod}</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
              <RetLine label="CNSS" v={agentData.currentM.retenues.cnss} />
              <RetLine label="IPR" v={agentData.currentM.retenues.ipr} />
              <RetLine label="INPP" v={agentData.currentM.retenues.inpp} />
              <RetLine label="ONEM" v={agentData.currentM.retenues.onem} />
              <RetLine label="Autres" v={agentData.currentM.retenues.autres} />
            </div>
          </div>

          {/* Cumul annuel */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Stat icon={TrendingUp} label={`Brut cumulé ${yearKey(now)}`} value={fmtUSD(agentData.cumulBrutAnnee)} tone="indigo" />
            <Stat icon={ReceiptText} label="Total déjà payé" value={fmtUSD(agentData.cumulNetPaye)} tone="emerald" />
            <Stat icon={PiggyBank} label="Retenues cumulées" value={fmtUSD(agentData.cumulRetenuesAnnee)} tone="rose" />
            <Stat icon={Percent} label="Présence moy. (6 mois)" value={`${agentData.presenceMoyAnnee}%`} tone="amber" />
          </div>

          {/* Graphique évolution 6 mois */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentData.months.map((m) => ({
                mois: m.label,
                Brut: m.data.brutProjete,
                Net: m.data.netProjete,
                Retenues: m.data.totalRetenues,
              }))} margin={{ top: 10, right: 12, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="mois" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => fmtUSD(Number(v))}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                <Bar dataKey="Brut" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Net" fill="hsl(160 70% 40%)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Retenues" fill="hsl(0 70% 55%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({
  icon: Icon, label, value, tone = "slate", small, highlight,
}: {
  icon: any; label: string; value: string; tone?: "slate" | "indigo" | "emerald" | "rose" | "primary" | "amber"; small?: boolean; highlight?: boolean;
}) {
  const bg: Record<string, string> = {
    slate: "from-slate-500 to-slate-600",
    indigo: "from-indigo-500 to-indigo-600",
    emerald: "from-emerald-500 to-emerald-600",
    rose: "from-rose-500 to-rose-600",
    primary: "from-primary to-primary/70",
    amber: "from-amber-500 to-amber-600",
  };
  return (
    <div className={`rounded-lg border p-3 bg-card ${highlight ? "ring-2 ring-primary/40" : ""}`}>
      <div className={`inline-flex p-1.5 rounded-md bg-gradient-to-br ${bg[tone]} text-white mb-1.5`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className={`${small ? "text-sm" : "text-base"} font-bold mt-0.5 tabular-nums`}>{value}</p>
    </div>
  );
}

function RetLine({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-background border px-2 py-1.5">
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      <span className="text-xs font-mono font-bold text-rose-600">{fmtUSD(v)}</span>
    </div>
  );
}
