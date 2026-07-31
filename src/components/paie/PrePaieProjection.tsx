import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  DollarSign, Users, Clock, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Eye, EyeOff, FileText, Ban, Table, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend,
} from "recharts";

const fmtUSD = (n: number) =>
  "$ " + new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

const currentPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const periodLabel = (p: string) => {
  const [y, m] = p.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());
};

interface AgentData {
  id: string;
  first_name: string;
  last_name: string;
  matricule: string | null;
  position: string | null;
  base_salary: number | null;
  hourly_rate: number | null;
  days_worked: number;
  presence_rate: number;
  total_hours: number;
  brut: number;
  cnss: number;
  ipr: number;
  inpp: number;
  onem: number;
  net: number;
  status: string;
}

interface PayrollRow {
  id: string;
  employee_id: string;
  period: string;
  base_salary: number;
  net_pay: number;
  cnss: number;
  ipr: number;
  inpp: number;
  onem: number;
  bonus: number;
  deductions: number;
  status: string;
}

interface AttendanceRow {
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
}

export function PrePaieProjection() {
  const [period, setPeriod] = useState(currentPeriod());
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  const [showTable, setShowTable] = useState(true);

  // Load all data for the projection
  const loadProjection = async () => {
    setLoading(true);
    try {
      const [y, m] = period.split("-").map(Number);
      const startDate = `${period}-01`;
      const endDate = new Date(y, m, 0).toISOString().slice(0, 10);

      // Fetch employees, attendance, and payroll for the period
      const [{ data: employees }, { data: attendance }, { data: payroll }] = await Promise.all([
        supabase.from("employees").select("id,first_name,last_name,matricule,position,base_salary,hourly_rate"),
        supabase.from("attendance")
          .select("employee_id,date,check_in,check_out,status")
          .gte("date", startDate)
          .lte("date", endDate),
        supabase.from("payroll")
          .select("id,employee_id,period,base_salary,net_pay,cnss,ipr,inpp,onem,bonus,deductions,status")
          .eq("period", period),
      ]);

      const payrollMap = new Map<string, PayrollRow>();
      (payroll as PayrollRow[] || []).forEach((p) => payrollMap.set(p.employee_id, p));

      // Build attendance stats per employee
      const attMap = new Map<string, { days: Set<string>; totalHours: number; statuses: string[] }>();
      (attendance as AttendanceRow[] || []).forEach((a) => {
        let rec = attMap.get(a.employee_id);
        if (!rec) {
          rec = { days: new Set(), totalHours: 0, statuses: [] };
          attMap.set(a.employee_id, rec);
        }
        rec.days.add(a.date);
        rec.statuses.push(a.status);
        if (a.check_in && a.check_out) {
          const [h1, m1] = String(a.check_in).split(":").map(Number);
          const [h2, m2] = String(a.check_out).split(":").map(Number);
          const diff = (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
          if (diff > 0) rec.totalHours += diff;
        }
      });

      // Working days in month
      let workingDays = 0;
      for (let d = new Date(y, m - 1, 1); d.getMonth() === m - 1; d.setDate(d.getDate() + 1)) {
        const dow = d.getDay();
        if (dow !== 0 && dow !== 6) workingDays++;
      }

      const result: AgentData[] = (employees as any[] || []).map((emp) => {
        const att = attMap.get(emp.id);
        const pay = payrollMap.get(emp.id);
        const daysWorked = att ? att.days.size : 0;
        const presenceRate = workingDays > 0 ? Math.round((daysWorked / workingDays) * 100) : 0;
        const totalHours = att ? Math.round(att.totalHours * 100) / 100 : 0;

        // Calculate salary components
        const baseSalary = Number(emp.base_salary || 0);
        const hourlyRate = Number(emp.hourly_rate || 0);
        let brut = 0;
        if (baseSalary > 0) {
          brut = baseSalary;
        } else if (hourlyRate > 0 && totalHours > 0) {
          brut = Number((totalHours * hourlyRate).toFixed(2));
        }

        // If 0 days present, all amounts are 0
        const effectiveBrut = daysWorked === 0 ? 0 : brut;
        const cnss = Number((effectiveBrut * 0.05).toFixed(2));
        const ipr = Number((effectiveBrut * 0.15).toFixed(2)); // simplified IPR
        const inpp = Number((effectiveBrut * 0.03).toFixed(2));
        const onem = Number((effectiveBrut * 0.002).toFixed(2));
        const retenues = cnss + ipr + inpp + onem;
        const net = Number((effectiveBrut - retenues).toFixed(2));

        return {
          id: emp.id,
          first_name: emp.first_name,
          last_name: emp.last_name,
          matricule: emp.matricule,
          position: emp.position,
          base_salary: emp.base_salary,
          hourly_rate: emp.hourly_rate,
          days_worked: daysWorked,
          presence_rate: presenceRate,
          total_hours: totalHours,
          brut: effectiveBrut,
          cnss,
          ipr,
          inpp,
          onem,
          net,
          status: pay?.status || (daysWorked > 0 ? "en_attente" : "absent"),
        };
      });

      setAgents(result);
    } catch (err: any) {
      console.error("[PrePaieProjection] Error:", err);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjection();
  }, [period]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("prepaie-projection")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => loadProjection())
      .on("postgres_changes", { event: "*", schema: "public", table: "payroll" }, () => loadProjection())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [period]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(loadProjection, 60000);
    return () => clearInterval(interval);
  }, [period]);

  // Global statistics
  const stats = useMemo(() => {
    const totalBrut = agents.reduce((s, a) => s + a.brut, 0);
    const totalNet = agents.reduce((s, a) => s + a.net, 0);
    const totalCnss = agents.reduce((s, a) => s + a.cnss, 0);
    const totalIpr = agents.reduce((s, a) => s + a.ipr, 0);
    const totalInpp = agents.reduce((s, a) => s + a.inpp, 0);
    const totalOnem = agents.reduce((s, a) => s + a.onem, 0);
    const presentAgents = agents.filter((a) => a.days_worked > 0).length;
    const avgPresence = agents.length > 0
      ? Math.round(agents.reduce((s, a) => s + a.presence_rate, 0) / agents.length)
      : 0;
    const totalHours = agents.reduce((s, a) => s + a.total_hours, 0);
    const assidus = agents.filter((a) => a.presence_rate >= 95).length;

    return {
      totalBrut,
      totalNet,
      totalRetenues: totalCnss + totalIpr + totalInpp + totalOnem,
      totalIpr,
      presentAgents,
      avgPresence,
      totalHours,
      assidus,
      totalCnss,
      totalInpp,
      totalOnem,
    };
  }, [agents]);

  const paidCount = agents.filter((a) => a.status === "paye").length;
  const validatedCount = agents.filter((a) => a.status === "valide").length;
  const pendingCount = agents.filter((a) => a.status === "en_attente").length;

  return (
    <div className="space-y-4">
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Pré-Paie Projection — {periodLabel(period)}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                return <SelectItem key={p} value={p}>{periodLabel(p)}</SelectItem>;
              })}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTable(!showTable)}
            className="gap-2"
          >
            {showTable ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showTable ? "Masquer tableau" : "Afficher tableau"}
          </Button>
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Calcul en cours…
        </div>
      )}

      {/* 8 Global Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<DollarSign className="h-4 w-4" />} label="Masse Brute" value={fmtUSD(stats.totalBrut)} color="blue" />
        <StatCard icon={<DollarSign className="h-4 w-4" />} label="Masse Nette" value={fmtUSD(stats.totalNet)} color="emerald" />
        <StatCard icon={<DollarSign className="h-4 w-4" />} label="Total Retenues" value={fmtUSD(stats.totalRetenues)} color="amber" />
        <StatCard icon={<DollarSign className="h-4 w-4" />} label="IPR Total" value={fmtUSD(stats.totalIpr)} color="rose" />
        <StatCard icon={<Users className="h-4 w-4" />} label="Agents avec présence" value={String(stats.presentAgents)} color="indigo" />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Présence moyenne" value={`${stats.avgPresence}%`} color="violet" />
        <StatCard icon={<Clock className="h-4 w-4" />} label="Heures totales" value={`${Math.round(stats.totalHours)} h`} color="cyan" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Assidus ≥95%" value={String(stats.assidus)} color="teal" />
      </div>

      {/* Détail des retenues */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-primary" />
          <h4 className="font-semibold">Détail des retenues</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <RetenueCard label="CNSS (5%)" value={fmtUSD(stats.totalCnss)} color="orange" />
          <RetenueCard label="IPR (progressif)" value={fmtUSD(stats.totalIpr)} color="red" />
          <RetenueCard label="INPP (3%)" value={fmtUSD(stats.totalInpp)} color="purple" />
          <RetenueCard label="ONEM (0.2%)" value={fmtUSD(stats.totalOnem)} color="pink" />
          <RetenueCard label="Total Retenues" value={fmtUSD(stats.totalRetenues)} color="amber" />
          <RetenueCard label="Net Global" value={fmtUSD(stats.totalNet)} color="emerald" />
        </div>
      </Card>

      {/* Agent Summary */}
      <div className="flex items-center gap-3 text-sm">
        <Badge variant="default">Payés: {paidCount}</Badge>
        <Badge variant="secondary">Validés: {validatedCount}</Badge>
        <Badge variant="outline">En attente: {pendingCount}</Badge>
        <Badge variant="destructive">Absents: {agents.filter((a) => a.status === "absent").length}</Badge>
      </div>

      {/* Agent Table */}
      {showTable && (
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Table className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Tableau des agents — {agents.length} employés</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Agent</th>
                  <th className="text-left px-4 py-3">Matricule</th>
                  <th className="text-center px-4 py-3">Jours</th>
                  <th className="text-center px-4 py-3">Présence</th>
                  <th className="text-right px-4 py-3">Brut</th>
                  <th className="text-right px-4 py-3">CNSS</th>
                  <th className="text-right px-4 py-3">IPR</th>
                  <th className="text-right px-4 py-3">INPP</th>
                  <th className="text-right px-4 py-3">ONEM</th>
                  <th className="text-right px-4 py-3">Net</th>
                  <th className="text-center px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {agents.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                      {loading ? "Chargement des données…" : "Aucun employé trouvé"}
                    </td>
                  </tr>
                )}
                {agents.map((agent) => (
                  <tr
                    key={agent.id}
                    className="border-t hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => setSelectedAgent(agent)}
                  >
                    <td className="px-4 py-2.5 font-medium">
                      {agent.last_name} {agent.first_name}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{agent.matricule || "—"}</td>
                    <td className="px-4 py-2.5 text-center">{agent.days_worked}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={agent.presence_rate >= 95 ? "text-emerald-600 font-semibold" : agent.presence_rate >= 70 ? "text-amber-600" : "text-red-500"}>
                        {agent.presence_rate}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold">{fmtUSD(agent.brut)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtUSD(agent.cnss)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtUSD(agent.ipr)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtUSD(agent.inpp)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtUSD(agent.onem)}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-primary">{fmtUSD(agent.net)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <StatusBadge status={agent.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Agent Detail Dialog */}
      <AgentDetailDialog
        agent={selectedAgent}
        onClose={() => setSelectedAgent(null)}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paye") return <Badge className="bg-emerald-600">Payé</Badge>;
  if (status === "valide") return <Badge variant="secondary">Validé</Badge>;
  if (status === "en_attente") return <Badge variant="outline">En attente</Badge>;
  return <Badge variant="destructive">Absent</Badge>;
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "border-blue-500/30 bg-blue-500/5",
    emerald: "border-emerald-500/30 bg-emerald-500/5",
    amber: "border-amber-500/30 bg-amber-500/5",
    rose: "border-rose-500/30 bg-rose-500/5",
    indigo: "border-indigo-500/30 bg-indigo-500/5",
    violet: "border-violet-500/30 bg-violet-500/5",
    cyan: "border-cyan-500/30 bg-cyan-500/5",
    teal: "border-teal-500/30 bg-teal-500/5",
  };
  return (
    <div className={`rounded-lg border ${colorMap[color] || "border-gray-200"} p-4`}>
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function RetenueCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    orange: "border-orange-500/30 bg-orange-500/5",
    red: "border-red-500/30 bg-red-500/5",
    purple: "border-purple-500/30 bg-purple-500/5",
    pink: "border-pink-500/30 bg-pink-500/5",
    amber: "border-amber-500/30 bg-amber-500/5",
    emerald: "border-emerald-500/30 bg-emerald-500/5",
  };
  return (
    <div className={`rounded-lg border ${colorMap[color] || "border-gray-200"} p-3 text-center`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-lg font-bold mt-1">{value}</p>
    </div>
  );
}

function AgentDetailDialog({ agent, onClose }: { agent: AgentData | null; onClose: () => void }) {
  const hoursNormales = agent ? Math.min(agent.total_hours, 160) : 0;
  const heuresSup = agent ? Math.max(0, agent.total_hours - 160) : 0;
  const [advance, setAdvance] = useState(0);
  const [otherDeductions, setOtherDeductions] = useState(0);
  const updatedNet = agent ? Number((agent.brut - agent.cnss - agent.ipr - agent.inpp - agent.onem - advance - otherDeductions).toFixed(2)) : 0;

  return (
    <Dialog open={!!agent} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {agent?.last_name} {agent?.first_name}
            {agent?.matricule && <span className="ml-2 font-mono text-xs text-muted-foreground">({agent.matricule})</span>}
          </DialogTitle>
        </DialogHeader>
        {agent && (
          <div className="space-y-4">
            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-card p-3">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Présence</p>
                <p className="text-lg font-bold">{agent.days_worked}j / {agent.presence_rate}%</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Salaire Brut</p>
                <p className="text-lg font-bold text-blue-600">{fmtUSD(agent.brut)}</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Total Retenues</p>
                <p className="text-lg font-bold text-amber-600">{fmtUSD(agent.cnss + agent.ipr + agent.inpp + agent.onem)}</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Net à Payer</p>
                <p className="text-lg font-bold text-emerald-600">{fmtUSD(agent.net)}</p>
              </div>
            </div>

            {/* Presence detail */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Détail de présence</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="rounded border p-2 text-center">
                  <p className="text-xs text-muted-foreground">Heures normales</p>
                  <p className="font-semibold">{hoursNormales}h</p>
                </div>
                <div className="rounded border p-2 text-center">
                  <p className="text-xs text-muted-foreground">Heures sup.</p>
                  <p className="font-semibold text-amber-600">{heuresSup}h</p>
                </div>
                <div className="rounded border p-2 text-center">
                  <p className="text-xs text-muted-foreground">Jours prestés</p>
                  <p className="font-semibold">{agent.days_worked}</p>
                </div>
              </div>
            </div>

            {/* Salary */}
            <div className="rounded-lg border p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Salaire brut</span>
                <span className="font-semibold">{fmtUSD(agent.brut)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CNSS (5%)</span>
                <span className="text-red-500">- {fmtUSD(agent.cnss)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IPR</span>
                <span className="text-red-500">- {fmtUSD(agent.ipr)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">INPP (3%)</span>
                <span className="text-red-500">- {fmtUSD(agent.inpp)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ONEM (0.2%)</span>
                <span className="text-red-500">- {fmtUSD(agent.onem)}</span>
              </div>
            </div>

            {/* Editable deductions */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Retenues supplémentaires</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Avances / Acompte</label>
                  <input
                    type="number"
                    value={advance}
                    onChange={(e) => setAdvance(Number(e.target.value) || 0)}
                    className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Autres retenues</label>
                  <input
                    type="number"
                    value={otherDeductions}
                    onChange={(e) => setOtherDeductions(Number(e.target.value) || 0)}
                    className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Updated net */}
            <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Net à payer (actualisé)</span>
                <span className="text-xl font-bold text-primary">{fmtUSD(updatedNet)}</span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Fermer</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
