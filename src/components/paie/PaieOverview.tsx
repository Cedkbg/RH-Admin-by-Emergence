import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, Play, CheckCircle2, Download, ShieldCheck, TrendingUp, AlertTriangle, Wallet } from "lucide-react";
import { toast } from "sonner";

const fmtUSD = (n: number) =>
  "$ " + new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

const periodKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const periodLabel = (p: string) => {
  const [y, m] = p.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());
};

interface Row {
  net_pay: number;
  cnss: number;
  cnss_patronal: number;
  ipr: number;
  inpp: number;
  onem: number;
  employee_id: string;
  status: string;
  updated_at?: string;
}

interface BrutAgent {
  id: string;
  first_name: string;
  last_name: string;
  matricule: string | null;
  position: string | null;
  contract_type: string | null;
  base_salary: number | null;
  hourly_rate: number | null;
}

export function PaieOverview() {
  const [period, setPeriod] = useState(periodKey());
  const [rows, setRows] = useState<Row[]>([]);
  const [prevRows, setPrevRows] = useState<Row[]>([]);
  const [brutAgents, setBrutAgents] = useState<BrutAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const prevPeriod = useMemo(() => {
    const [y, m] = period.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return periodKey(d);
  }, [period]);

  const load = async () => {
    setLoading(true);
    const [{ data: cur }, { data: prev }, { data: emps }] = await Promise.all([
      supabase.from("payroll").select("net_pay,cnss,cnss_patronal,ipr,inpp,onem,employee_id,status,updated_at").eq("period", period),
      supabase.from("payroll").select("net_pay,cnss,cnss_patronal,ipr,inpp,onem,employee_id,status,updated_at").eq("period", prevPeriod),
      supabase.from("employees").select("id,first_name,last_name,matricule,position,contract_type,base_salary,hourly_rate").order("last_name"),
    ]);
    setRows((cur as Row[]) || []);
    setPrevRows((prev as Row[]) || []);
    setBrutAgents((emps as BrutAgent[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [period]);

  // Realtime refresh
  useEffect(() => {
    const ch = supabase
      .channel("paie-overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "payroll" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [period]);

  const totals = useMemo(() => {
    const sum = (k: keyof Row) => rows.reduce((s, r) => s + Number((r as any)[k] || 0), 0);
    const sumPrev = (k: keyof Row) => prevRows.reduce((s, r) => s + Number((r as any)[k] || 0), 0);
    return {
      net: sum("net_pay"),
      cnss: sum("cnss") + sum("cnss_patronal"),
      ipr: sum("ipr"),
      inpp: sum("inpp"),
      onem: sum("onem"),
      cnssPrev: sumPrev("cnss") + sumPrev("cnss_patronal"),
      employees: new Set(rows.map((r) => r.employee_id)).size,
      paid: rows.filter((r) => r.status === "paye").length,
      validated: rows.filter((r) => r.status === "valide").length,
      pending: rows.filter((r) => r.status === "en_attente").length,
      lastUpdate: rows.map((r) => r.updated_at).filter(Boolean).sort().pop(),
    };
  }, [rows, prevRows]);

  const cnssDelta = totals.cnssPrev > 0 ? ((totals.cnss - totals.cnssPrev) / totals.cnssPrev) * 100 : 0;

  const globalStatus = totals.pending > 0 ? "EN RÉVISION" : totals.paid === rows.length && rows.length > 0 ? "PAYÉ" : "VALIDÉ";
  const statusTone = globalStatus === "PAYÉ" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
    : globalStatus === "VALIDÉ" ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
    : "bg-amber-500/15 text-amber-700 dark:text-amber-400";

  const lancerCalcul = async () => {
    setRunning(true);
    setProgress(0);
    const t = setInterval(() => setProgress((p) => (p < 95 ? p + 5 : p)), 120);
    try {
      // Touch all current-period rows to retrigger compute_net_pay
      const ids = rows.map((r: any) => r.id).filter(Boolean);
      const { data: ids2 } = await supabase.from("payroll").select("id").eq("period", period);
      const allIds = (ids2 || []).map((r: any) => r.id);
      for (const id of allIds) {
        await supabase.from("payroll").update({ updated_at: new Date().toISOString() } as any).eq("id", id);
      }
      setProgress(100);
      toast.success(`Calcul terminé pour ${allIds.length} bulletin(s).`);
      await load();
    } catch (e: any) {
      toast.error("Échec du calcul : " + e.message);
    } finally {
      clearInterval(t);
      setTimeout(() => { setRunning(false); setProgress(0); }, 800);
    }
  };

  const validerPaieGlobale = async () => {
    const { error } = await supabase.from("payroll").update({ status: "valide" }).eq("period", period).eq("status", "en_attente");
    if (error) return toast.error(error.message);
    toast.success("Paie globale validée");
    load();
  };

  const exporterLivre = () => {
    const headers = ["Période", "Net", "CNSS Ouv.", "CNSS Pat.", "IPR", "INPP", "ONEM", "Statut"];
    const lines = rows.map((r) => [period, r.net_pay, r.cnss, r.cnss_patronal, r.ipr, r.inpp, r.onem, r.status].join(","));
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `livre-paie-${period}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Livre de paie exporté");
  };

  return (
    <div className="space-y-4">
      {/* Top row : Période + Calcul en cours */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Période actuelle */}
        <Card className="lg:col-span-2 p-6 relative overflow-hidden">
          <div className="flex items-center gap-2 text-xs text-primary font-semibold uppercase tracking-wider mb-3">
            <CalendarDays className="h-4 w-4" /> Période actuelle
          </div>
          <h2 className="text-2xl font-bold mb-4">
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value || periodKey())}
              className="bg-transparent border-0 p-0 focus:outline-none focus:ring-0 text-2xl font-bold cursor-pointer"
            />
            <span className="ml-2 text-base font-normal text-muted-foreground">— {periodLabel(period)}</span>
          </h2>

          <div className="grid grid-cols-2 gap-6 mb-5">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Net à Payer</p>
              <p className="text-3xl font-bold text-primary">{fmtUSD(totals.net)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Effectif Inclus</p>
              <p className="text-3xl font-bold">{totals.employees} <span className="text-base font-normal text-muted-foreground">agent(s)</span></p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={lancerCalcul} disabled={running} className="gap-2">
              <Play className="h-4 w-4" /> Lancer le calcul
            </Button>
            <Button onClick={validerPaieGlobale} variant="outline" className="gap-2">
              <CheckCircle2 className="h-4 w-4" /> Valider la paie globale
            </Button>
          </div>

          <CalendarDays className="absolute right-6 top-6 h-24 w-24 text-muted/10" />
        </Card>

        {/* Calcul en cours */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Calcul en cours</span>
            <span className="text-sm font-bold text-primary">{running ? `${progress}%` : "100%"}</span>
          </div>
          <Progress value={running ? progress : 100} className="h-2 mb-2" />
          <p className="text-xs text-muted-foreground italic mb-4">
            {running ? "Traitement des bulletins…" : loading ? "Chargement…" : `${rows.length} bulletin(s) traité(s)`}
          </p>

          <div className="space-y-2 text-sm border-t pt-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Statut Global</span>
              <Badge className={statusTone + " border-0"}>{globalStatus}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Dernière MàJ</span>
              <span className="font-medium">
                {totals.lastUpdate ? new Date(totals.lastUpdate).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }) : "—"}
              </span>
            </div>
          </div>

          <Button variant="outline" className="w-full mt-4 gap-2" onClick={exporterLivre}>
            <Download className="h-4 w-4" /> Exporter le livre de paie
          </Button>
        </Card>
      </div>

      {/* Indicateurs de conformité */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Indicateurs de Conformité (DRC)</h3>
          </div>
          <button className="text-xs text-primary hover:underline">Voir les détails fiscaux</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ConformityCard
            label="Total CNSS"
            value={fmtUSD(totals.cnss)}
            footer={
              cnssDelta !== 0 ? (
                <span className={cnssDelta >= 0 ? "text-emerald-600" : "text-red-600"}>
                  <TrendingUp className="inline h-3 w-3 mr-0.5" />
                  {cnssDelta >= 0 ? "+" : ""}{cnssDelta.toFixed(1)}% vs {periodLabel(prevPeriod).split(" ")[0]}
                </span>
              ) : <span className="text-muted-foreground">Pas de comparatif</span>
            }
          />
          <ConformityCard
            label="Total IPR"
            value={fmtUSD(totals.ipr)}
            footer={<span className="text-muted-foreground">DGI · Direction Générale</span>}
          />
          <ConformityCard
            label="Total INPP"
            value={fmtUSD(totals.inpp)}
            footer={
              totals.inpp === 0 && rows.length > 0
                ? <span className="text-amber-600"><AlertTriangle className="inline h-3 w-3 mr-0.5" />Retard de calcul</span>
                : <span className="text-muted-foreground">3% Masse salariale</span>
            }
          />
          <ConformityCard
            label="Total ONEM"
            value={fmtUSD(totals.onem)}
            footer={<span className="text-muted-foreground">0.2% Masse salariale</span>}
          />
        </div>
      </Card>

      {/* Masse salariale brute par agent */}
      <BrutSalaireCard agents={brutAgents} />
    </div>
  );
}

function brutOf(a: BrutAgent): number {
  const base = Number(a.base_salary || 0);
  if (base > 0) return base;
  const hr = Number(a.hourly_rate || 0);
  // estimation mensuelle standard : 8h × 20j = 160h
  return hr > 0 ? +(hr * 160).toFixed(2) : 0;
}

function BrutSalaireCard({ agents }: { agents: BrutAgent[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = agents.map((a) => ({ ...a, _brut: brutOf(a) }));
    if (!q) return list;
    return list.filter((a) =>
      (`${a.first_name} ${a.last_name} ${a.matricule || ""} ${a.position || ""}`).toLowerCase().includes(q)
    );
  }, [agents, query]);
  const total = filtered.reduce((s, a) => s + a._brut, 0);
  const withSalary = filtered.filter((a) => a._brut > 0).length;

  const exportCsv = () => {
    const headers = ["Matricule", "Nom", "Prénom", "Poste", "Contrat", "Salaire brut (USD)"];
    const lines = filtered.map((a) =>
      [a.matricule || "", a.last_name, a.first_name, a.position || "", a.contract_type || "", a._brut].join(",")
    );
    const csv = [headers.join(","), ...lines, ["", "", "", "", "TOTAL", total].join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `masse-salariale-brute.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Masse salariale brute exportée");
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold">Masse salariale brute</h3>
            <p className="text-xs text-muted-foreground">
              Salaire brut de référence par agent (sans retenues ni avantages).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Rechercher un agent…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-md border bg-background"
          />
          <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Exporter
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total brut à payer</p>
          <p className="text-2xl font-bold text-primary mt-1">{fmtUSD(total)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Agents avec salaire</p>
          <p className="text-2xl font-bold mt-1">{withSalary} <span className="text-base font-normal text-muted-foreground">/ {filtered.length}</span></p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Moyenne brute</p>
          <p className="text-2xl font-bold mt-1">{fmtUSD(withSalary > 0 ? total / withSalary : 0)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Matricule</th>
              <th className="text-left px-3 py-2">Agent</th>
              <th className="text-left px-3 py-2">Poste</th>
              <th className="text-left px-3 py-2">Contrat</th>
              <th className="text-right px-3 py-2">Salaire brut</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Aucun agent.</td></tr>
            )}
            {filtered.map((a) => (
              <tr key={a.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">{a.matricule || "—"}</td>
                <td className="px-3 py-2 font-medium">{a.last_name} {a.first_name}</td>
                <td className="px-3 py-2 text-muted-foreground">{a.position || "—"}</td>
                <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{a.contract_type || "—"}</Badge></td>
                <td className="px-3 py-2 text-right font-semibold">
                  {a._brut > 0 ? fmtUSD(a._brut) : <span className="text-amber-600 text-xs">Non défini</span>}
                </td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t bg-muted/40 font-bold">
                <td colSpan={4} className="px-3 py-2 text-right">TOTAL MASSE BRUTE</td>
                <td className="px-3 py-2 text-right text-primary">{fmtUSD(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Card>
  );
}

function ConformityCard({ label, value, footer }: { label: string; value: string; footer: React.ReactNode }) {
  return (
    <div className="rounded-lg border-t-2 border-t-primary bg-card p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      <p className="text-[11px] mt-2">{footer}</p>
    </div>
  );
}
