 import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, UserCheck, UserX, Clock, TrendingUp, TrendingDown,
  Wallet, Calendar, AlertCircle, Activity, DollarSign, Briefcase,
  Building2, GraduationCap, FileCheck, Timer,
} from "lucide-react";

type Variant = "presence" | "paie" | "global";
interface Props { variant: Variant; period?: string; }

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));
const fmtCDF = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(n || 0)) + " USD";

interface Pulse { key: string; ts: number; }

// === Constantes pour projection ===
const STD_HOURS_PER_DAY = 8;
const IPR_BRACKETS = [
  { upTo: 162, rate: 0.03 },
  { upTo: 1800, rate: 0.15 },
  { upTo: 3600, rate: 0.30 },
  { upTo: Infinity, rate: 0.40 },
];
const computeIPR = (assiette: number) => {
  let remaining = Math.max(0, assiette);
  let prev = 0;
  let tax = 0;
  for (const b of IPR_BRACKETS) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, b.upTo - prev);
    if (slice > 0) { tax += slice * b.rate; remaining -= slice; }
    prev = b.upTo;
  }
  return +tax.toFixed(2);
};
const num = (v: any) => Number(v || 0);
const hoursBetween = (ci: string | null, co: string | null) => {
  if (!ci || !co) return 0;
  const [h1, m1] = ci.split(":").map(Number);
  const [h2, m2] = co.split(":").map(Number);
  return Math.max(0, ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60);
};
const workableDaysIn = (year: number, month: number) => {
  let n = 0;
  for (let d = new Date(year, month - 1, 1); d.getMonth() === month - 1; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) n++;
  }
  return n;
};

/**
 * Tableau de bord statistiques pro avec mise à jour temps réel (Supabase Realtime).
 * Trois variantes : présence (jour), paie (période courante), global (consolidé).
 */
