import { CrudPage } from "@/components/dashboard/CrudPage";
import { TextField, SelectField, FormGrid, cleanForm } from "@/lib/forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, Printer } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  matricule: string | null;
  gender: string | null;
  position: string | null;
  contract_type: string | null;
  hourly_rate: number | null;
  base_salary: number | null;
  direction_id: string | null;
  department_id: string | null;
  email: string | null;
}
interface Direction { id: string; name: string; }
interface Department { id: string; name: string; }

interface Pay {
  id: string;
  employee_id: string;
  period: string;
  contract_type: string | null;
  hours_worked: number;
  hourly_rate: number;
  days_worked: number;
  daily_rate: number;
  base_salary: number;
  assiette_ipr: number;
  bonus: number;
  bonus_type: string | null;
  ipr: number;
  inpp: number;
  cnss: number;
  cnss_patronal: number;
  onem: number;
  other_deductions: number;
  deductions: number;
  transport: number;
  communication: number;
  loyer: number;
  allocation_familiale: number;
  total_avantages: number;
  net_pay: number;
  status: string;
  paid_at: string | null;
}

const fmt = (n: any) => Number(n || 0).toLocaleString("fr-FR");
const num = (v: any) => Number(v || 0);
const currentPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const CONTRACT_OPTIONS = [
  { value: "CDI", label: "CDI — Contrat à Durée Indéterminée" },
  { value: "CDD", label: "CDD — Contrat à Durée Déterminée" },
  { value: "Stage", label: "Stage" },
  { value: "Consultant", label: "Consultant" },
  { value: "Journalier", label: "Journalier" },
  { value: "Prestation", label: "Prestation de service" },
];

const BONUS_TYPES = [
  { value: "aucune", label: "Aucune prime" },
  { value: "mensuelle", label: "Prime mensuelle" },
  { value: "journaliere", label: "Prime journalière" },
  { value: "performance", label: "Prime de performance" },
  { value: "rendement", label: "Prime de rendement" },
  { value: "anciennete", label: "Prime d'ancienneté" },
  { value: "transport", label: "Prime de transport" },
  { value: "fin_annee", label: "Prime de fin d'année (13e mois)" },
  { value: "exceptionnelle", label: "Prime exceptionnelle" },
  { value: "mission", label: "Prime de mission" },
];

const STATUS_OPTIONS = [
  { value: "en_attente", label: "En attente de validation" },
  { value: "valide", label: "Validé" },
  { value: "paye", label: "Payé" },
  { value: "annule", label: "Annulé" },
];

