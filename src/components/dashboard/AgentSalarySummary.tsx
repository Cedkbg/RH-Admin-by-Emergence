import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Award, Minus, AlertTriangle, AlertOctagon, Users, FileText, Clock } from "lucide-react";

interface Employee { id: string; first_name: string; last_name: string; matricule: string | null; }
interface PayRow { employee_id: string; net_pay: number | null; period: string; }
interface AttRow { employee_id: string; date: string; status: string | null; check_in: string | null; check_out: string | null; }
interface JustRow { id: string; employee_id: string; period: string; reason: string; status: string; created_at: string; }

const fmtUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(n || 0)) + " USD";

const periodKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

type Mention = "excellent" | "moyenne" | "faible" | "tres_faible";

const mentionFor = (att: number): Mention => {
  if (att >= 100) return "excellent";
  if (att > 60) return "moyenne";
  if (att >= 50) return "faible";
  return "tres_faible";
};

const MentionBadge = ({ m }: { m: Mention }) => {
  if (m === "excellent")
    return <Badge className="bg-emerald-600 hover:bg-emerald-700 gap-1"><Award className="h-3 w-3" />Excellent(e)</Badge>;
  if (m === "moyenne")
    return <Badge variant="secondary" className="gap-1"><Minus className="h-3 w-3" />Moyenne</Badge>;
  if (m === "faible")
    return <Badge variant="destructive" className="gap-1 bg-orange-500 hover:bg-orange-600"><AlertTriangle className="h-3 w-3" />Faible</Badge>;
  return <Badge variant="destructive" className="gap-1"><AlertOctagon className="h-3 w-3" />Très faible</Badge>;
};

const hoursBetween = (ci: string | null, co: string | null) => {
  if (!ci || !co) return 0;
  const [h1, m1] = ci.split(":").map(Number);
  const [h2, m2] = co.split(":").map(Number);
  return Math.max(0, ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60);
};

interface Props {
  selectedAgentId?: string | null;
  onSelectAgent?: (id: string | null) => void;
}