export function LiveStats({ variant, period: periodProp }: Props) {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [paiePeriod, setPaiePeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const today = new Date().toISOString().slice(0, 10);
<<<<<<< HEAD
  const period = paiePeriod;
=======
  const period = periodProp || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
>>>>>>> f25310942e1346fa0eacb68408396bb021e519d7

  const reload = async () => {
    try {
      if (variant === "presence") {
        const [att, emp, leaves] = await Promise.all([
          supabase.from("attendance").select("id,employee_id,check_in,check_out,status,date").eq("date", today),
          supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        ]);
        const rows = att.data || [];
        const totalActifs = emp.count ?? 0;
        const present = rows.filter((r: any) => r.status === "present").length;
        const enMission = rows.filter((r: any) => r.status === "mission" || r.status === "deplacement").length;
        const inOffice = rows.filter((r: any) => r.check_in && !r.check_out).length;
        const lateThreshold = "08:15:00";
        const retards = rows.filter((r: any) => r.check_in && r.check_in > lateThreshold).length;
        const absents = Math.max(0, totalActifs - present - enMission);
        const tauxPresence = totalActifs > 0 ? Math.round(((present + enMission) / totalActifs) * 100) : 0;
        setData({ totalActifs, present, absents, retards, enMission, inOffice, tauxPresence, pendingLeaves: leaves.count ?? 0 });
      } else if (variant === "paie") {
<<<<<<< HEAD
        const [pay, emp, empsFull, att] = await Promise.all([
          supabase.from("payroll").select("net_pay,base_salary,total_avantages,deductions,cnss_patronal,status,period,employee_id"),
          supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("employees").select("id,first_name,last_name,matricule,hourly_rate,base_salary,contract_type").eq("status", "active"),
          supabase.from("attendance").select("employee_id,date,check_in,check_out,status"),
        ]);
        const all = pay.data || [];
        const current = all.filter((p: any) => p.period === period);
        const totalNetPayroll = current.reduce((s: number, p: any) => s + Number(p.net_pay || 0), 0);
        const totalBrutPayroll = current.reduce((s: number, p: any) => s + Number(p.base_salary || 0), 0);
        const totalAvantagesPayroll = current.reduce((s: number, p: any) => s + Number(p.total_avantages || 0), 0);
        const totalRetenuesPayroll = current.reduce((s: number, p: any) => s + Number(p.deductions || 0), 0);
=======
        // Bornes de la période sélectionnée (YYYY-MM)
        const [yy, mm] = period.split("-").map(Number);
        const start = `${period}-01`;
        const endDate = new Date(yy, mm, 0); // dernier jour du mois
        const end = endDate.toISOString().slice(0, 10);

        const [pay, emp, empAll, att] = await Promise.all([
          supabase.from("payroll").select("net_pay,base_salary,total_avantages,deductions,cnss_patronal,status,period,employee_id"),
          supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("employees").select("id,base_salary,hourly_rate,contract_type").eq("status", "active"),
          supabase.from("attendance").select("employee_id,date,check_in,check_out,status").gte("date", start).lte("date", end),
        ]);
        const all = pay.data || [];
        const current = all.filter((p: any) => p.period === period);
        const totalBrut = current.reduce((s: number, p: any) => s + Number(p.base_salary || 0), 0);
        const totalAvantages = current.reduce((s: number, p: any) => s + Number(p.total_avantages || 0), 0);
        const totalRetenues = current.reduce((s: number, p: any) => s + Number(p.deductions || 0), 0);
>>>>>>> f25310942e1346fa0eacb68408396bb021e519d7
        const chargesPatronales = current.reduce((s: number, p: any) => s + Number(p.cnss_patronal || 0), 0);
        // Masse brute contractuelle (référence fiches employés, indépendante des bulletins)
        const bruteContractuelle = (empAll.data || []).reduce((s: number, a: any) => {
          const base = Number(a.base_salary || 0);
          if (base > 0) return s + base;
          const hr = Number(a.hourly_rate || 0);
          return s + (hr > 0 ? hr * 160 : 0);
        }, 0);
        const contrats = (empAll.data || []).length;

        // Calcul automatique de la masse nette à payer basé sur la présence réelle
        const empMap = new Map<string, any>((empAll.data || []).map((e: any) => [e.id, e]));
        const hoursByEmp = new Map<string, { hours: number; days: number }>();
        (att.data || []).forEach((r: any) => {
          if (!r.employee_id) return;
          if (r.status && !["present", "mission", "deplacement"].includes(r.status)) return;
          let h = 0;
          if (r.check_in && r.check_out) {
            const [h1, m1] = String(r.check_in).split(":").map(Number);
            const [h2, m2] = String(r.check_out).split(":").map(Number);
            h = Math.max(0, (h2 + m2 / 60) - (h1 + m1 / 60));
          } else if (r.check_in) {
            h = 8; // journée présumée si non pointée en sortie
          }
          const cur = hoursByEmp.get(r.employee_id) || { hours: 0, days: 0 };
          cur.hours += h;
          cur.days += 1;
          hoursByEmp.set(r.employee_id, cur);
        });
        let netProjected = 0;
        hoursByEmp.forEach((v, empId) => {
          const e = empMap.get(empId);
          if (!e) return;
          const hr = Number(e.hourly_rate || 0);
          const base = Number(e.base_salary || 0);
          if (hr > 0) netProjected += v.hours * hr;
          else if (base > 0) netProjected += (base / 22) * v.days; // pro-rata journalier
        });
        // Priorité aux bulletins validés/payés si disponibles pour la période
        const payrollNet = current.reduce((s: number, p: any) => s + Number(p.net_pay || 0), 0);
        const totalNet = payrollNet > 0 ? payrollNet : Math.max(0, netProjected + totalAvantages - totalRetenues);

        const paid = current.filter((p: any) => p.status === "paye").length;
        const pending = current.filter((p: any) => p.status === "en_attente" || p.status === "draft").length;
        const validated = current.filter((p: any) => p.status === "valide").length;
<<<<<<< HEAD
        const avgNetPayroll = current.length > 0 ? totalNetPayroll / current.length : 0;
=======
        const avgNet = current.length > 0 ? totalNet / current.length : (hoursByEmp.size > 0 ? totalNet / hoursByEmp.size : 0);
>>>>>>> f25310942e1346fa0eacb68408396bb021e519d7
        const couverture = (emp.count ?? 0) > 0 ? Math.round((current.length / (emp.count ?? 1)) * 100) : 0;
        // Évolution vs mois précédent
        const d = new Date(yy, mm - 2, 1);
        const prevPeriod = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const prev = all.filter((p: any) => p.period === prevPeriod);
        const totalPrev = prev.reduce((s: number, p: any) => s + Number(p.net_pay || 0), 0);
<<<<<<< HEAD
        const evolution = totalPrev > 0 ? Math.round(((totalNetPayroll - totalPrev) / totalPrev) * 100) : 0;

        // === PROJECTION depuis présence si payroll non trouvé ===
        const [y, m] = period.split("-").map(Number);
        const monthStart = `${period}-01`;
        const monthEnd = new Date(y, m, 0).toISOString().slice(0, 10);
        const workableDays = workableDaysIn(y, m);
        const perEmp = new Map<string, { days: number; hours: number }>();
        (att.data || []).filter((a: any) => a.date >= monthStart && a.date <= monthEnd).forEach((a: any) => {
          if (a.status !== "present" && a.status !== "mission" && a.status !== "deplacement") return;
          const rec = perEmp.get(a.employee_id) || { days: 0, hours: 0 };
          rec.days++;
          if (a.check_in && a.check_out) rec.hours += hoursBetween(a.check_in, a.check_out);
          perEmp.set(a.employee_id, rec);
        });

        let projNet = 0, projBrut = 0, projAvantages = 0, projRetenues = 0, projAgents = 0;
        const emps = (empsFull.data || []) as any[];
        emps.forEach((e: any) => {
          const p = perEmp.get(e.id);
          if (!p || p.days === 0) return;
          const rate = num(e.hourly_rate) || (num(e.base_salary) / 160);
          const daily = rate * STD_HOURS_PER_DAY;
          const brut = +(p.days * daily).toFixed(2);
          const heuresSupPay = 0;
          const avantages = 0;
          const assiette = brut;
          const cnss = +(brut * 0.05).toFixed(2);
          const ipr = computeIPR(assiette);
          const inpp = +(brut * 0.03).toFixed(2);
          const onem = +(brut * 0.002).toFixed(2);
          const retenues = +(cnss + ipr + inpp + onem).toFixed(2);
          const net = +(brut + avantages - retenues).toFixed(2);
          projNet += net;
          projBrut += brut;
          projAvantages += avantages;
          projRetenues += retenues;
          projAgents++;
        });
        setData({
          // Payroll existant
          totalNet: totalNetPayroll, totalBrut: totalBrutPayroll,
          totalAvantages: totalAvantagesPayroll, totalRetenues: totalRetenuesPayroll,
          chargesPatronales, paid, pending, validated,
          avgNet: avgNetPayroll, couverture, evolution,
          period, bulletins: current.length,
          // Projection
          projNet, projBrut, projAvantages, projRetenues, projAgents,
          projWorkableDays: workableDays,
          hasProjection: current.length === 0 && projAgents > 0,
        });
=======
        const evolution = totalPrev > 0 ? Math.round(((totalNet - totalPrev) / totalPrev) * 100) : 0;
        setData({ totalNet, totalBrut, totalAvantages, totalRetenues, chargesPatronales, bruteContractuelle, contrats, paid, pending, validated, avgNet, couverture, evolution, period, bulletins: current.length, agentsPointes: hoursByEmp.size });

>>>>>>> f25310942e1346fa0eacb68408396bb021e519d7
      } else {
        const [emp, empActive, att, leaves, jobs, cand, train, pay] = await Promise.all([
          supabase.from("employees").select("id", { count: "exact", head: true }),
          supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("attendance").select("id", { count: "exact", head: true }).eq("date", today).eq("status", "present"),
          supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("job_offers").select("id", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("candidates").select("id", { count: "exact", head: true }),
          supabase.from("trainings").select("id", { count: "exact", head: true }),
          supabase.from("payroll").select("net_pay").eq("period", period),
        ]);
        const masse = (pay.data || []).reduce((s: number, r: any) => s + Number(r.net_pay || 0), 0);
        const totalActifs = empActive.count ?? 0;
        const taux = totalActifs > 0 ? Math.round(((att.count ?? 0) / totalActifs) * 100) : 0;
        setData({
          employees: emp.count ?? 0, activeEmployees: totalActifs,
          presentToday: att.count ?? 0, tauxPresence: taux,
          pendingLeaves: leaves.count ?? 0, openJobs: jobs.count ?? 0,
          candidates: cand.count ?? 0, trainings: train.count ?? 0, masse,
        });
      }
      setLastUpdate(new Date());
    } catch (e) { console.error("LiveStats reload error:", e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    reload();
    const tables =
      variant === "presence" ? ["attendance", "leave_requests", "employees"]
      : variant === "paie" ? ["payroll", "employees", "attendance"]
      : ["employees", "attendance", "leave_requests", "payroll", "job_offers", "candidates", "trainings"];

    const ch = supabase.channel(`live-stats-${variant}`);
    tables.forEach((t) => {
      ch.on("postgres_changes", { event: "*", schema: "public", table: t }, () => {
        setPulse({ key: t, ts: Date.now() });
        reload();
      });
    });
    ch.subscribe();
    const interval = setInterval(reload, 60_000); // filet de sécurité
    return () => { supabase.removeChannel(ch); clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
<<<<<<< HEAD
  }, [variant, paiePeriod]);
=======
  }, [variant, period]);
>>>>>>> f25310942e1346fa0eacb68408396bb021e519d7

  const pulsing = pulse && Date.now() - pulse.ts < 2000;

  const header = (
    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
      <div className="flex items-center gap-2">
        <div className="relative">
          <span className={cn("inline-block h-2.5 w-2.5 rounded-full bg-emerald-500", pulsing && "animate-ping absolute")} />
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </div>
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Temps réel</span>
        <Badge variant="outline" className="text-[10px] font-mono">
          {lastUpdate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </Badge>
      </div>
      {loading && <span className="text-[11px] text-muted-foreground animate-pulse">Synchronisation…</span>}
    </div>
  );

  if (variant === "presence") {
    return (
      <div>
        {header}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <Kpi icon={UserCheck} label="Présents" value={data.present ?? 0} color="from-emerald-500 to-emerald-600" tone="emerald" />
          <Kpi icon={UserX} label="Absents" value={data.absents ?? 0} color="from-rose-500 to-rose-600" tone="rose" />
          <Kpi icon={Timer} label="Retards" value={data.retards ?? 0} hint="après 8h15" color="from-amber-500 to-amber-600" tone="amber" />
          <Kpi icon={Briefcase} label="En mission" value={data.enMission ?? 0} color="from-indigo-500 to-indigo-600" tone="indigo" />
          <Kpi icon={Activity} label="Actifs au bureau" value={data.inOffice ?? 0} hint="non sortis" color="from-cyan-500 to-cyan-600" tone="cyan" />
          <Kpi icon={Calendar} label="Congés à valider" value={data.pendingLeaves ?? 0} color="from-violet-500 to-violet-600" tone="violet" />
          <Gauge label="Taux de présence" value={data.tauxPresence ?? 0} total={data.totalActifs ?? 0} />
        </div>
      </div>
    );
  }

  if (variant === "paie") {
    const evo = Number(data.evolution || 0);
    const totalNet = data.hasProjection ? (data.projNet || 0) : (data.totalNet || 0);
    const totalBrut = data.hasProjection ? (data.projBrut || 0) : (data.totalBrut || 0);
    const totalAvantages = data.hasProjection ? (data.projAvantages || 0) : (data.totalAvantages || 0);
    const totalRetenues = data.hasProjection ? (data.projRetenues || 0) : (data.totalRetenues || 0);
    const agentsCount = data.hasProjection ? (data.projAgents || 0) : (data.bulletins || 0);
    const avgNet = data.hasProjection && agentsCount > 0 ? totalNet / agentsCount : (data.avgNet || 0);
    const title = data.hasProjection ? "Projection Pré-Paie" : "Masse salariale nette";
    // Calculer les détails des retenues projetées
    const getDedDetail = () => {
      if (!data.hasProjection) return null;
      const net = data.projNet || 0;
      const brut = data.projBrut || 0;
      return {
        cnss: +(brut * 0.05).toFixed(2),
        ipr: computeIPR(brut),
        inpp: +(brut * 0.03).toFixed(2),
        onem: +(brut * 0.002).toFixed(2),
      };
    };
    const ded = getDedDetail();
    return (
      <div>
        {header}
<<<<<<< HEAD
        <div className="flex items-center gap-2 mb-3">
          <input
            type="month"
            value={paiePeriod}
            onChange={(e) => setPaiePeriod(e.target.value)}
            className="h-8 text-sm rounded-md border bg-background px-2"
          />
          <Badge variant={data.hasProjection ? "secondary" : "default"} className="text-[10px]">
            {data.hasProjection ? `Projection · ${data.projAgents} agent(s)` : `${data.bulletins ?? 0} bulletin(s)`}
          </Badge>
          {data.hasProjection && (
            <Badge variant="outline" className="text-[10px]">
              {data.projWorkableDays ?? 0} jours ouvrés
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
=======
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
>>>>>>> f25310942e1346fa0eacb68408396bb021e519d7
          <Card className="p-4 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-0 shadow-md">
            <div className="flex items-center justify-between">
              <Wallet className="h-5 w-5 opacity-90" />
              {evo !== 0 && !data.hasProjection && (
                <Badge variant="secondary" className="bg-white/20 text-white border-0 text-[10px]">
                  {evo > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                  {evo > 0 ? "+" : ""}{evo}%
                </Badge>
              )}
            </div>
<<<<<<< HEAD
            <p className="text-[10px] uppercase tracking-wider opacity-80 mt-3">{title} · {data.period}</p>
            <p className="text-2xl font-bold mt-1">{fmtCDF(totalNet)}</p>
            <p className="text-[11px] opacity-80 mt-1">{agentsCount} agent(s)</p>
          </Card>
          <Kpi icon={DollarSign} label="Brut cumulé" value={fmtCDF(totalBrut)} color="from-slate-700 to-slate-900" tone="slate" big />
          <Kpi icon={TrendingUp} label="Avantages" value={fmtCDF(totalAvantages)} color="from-blue-500 to-blue-600" tone="blue" big />
          <Kpi icon={TrendingDown} label="Retenues" value={fmtCDF(totalRetenues)} hint={ded ? `Détail: CNSS ${fmtCDF(ded.cnss)} · IPR ${fmtCDF(ded.ipr)} · INPP ${fmtCDF(ded.inpp)} · ONEM ${fmtCDF(ded.onem)}` : `+ ${fmtCDF(data.chargesPatronales ?? 0)} patronal`} color="from-rose-500 to-rose-600" tone="rose" big />
=======
            <p className="text-[10px] uppercase tracking-wider opacity-80 mt-3">Masse nette à payer · {data.period}</p>
            <p className="text-2xl font-bold mt-1">{fmtCDF(data.totalNet ?? 0)}</p>
            <p className="text-[11px] opacity-80 mt-1">{data.bulletins ?? 0} bulletin(s) · {data.agentsPointes ?? 0} agent(s) pointé(s)</p>
          </Card>
          <Kpi icon={Building2} label="Brute contractuelle" value={fmtCDF(data.bruteContractuelle ?? 0)} hint={`${data.contrats ?? 0} contrat(s)`} color="from-indigo-600 to-indigo-800" tone="indigo" big />
          <Kpi icon={DollarSign} label="Brut cumulé (période)" value={fmtCDF(data.totalBrut ?? 0)} color="from-slate-700 to-slate-900" tone="slate" big />
          <Kpi icon={TrendingUp} label="Avantages globaux" value={fmtCDF(data.totalAvantages ?? 0)} hint="Transport · prime · logement" color="from-blue-500 to-blue-600" tone="blue" big />
          <Kpi icon={TrendingDown} label="Retenues globales" value={fmtCDF(data.totalRetenues ?? 0)} hint={`+ ${fmtCDF(data.chargesPatronales ?? 0)} patronal`} color="from-rose-500 to-rose-600" tone="rose" big />
>>>>>>> f25310942e1346fa0eacb68408396bb021e519d7
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Mini label="Net moyen" value={fmtCDF(avgNet)} />
          {!data.hasProjection && <Mini label="Payés" value={data.paid ?? 0} tone="emerald" />}
          {!data.hasProjection && <Mini label="Validés" value={data.validated ?? 0} tone="blue" />}
          {!data.hasProjection && <Mini label="En attente" value={data.pending ?? 0} tone="amber" />}
          {!data.hasProjection && <Mini label="Couverture" value={`${data.couverture ?? 0}%`} hint="bulletins/actifs" />}
          {data.hasProjection && (
            <>
              <Mini label="Agents avec présence" value={String(data.projAgents ?? 0)} tone="emerald" />
              <Mini label="Jours ouvrés" value={String(data.projWorkableDays ?? 0)} tone="blue" />
              {ded && <Mini label="Total retenues légales" value={fmtCDF(ded.cnss + ded.ipr + ded.inpp + ded.onem)} tone="amber" />}
            </>
          )}
        </div>
      </div>
    );
  }

  // global
  return (
    <div>
      {header}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <Kpi icon={Users} label="Effectif" value={data.employees ?? 0} hint={`${data.activeEmployees ?? 0} actifs`} color="from-blue-500 to-blue-600" tone="blue" />
        <Kpi icon={UserCheck} label="Présents jour" value={data.presentToday ?? 0} color="from-emerald-500 to-emerald-600" tone="emerald" />
        <Gauge label="Présence" value={data.tauxPresence ?? 0} total={data.activeEmployees ?? 0} />
        <Kpi icon={AlertCircle} label="Congés" value={data.pendingLeaves ?? 0} hint="en attente" color="from-amber-500 to-amber-600" tone="amber" />
        <Kpi icon={Briefcase} label="Postes ouverts" value={data.openJobs ?? 0} color="from-orange-500 to-orange-600" tone="orange" />
        <Kpi icon={FileCheck} label="Candidats" value={data.candidates ?? 0} color="from-indigo-500 to-indigo-600" tone="indigo" />
        <Kpi icon={GraduationCap} label="Formations" value={data.trainings ?? 0} color="from-violet-500 to-violet-600" tone="violet" />
        <Kpi icon={Wallet} label="Masse mois" value={fmtCDF(data.masse ?? 0)} color="from-slate-700 to-slate-900" tone="slate" big />
      </div>
    </div>
  );
}

const toneRing: Record<string, string> = {
  emerald: "ring-emerald-500/20", rose: "ring-rose-500/20", amber: "ring-amber-500/20",
  indigo: "ring-indigo-500/20", cyan: "ring-cyan-500/20", violet: "ring-violet-500/20",
  blue: "ring-blue-500/20", orange: "ring-orange-500/20", slate: "ring-slate-500/20",
};

function Kpi({ icon: Icon, label, value, hint, color, tone, big }: any) {
  return (
    <Card className={cn("p-4 transition-all hover:shadow-md hover:-translate-y-0.5 ring-1", toneRing[tone])}>
      <div className={cn("inline-flex p-2 rounded-lg bg-gradient-to-br text-white mb-2", color)}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className={cn("font-bold leading-tight mt-0.5", big ? "text-base" : "text-2xl")}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </Card>
  );
}

function Mini({ label, value, hint, tone }: { label: string; value: any; hint?: string; tone?: string }) {
  const toneText: Record<string, string> = {
    emerald: "text-emerald-600", blue: "text-blue-600", amber: "text-amber-600",
  };
  return (
    <Card className="p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className={cn("text-lg font-bold mt-1", tone && toneText[tone])}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function Gauge({ label, value, total }: { label: string; value: number; total: number }) {
  const color = value >= 80 ? "from-emerald-500 to-emerald-600" : value >= 50 ? "from-amber-500 to-amber-600" : "from-rose-500 to-rose-600";
  return (
    <Card className="p-4 ring-1 ring-primary/10 col-span-2 md:col-span-1">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <div className="flex items-end justify-between mt-1">
        <p className="text-2xl font-bold">{value}%</p>
        {total > 0 && <p className="text-[10px] text-muted-foreground">/ {total}</p>}
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full bg-gradient-to-r transition-all duration-700", color)} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </Card>
  );
}