const PaieForm = ({
  form, setForm, employees, directions, departments,
}: {
  form: Partial<Pay>;
  setForm: (f: Partial<Pay>) => void;
  employees: Employee[];
  directions: Map<string, Direction>;
  departments: Map<string, Department>;
}) => {
  const [loadingHours, setLoadingHours] = useState(false);

  const fillFromAttendance = async (empId: string, period: string) => {
    if (!empId || !period || !/^\d{4}-\d{2}$/.test(period)) return;
    setLoadingHours(true);
    const start = `${period}-01`;
    const [y, m] = period.split("-").map(Number);
    const endDate = new Date(y, m, 0).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("attendance")
      .select("check_in,check_out,date")
      .eq("employee_id", empId)
      .gte("date", start)
      .lte("date", endDate);
    setLoadingHours(false);
    let totalMinutes = 0;
    const days = new Set<string>();
    for (const r of (data as any[]) || []) {
      if (!r.check_in || !r.check_out) continue;
      const [h1, m1] = r.check_in.split(":").map(Number);
      const [h2, m2] = r.check_out.split(":").map(Number);
      const diff = h2 * 60 + m2 - (h1 * 60 + m1);
      if (diff > 0) {
        totalMinutes += diff;
        days.add(r.date);
      }
    }
    const hours = +(totalMinutes / 60).toFixed(2);
    return { hours_worked: hours, days_worked: days.size };
  };

  const handleSelectEmployee = async (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;
    const period = form.period || currentPeriod();
    const att = await fillFromAttendance(empId, period);
    setForm({
      ...form,
      employee_id: empId,
      period,
      contract_type: emp.contract_type || "CDI",
      hourly_rate: Number(emp.hourly_rate ?? 0),
      base_salary: form.base_salary || Number(emp.base_salary ?? 0),
      hours_worked: att?.hours_worked ?? 0,
      days_worked: att?.days_worked ?? 0,
    });
  };

  const computedBrut = useMemo(() => {
    if (num(form.hours_worked) > 0 && num(form.hourly_rate) > 0)
      return num(form.hours_worked) * num(form.hourly_rate);
    if (num(form.days_worked) > 0 && num(form.daily_rate) > 0)
      return num(form.days_worked) * num(form.daily_rate);
    return num(form.base_salary);
  }, [form.hours_worked, form.hourly_rate, form.days_worked, form.daily_rate, form.base_salary]);

  const totalAvantages = num(form.transport) + num(form.communication) + num(form.loyer) + num(form.allocation_familiale) + num(form.bonus);
  const totalRetenues = num(form.ipr) + num(form.inpp) + num(form.cnss) + num(form.onem) + num(form.other_deductions);
  const net = computedBrut + totalAvantages - totalRetenues;

  const emp = employees.find((e) => e.id === form.employee_id);
  const dir = emp?.direction_id ? directions.get(emp.direction_id)?.name : null;
  const dep = emp?.department_id ? departments.get(emp.department_id)?.name : null;

  return (
    <FormGrid>
      <SelectField
        label="Agent *"
        value={form.employee_id || ""}
        onChange={handleSelectEmployee}
        options={employees.map((e) => ({ value: e.id, label: `${e.first_name} ${e.last_name}${e.matricule ? ` — ${e.matricule}` : ""}` }))}
      />
      <TextField
        label="Matricule"
        value={emp?.matricule || ""}
        onChange={() => {}}
        placeholder="Auto"
      />

      {emp && (
        <div className="md:col-span-2 grid grid-cols-2 gap-2 rounded-lg border bg-secondary/30 p-3 text-xs">
          <div><span className="text-muted-foreground">Direction:</span> <strong>{dir || "—"}</strong></div>
          <div><span className="text-muted-foreground">Département:</span> <strong>{dep || "—"}</strong></div>
          <div><span className="text-muted-foreground">Fonction:</span> <strong>{emp.position || "—"}</strong></div>
          <div><span className="text-muted-foreground">Email:</span> <strong>{emp.email || "—"}</strong></div>
        </div>
      )}

      <TextField label="Période (AAAA-MM)" value={form.period || ""} onChange={(v) => setForm({ ...form, period: v })} placeholder={currentPeriod()} />
      <SelectField
        label="Type de contrat *"
        value={form.contract_type || ""}
        onChange={(v) => setForm({ ...form, contract_type: v })}
        options={CONTRACT_OPTIONS}
      />

      <SelectField
        label="Type de prime"
        value={form.bonus_type || "aucune"}
        onChange={(v) => setForm({ ...form, bonus_type: v })}
        options={BONUS_TYPES}
      />
      <TextField label="Montant prime" value={String(form.bonus ?? 0)} onChange={(v) => setForm({ ...form, bonus: Number(v) as any })} type="number" />

      <div className="md:col-span-2 mt-1 text-xs font-semibold uppercase text-muted-foreground">Présence (auto depuis pointage)</div>
      <TextField label={`Jours prestés${loadingHours ? " (calcul…)" : ""}`} value={String(form.days_worked ?? 0)} onChange={(v) => setForm({ ...form, days_worked: Number(v) as any })} type="number" />
      <TextField label="Heures travaillées (mois)" value={String(form.hours_worked ?? 0)} onChange={(v) => setForm({ ...form, hours_worked: Number(v) as any })} type="number" />
      <TextField label="Taux horaire (USD/h)" value={String(form.hourly_rate ?? 0)} onChange={(v) => setForm({ ...form, hourly_rate: Number(v) as any })} type="number" />
      <TextField label="Taux journalier (USD/jour)" value={String(form.daily_rate ?? 0)} onChange={(v) => setForm({ ...form, daily_rate: Number(v) as any })} type="number" />
      <TextField label="Salaire de base imposable" value={String(form.base_salary ?? 0)} onChange={(v) => setForm({ ...form, base_salary: Number(v) as any })} type="number" span={2} />
      <TextField label="Assiette IPR" value={String(form.assiette_ipr ?? 0)} onChange={(v) => setForm({ ...form, assiette_ipr: Number(v) as any })} type="number" span={2} />

      <div className="md:col-span-2 mt-1 text-xs font-semibold uppercase text-muted-foreground">Retenues</div>
      <TextField label="CNSS Ouvrier (5%)" value={String(form.cnss ?? 0)} onChange={(v) => setForm({ ...form, cnss: Number(v) as any })} type="number" />
      <TextField label="CNSS Patronal (13%)" value={String(form.cnss_patronal ?? 0)} onChange={(v) => setForm({ ...form, cnss_patronal: Number(v) as any })} type="number" />
      <TextField label="IPR" value={String(form.ipr ?? 0)} onChange={(v) => setForm({ ...form, ipr: Number(v) as any })} type="number" />
      <TextField label="INPP (3%)" value={String(form.inpp ?? 0)} onChange={(v) => setForm({ ...form, inpp: Number(v) as any })} type="number" />
      <TextField label="ONEM (0.2%)" value={String(form.onem ?? 0)} onChange={(v) => setForm({ ...form, onem: Number(v) as any })} type="number" />
      <TextField label="Autres retenues" value={String(form.other_deductions ?? 0)} onChange={(v) => setForm({ ...form, other_deductions: Number(v) as any })} type="number" />

      <div className="md:col-span-2 mt-1 text-xs font-semibold uppercase text-muted-foreground">Avantages</div>
      <TextField label="Transport" value={String(form.transport ?? 0)} onChange={(v) => setForm({ ...form, transport: Number(v) as any })} type="number" />
      <TextField label="Communication" value={String(form.communication ?? 0)} onChange={(v) => setForm({ ...form, communication: Number(v) as any })} type="number" />
      <TextField label="Loyer" value={String(form.loyer ?? 0)} onChange={(v) => setForm({ ...form, loyer: Number(v) as any })} type="number" />
      <TextField label="Allocation familiale" value={String(form.allocation_familiale ?? 0)} onChange={(v) => setForm({ ...form, allocation_familiale: Number(v) as any })} type="number" />

      <div className="md:col-span-2 rounded-lg border-2 border-primary/40 bg-primary/5 p-3 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-muted-foreground">Salaire brut</span><span className="font-semibold">{fmt(computedBrut)} USD</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Total avantages</span><span className="font-semibold">+ {fmt(totalAvantages)} USD</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Total retenues</span><span className="font-semibold">- {fmt(totalRetenues)} USD</span></div>
        <div className="flex justify-between text-base border-t pt-1 mt-1"><span className="font-semibold">Salaire net à payer</span><span className="font-bold text-primary">{fmt(net)} USD</span></div>
      </div>

      <SelectField
        label="Statut"
        value={form.status || "en_attente"}
        onChange={(v) => setForm({ ...form, status: v })}
        options={STATUS_OPTIONS}
      />
      <TextField label="Date de paiement" value={form.paid_at || ""} onChange={(v) => setForm({ ...form, paid_at: v })} type="date" />
    </FormGrid>
  );
};

