import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Award, Minus, AlertTriangle, Users } from "lucide-react";

interface Employee { id: string; first_name: string; last_name: string; matricule: string | null; }
interface PayRow { employee_id: string; net_pay: number | null; period: string; }
interface AttRow { employee_id: string; date: string; status: string | null; }

const fmtUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(n || 0)) + " USD";

const period = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

type Mention = "excellent" | "moyenne" | "faible";

const mentionFor = (attendance: number, hasPay: boolean): Mention => {
  if (!hasPay) return attendance >= 90 ? "excellent" : attendance >= 70 ? "moyenne" : "faible";
  if (attendance >= 90) return "excellent";
  if (attendance >= 70) return "moyenne";
  return "faible";
};

const MentionBadge = ({ m }: { m: Mention }) => {
  if (m === "excellent")
    return <Badge className="bg-emerald-600 hover:bg-emerald-700 gap-1"><Award className="h-3 w-3" />Excellent(e)</Badge>;
  if (m === "moyenne")
    return <Badge variant="secondary" className="gap-1"><Minus className="h-3 w-3" />Moyenne</Badge>;
  return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Faible</Badge>;
};

export function AgentSalarySummary() {
  const [rows, setRows] = useState<(Employee & { salary: number; attendance: number; mention: Mention })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const p = period();
      const monthStart = `${p}-01`;
      const [y, m] = p.split("-").map(Number);
      const monthEnd = new Date(y, m, 0).toISOString().slice(0, 10);

      const [{ data: emps }, { data: pays }, { data: att }] = await Promise.all([
        supabase.from("employees").select("id,first_name,last_name,matricule").eq("status", "active").order("last_name"),
        supabase.from("payroll").select("employee_id,net_pay,period").eq("period", p),
        supabase.from("attendance").select("employee_id,date,status").gte("date", monthStart).lte("date", monthEnd),
      ]);

      const payMap = new Map<string, number>();
      (pays as PayRow[] || []).forEach((r) => {
        payMap.set(r.employee_id, (payMap.get(r.employee_id) || 0) + Number(r.net_pay || 0));
      });

      // jours ouvrés (lun-ven) du mois
      const workingDays = (() => {
        let n = 0;
        for (let d = new Date(y, m - 1, 1); d.getMonth() === m - 1; d.setDate(d.getDate() + 1)) {
          const dow = d.getDay();
          if (dow !== 0 && dow !== 6) n++;
        }
        return n;
      })();

      const presentByEmp = new Map<string, number>();
      (att as AttRow[] || []).forEach((a) => {
        if (a.status === "present" || a.status === "mission" || a.status === "deplacement") {
          presentByEmp.set(a.employee_id, (presentByEmp.get(a.employee_id) || 0) + 1);
        }
      });

      const out = (emps as Employee[] || []).map((e) => {
        const worked = presentByEmp.get(e.id) || 0;
        const attendance = workingDays > 0 ? Math.round((worked / workingDays) * 100) : 0;
        const salary = payMap.get(e.id) || 0;
        const mention = mentionFor(attendance, salary > 0);
        return { ...e, salary, attendance, mention };
      });
      setRows(out);
      setLoading(false);
    })();
  }, []);

  const counts = useMemo(() => ({
    excellent: rows.filter((r) => r.mention === "excellent").length,
    moyenne: rows.filter((r) => r.mention === "moyenne").length,
    faible: rows.filter((r) => r.mention === "faible").length,
  }), [rows]);

  return (
    <Card className="p-5 ring-1 ring-primary/10">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1.5 rounded-md bg-gradient-to-br from-primary to-primary/70 text-white">
            <Users className="h-4 w-4" />
          </div>
          <h3 className="font-semibold text-base">Performance des agents — {period()}</h3>
        </div>
        <div className="flex gap-2 text-xs">
          <Badge className="bg-emerald-600">{counts.excellent} Excellent(e)</Badge>
          <Badge variant="secondary">{counts.moyenne} Moyenne</Badge>
          <Badge variant="destructive">{counts.faible} Faible</Badge>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-2 text-left">Agent</th>
              <th className="p-2 text-right">Salaire net du mois</th>
              <th className="p-2 text-right">Présence</th>
              <th className="p-2 text-right">Mention</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Chargement…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Aucun agent actif.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/40">
                <td className="p-2">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-semibold">{r.first_name} {r.last_name}</div>
                      {r.matricule && <div className="text-[10px] font-mono text-muted-foreground">{r.matricule}</div>}
                    </div>
                  </div>
                </td>
                <td className="p-2 text-right font-bold text-primary">{fmtUSD(r.salary)}</td>
                <td className="p-2 text-right">
                  <Badge variant={r.attendance >= 90 ? "default" : r.attendance >= 70 ? "secondary" : "destructive"}>
                    {r.attendance}%
                  </Badge>
                </td>
                <td className="p-2 text-right"><MentionBadge m={r.mention} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