export function AgentSalarySummary({ selectedAgentId, onSelectAgent }: Props) {
  const [rows, setRows] = useState<(Employee & { salary: number; attendance: number; hours: number; mention: Mention })[]>([]);
  const [justByEmp, setJustByEmp] = useState<Map<string, JustRow[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [openAgent, setOpenAgent] = useState<Employee | null>(null);

  useEffect(() => {
    (async () => {
      const p = periodKey();
      const monthStart = `${p}-01`;
      const [y, m] = p.split("-").map(Number);
      const monthEnd = new Date(y, m, 0).toISOString().slice(0, 10);

      const [{ data: emps }, { data: pays }, { data: att }, { data: justs }] = await Promise.all([
        supabase.from("employees").select("id,first_name,last_name,matricule").eq("status", "active").order("last_name"),
        supabase.from("payroll").select("employee_id,net_pay,period").eq("period", p),
        supabase.from("attendance").select("employee_id,date,status,check_in,check_out").gte("date", monthStart).lte("date", monthEnd),
        supabase.from("absence_justifications").select("id,employee_id,period,reason,status,created_at").eq("period", p),
      ]);

      const payMap = new Map<string, number>();
      (pays as PayRow[] || []).forEach((r) => {
        payMap.set(r.employee_id, (payMap.get(r.employee_id) || 0) + Number(r.net_pay || 0));
      });

      const workingDays = (() => {
        let n = 0;
        for (let d = new Date(y, m - 1, 1); d.getMonth() === m - 1; d.setDate(d.getDate() + 1)) {
          const dow = d.getDay();
          if (dow !== 0 && dow !== 6) n++;
        }
        return n;
      })();

      const presentByEmp = new Map<string, number>();
      const hoursByEmp = new Map<string, number>();
      (att as AttRow[] || []).forEach((a) => {
        if (a.status === "present" || a.status === "mission" || a.status === "deplacement") {
          presentByEmp.set(a.employee_id, (presentByEmp.get(a.employee_id) || 0) + 1);
        }
        const h = hoursBetween(a.check_in, a.check_out);
        if (h > 0) hoursByEmp.set(a.employee_id, (hoursByEmp.get(a.employee_id) || 0) + h);
      });

      const jMap = new Map<string, JustRow[]>();
      (justs as JustRow[] || []).forEach((j) => {
        const arr = jMap.get(j.employee_id) || [];
        arr.push(j);
        jMap.set(j.employee_id, arr);
      });
      setJustByEmp(jMap);

      const out = (emps as Employee[] || []).map((e) => {
        const worked = presentByEmp.get(e.id) || 0;
        const attendance = workingDays > 0 ? Math.round((worked / workingDays) * 100) : 0;
        const salary = payMap.get(e.id) || 0;
        const hours = +(hoursByEmp.get(e.id) || 0).toFixed(1);
        return { ...e, salary, attendance, hours, mention: mentionFor(attendance) };
      });
      setRows(out);
      setLoading(false);
    })();
  }, []);

  const counts = useMemo(() => ({
    excellent: rows.filter((r) => r.mention === "excellent").length,
    moyenne: rows.filter((r) => r.mention === "moyenne").length,
    faible: rows.filter((r) => r.mention === "faible").length,
    tres_faible: rows.filter((r) => r.mention === "tres_faible").length,
  }), [rows]);

  return (
    <Card className="p-5 ring-1 ring-primary/10">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1.5 rounded-md bg-gradient-to-br from-primary to-primary/70 text-white">
            <Users className="h-4 w-4" />
          </div>
          <h3 className="font-semibold text-base">Performance des agents — {periodKey()}</h3>
          {selectedAgentId && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onSelectAgent?.(null)}>
              Réinitialiser sélection
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge className="bg-emerald-600">{counts.excellent} Excellent</Badge>
          <Badge variant="secondary">{counts.moyenne} Moyenne</Badge>
          <Badge className="bg-orange-500 hover:bg-orange-600">{counts.faible} Faible</Badge>
          <Badge variant="destructive">{counts.tres_faible} Très faible</Badge>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        Cliquez sur un agent pour voir son graphique de performance ci-dessous.
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-2 text-left">Agent</th>
              <th className="p-2 text-right">Salaire net</th>
              <th className="p-2 text-right">Heures</th>
              <th className="p-2 text-right">Présence</th>
              <th className="p-2 text-right">Mention</th>
              <th className="p-2 text-right">Justifications</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Chargement…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Aucun agent actif.</td></tr>
            ) : rows.map((r) => {
              const justs = justByEmp.get(r.id) || [];
              const isSel = selectedAgentId === r.id;
              return (
                <tr
                  key={r.id}
                  className={`border-t cursor-pointer transition-colors ${isSel ? "bg-primary/10" : "hover:bg-muted/40"}`}
                  onClick={() => onSelectAgent?.(isSel ? null : r.id)}
                >
                  <td className="p-2">
                    <div className="font-semibold">{r.first_name} {r.last_name}</div>
                    {r.matricule && <div className="text-[10px] font-mono text-muted-foreground">{r.matricule}</div>}
                  </td>
                  <td className="p-2 text-right font-bold text-primary">{fmtUSD(r.salary)}</td>
                  <td className="p-2 text-right">
                    <span className="inline-flex items-center gap-1 font-mono text-xs">
                      <Clock className="h-3 w-3 text-muted-foreground" />{r.hours} h
                    </span>
                  </td>
                  <td className="p-2 text-right">
                    <Badge variant={r.attendance >= 100 ? "default" : r.attendance > 60 ? "secondary" : "destructive"}>
                      {r.attendance}%
                    </Badge>
                  </td>
                  <td className="p-2 text-right"><MentionBadge m={r.mention} /></td>
                  <td className="p-2 text-right">
                    {justs.length > 0 ? (
                      <Button
                        size="sm" variant="outline" className="h-7 text-xs gap-1"
                        onClick={(e) => { e.stopPropagation(); setOpenAgent(r); }}
                      >
                        <FileText className="h-3 w-3" />{justs.length}
                      </Button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!openAgent} onOpenChange={(o) => !o && setOpenAgent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Justifications — {openAgent?.first_name} {openAgent?.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {(openAgent ? (justByEmp.get(openAgent.id) || []) : []).map((j) => (
              <div key={j.id} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono">{j.period}</Badge>
                  <Badge variant={j.status === "approved" ? "default" : j.status === "rejected" ? "destructive" : "secondary"} className="text-[10px]">
                    {j.status}
                  </Badge>
                </div>
                <p className="text-sm">{j.reason}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(j.created_at).toLocaleString("fr-FR")}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