// === Bulletin de paie imprimable ===
const esc = (s: any) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const printBulletin = (pay: Pay, emp: Employee | undefined, dir: string | null, dep: string | null) => {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return;
  const html = `
<!doctype html><html><head><meta charset="utf-8"><title>Bulletin ${esc(pay.period)} — ${esc(emp?.first_name)} ${esc(emp?.last_name)}</title>
<style>
body{font-family:Arial,sans-serif;padding:32px;color:#222;max-width:780px;margin:auto}
h1{margin:0 0 4px;font-size:20px}h2{font-size:14px;margin:18px 0 6px;border-bottom:2px solid #333;padding-bottom:2px}
table{width:100%;border-collapse:collapse;margin:6px 0}td{padding:4px 6px;border-bottom:1px solid #eee;font-size:13px}
.r{text-align:right}.tot{font-weight:bold;background:#f0f4ff;font-size:14px}
.head{display:flex;justify-content:space-between;border-bottom:3px solid #1e40af;padding-bottom:8px;margin-bottom:12px}
.box{border:1px solid #ddd;padding:10px;border-radius:6px;font-size:12px;margin-bottom:10px}
</style></head><body>
<div class="head"><div><h1>BULLETIN DE PAIE</h1><div>Période : <b>${esc(pay.period)}</b></div></div>
<div style="text-align:right;font-size:12px"><div><b>Statut :</b> ${esc(pay.status)}</div>${pay.paid_at ? `<div>Payé le ${esc(pay.paid_at)}</div>` : ""}</div></div>

<div class="box">
<b>${esc(emp?.first_name)} ${esc(emp?.last_name)}</b><br/>
Matricule : ${esc(emp?.matricule || "—")} &nbsp;|&nbsp; Fonction : ${esc(emp?.position || "—")}<br/>
Direction : ${esc(dir || "—")} &nbsp;|&nbsp; Département : ${esc(dep || "—")}<br/>
Contrat : ${esc(pay.contract_type || "—")}
</div>

<h2>Présence & Rémunération de base</h2>
<table>
<tr><td>Jours prestés</td><td class="r">${fmt(pay.days_worked)}</td></tr>
<tr><td>Heures travaillées</td><td class="r">${fmt(pay.hours_worked)} h</td></tr>
<tr><td>Taux horaire</td><td class="r">${fmt(pay.hourly_rate)} USD</td></tr>
<tr><td>Taux journalier</td><td class="r">${fmt(pay.daily_rate)} USD</td></tr>
<tr class="tot"><td>Salaire brut</td><td class="r">${fmt(pay.base_salary)} USD</td></tr>
</table>

<h2>Avantages</h2>
<table>
<tr><td>Transport</td><td class="r">${fmt(pay.transport)}</td></tr>
<tr><td>Communication</td><td class="r">${fmt(pay.communication)}</td></tr>
<tr><td>Loyer</td><td class="r">${fmt(pay.loyer)}</td></tr>
<tr><td>Allocation familiale</td><td class="r">${fmt(pay.allocation_familiale)}</td></tr>
<tr><td>Prime ${pay.bonus_type ? `(${esc(pay.bonus_type)})` : ""}</td><td class="r">${fmt(pay.bonus)}</td></tr>
<tr class="tot"><td>Total avantages</td><td class="r">+ ${fmt(pay.total_avantages)} USD</td></tr>
</table>

<h2>Retenues</h2>
<table>
<tr><td>CNSS Ouvrier (5%)</td><td class="r">${fmt(pay.cnss)}</td></tr>
<tr><td>IPR</td><td class="r">${fmt(pay.ipr)}</td></tr>
<tr><td>INPP (3%)</td><td class="r">${fmt(pay.inpp)}</td></tr>
<tr><td>ONEM (0.2%)</td><td class="r">${fmt(pay.onem)}</td></tr>
<tr><td>Autres</td><td class="r">${fmt(pay.other_deductions)}</td></tr>
<tr class="tot"><td>Total retenues</td><td class="r">- ${fmt(pay.deductions)} USD</td></tr>
</table>

<h2>Net à payer</h2>
<table><tr class="tot" style="background:#dbeafe;font-size:18px"><td>SALAIRE NET</td><td class="r">${fmt(pay.net_pay)} USD</td></tr></table>

<div style="margin-top:30px;display:flex;justify-content:space-between;font-size:12px">
<div>Signature employé<br/>____________________</div>
<div>Signature employeur<br/>____________________</div>
</div>
<script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
</body></html>`;
  w.document.write(html);
  w.document.close();
};

const Paie = () => {
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [directions, setDirections] = useState<Map<string, Direction>>(new Map());
  const [departments, setDepartments] = useState<Map<string, Department>>(new Map());

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const [{ data: emp }, { data: dir }, { data: dep }] = await Promise.all([
        supabase.from("employees").select("id,first_name,last_name,matricule,gender,position,contract_type,hourly_rate,base_salary,direction_id,department_id,email").order("last_name"),
        supabase.from("directions").select("id,name"),
        supabase.from("departments").select("id,name"),
      ]);
      setEmployees((emp as Employee[]) || []);
      const dm = new Map<string, Direction>();
      (dir as Direction[] || []).forEach((d) => dm.set(d.id, d));
      setDirections(dm);
      const pm = new Map<string, Department>();
      (dep as Department[] || []).forEach((d) => pm.set(d.id, d));
      setDepartments(pm);
    })();
  }, [isAdmin]);

  const empMap = useMemo(() => {
    const m = new Map<string, Employee>();
    employees.forEach((e) => m.set(e.id, e));
    return m;
  }, [employees]);

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <Lock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold">Paie & Rémunération</h1>
        <p className="mt-2 text-sm text-muted-foreground">L'accès aux données de paie est réservé à l'Admin RH.</p>
      </div>
    );
  }

  return (
    <CrudPage<Pay>
      title="Paie & Rémunération"
      subtitle="bulletin(s)"
      table="payroll"
      orderBy={{ column: "created_at", ascending: false }}
      searchFields={["period", "status", "contract_type"] as any}
      defaultForm={{
        employee_id: "", period: currentPeriod(), contract_type: "CDI",
        hours_worked: 0, hourly_rate: 0, days_worked: 0, daily_rate: 0,
        base_salary: 0, assiette_ipr: 0, bonus: 0, bonus_type: "aucune",
        ipr: 0, inpp: 0, cnss: 0, cnss_patronal: 0, onem: 0, other_deductions: 0,
        transport: 0, communication: 0, loyer: 0, allocation_familiale: 0,
        status: "en_attente", paid_at: "",
      }}
      validate={(f) => (!f.employee_id || !f.period ? "Agent et période requis" : null)}
      prepare={(f) => {
        const c = cleanForm(f as any);
        delete c.net_pay; delete c.deductions; delete c.total_avantages;
        ["hours_worked","hourly_rate","days_worked","daily_rate","base_salary","assiette_ipr","bonus","ipr","inpp","cnss","cnss_patronal","onem","other_deductions","transport","communication","loyer","allocation_familiale"].forEach((k) => { c[k] = Number(c[k] || 0); });
        return c;
      }}
      columns={[
        { key: "employee_id", label: "Agent", render: (r) => {
          const e = empMap.get(r.employee_id);
          return e ? <div><div className="font-semibold">{e.first_name} {e.last_name}</div><div className="text-xs text-muted-foreground">{e.matricule}</div></div> : "—";
        }},
        { key: "contract_type", label: "Contrat", render: (r) => r.contract_type || "—" },
        { key: "period", label: "Période" },
        { key: "base_salary", label: "Salaire brut", render: (r) => fmt(r.base_salary) },
        { key: "hours_worked", label: "T/T (h)", render: (r) => `${fmt(r.hours_worked)} h` },
        { key: "days_worked", label: "T/t (jrs)", render: (r) => fmt(r.days_worked) },
        { key: "deductions", label: "Retenue", render: (r) => fmt(r.deductions) },
        { key: "net_pay", label: "Salaire net", render: (r) => <span className="font-bold text-primary">{fmt(r.net_pay)}</span> },
        { key: "status", label: "Statut", render: (r) => {
          const variant = r.status === "paye" ? "default" : r.status === "valide" ? "secondary" : r.status === "annule" ? "destructive" : "outline";
          return <Badge variant={variant as any}>{STATUS_OPTIONS.find((s) => s.value === r.status)?.label || r.status}</Badge>;
        }},
        { key: "id", label: "Bulletin", render: (r) => {
          const e = empMap.get(r.employee_id);
          const dir = e?.direction_id ? directions.get(e.direction_id)?.name ?? null : null;
          const dep = e?.department_id ? departments.get(e.department_id)?.name ?? null : null;
          return <Button size="sm" variant="outline" onClick={() => { printBulletin(r, e, dir, dep); toast.success("Bulletin généré"); }}><Printer className="h-3.5 w-3.5 mr-1" /> Imprimer</Button>;
        }},
      ]}
      renderForm={(form, setForm) => (
        <PaieForm form={form as Partial<Pay>} setForm={setForm as any} employees={employees} directions={directions} departments={departments} />
      )}
    />
  );
};

export default Paie;
