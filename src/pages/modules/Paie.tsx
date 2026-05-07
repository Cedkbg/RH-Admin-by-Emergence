import { CrudPage } from "@/components/dashboard/CrudPage";
import { TextField, SelectField, FormGrid, cleanForm } from "@/lib/forms";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  gender: string | null;
  position: string | null;
  contract_type: string | null;
  hourly_rate: number | null;
  base_salary: number | null;
}

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

const PaieForm = ({
  form,
  setForm,
  employees,
}: {
  form: Partial<Pay>;
  setForm: (f: Partial<Pay>) => void;
  employees: Employee[];
}) => {
  const [loadingHours, setLoadingHours] = useState(false);

  const handleSelectEmployee = (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    setForm({
      ...form,
      employee_id: empId,
      contract_type: emp?.contract_type ?? "",
      hourly_rate: Number(emp?.hourly_rate ?? 0),
    });
  };

  useEffect(() => {
    const empId = form.employee_id;
    const period = form.period;
    if (!empId || !period || !/^\d{4}-\d{2}$/.test(period)) return;
    setLoadingHours(true);
    (async () => {
      const start = `${period}-01`;
      const [y, m] = period.split("-").map(Number);
      const endDate = new Date(y, m, 0).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("attendance")
        .select("check_in,check_out,date")
        .eq("employee_id", empId)
        .gte("date", start)
        .lte("date", endDate);
      setLoadingHours(false);
      if (error || !data) return;
      let totalMinutes = 0;
      const days = new Set<string>();
      for (const r of data as any[]) {
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
      setForm({ ...form, hours_worked: hours, days_worked: days.size } as Partial<Pay>);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.employee_id, form.period]);

  // Calcul auto base_salary
  const computedBrut = useMemo(() => {
    if (num(form.hours_worked) > 0 && num(form.hourly_rate) > 0)
      return num(form.hours_worked) * num(form.hourly_rate);
    if (num(form.days_worked) > 0 && num(form.daily_rate) > 0)
      return num(form.days_worked) * num(form.daily_rate);
    return num(form.base_salary);
  }, [form.hours_worked, form.hourly_rate, form.days_worked, form.daily_rate, form.base_salary]);

  const totalAvantages =
    num(form.transport) + num(form.communication) + num(form.loyer) +
    num(form.allocation_familiale) + num(form.bonus);

  const totalRetenues =
    num(form.ipr) + num(form.inpp) + num(form.cnss) + num(form.onem) + num(form.other_deductions);

  const net = computedBrut + totalAvantages - totalRetenues;

  const emp = employees.find((e) => e.id === form.employee_id);

  return (
    <FormGrid>
      <SelectField
        label="Agent *"
        value={form.employee_id || ""}
        onChange={handleSelectEmployee}
        options={employees.map((e) => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))}
        span={2}
      />

      {emp && (
        <div className="md:col-span-2 grid grid-cols-3 gap-2 rounded-lg border bg-secondary/30 p-2 text-xs">
          <div><span className="text-muted-foreground">Genre:</span> <strong>{emp.gender || "—"}</strong></div>
          <div><span className="text-muted-foreground">Fonction:</span> <strong>{emp.position || "—"}</strong></div>
          <div><span className="text-muted-foreground">Contrat:</span> <strong>{emp.contract_type || "—"}</strong></div>
        </div>
      )}

      <TextField label="Période * (AAAA-MM)" value={form.period || ""} onChange={(v) => setForm({ ...form, period: v })} required placeholder="2026-04" />
      <TextField label="Type de contrat" value={form.contract_type || ""} onChange={(v) => setForm({ ...form, contract_type: v })} />

      <div className="md:col-span-2 mt-1 text-xs font-semibold uppercase text-muted-foreground">Salaire de base</div>
      <TextField label="Salaire de base imposable (a)" value={String(form.base_salary ?? 0)} onChange={(v) => setForm({ ...form, base_salary: Number(v) as any })} type="number" />
      <TextField label={`Nombre de jours prestés (b)${loadingHours ? " (calcul…)" : ""}`} value={String(form.days_worked ?? 0)} onChange={(v) => setForm({ ...form, days_worked: Number(v) as any })} type="number" />
      <TextField label="Heures travaillées" value={String(form.hours_worked ?? 0)} onChange={(v) => setForm({ ...form, hours_worked: Number(v) as any })} type="number" />
      <TextField label="Taux horaire" value={String(form.hourly_rate ?? 0)} onChange={(v) => setForm({ ...form, hourly_rate: Number(v) as any })} type="number" />
      <TextField label="Taux journalier" value={String(form.daily_rate ?? 0)} onChange={(v) => setForm({ ...form, daily_rate: Number(v) as any })} type="number" span={2} />

      <div className="md:col-span-2 rounded-lg border bg-secondary/40 p-3 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Salaire de Base JR (a/b)</span><span className="font-semibold">{fmt(computedBrut)}</span></div>
      </div>

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
      <TextField label="Primes" value={String(form.bonus ?? 0)} onChange={(v) => setForm({ ...form, bonus: Number(v) as any })} type="number" span={2} />

      <div className="md:col-span-2 rounded-lg border-2 border-primary/40 bg-primary/5 p-3 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-muted-foreground">Total avantages</span><span className="font-semibold">{fmt(totalAvantages)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Total retenues</span><span className="font-semibold">{fmt(totalRetenues)}</span></div>
        <div className="flex justify-between text-base"><span className="font-semibold">Salaire net viable</span><span className="font-bold text-primary">{fmt(net)}</span></div>
      </div>

      <SelectField
        label="Statut"
        value={form.status || "draft"}
        onChange={(v) => setForm({ ...form, status: v })}
        options={[
          { value: "draft", label: "Brouillon" },
          { value: "approved", label: "Approuvé" },
          { value: "paid", label: "Payé" },
        ]}
      />
      <TextField label="Date de paiement" value={form.paid_at || ""} onChange={(v) => setForm({ ...form, paid_at: v })} type="date" />
    </FormGrid>
  );
};

const Paie = () => {
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    if (isAdmin) {
      supabase
        .from("employees")
        .select("id,first_name,last_name,gender,position,contract_type,hourly_rate,base_salary")
        .order("last_name")
        .then(({ data }) => setEmployees((data as Employee[]) || []));
    }
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
        employee_id: "",
        period: "",
        contract_type: "",
        hours_worked: 0,
        hourly_rate: 0,
        days_worked: 0,
        daily_rate: 0,
        base_salary: 0,
        assiette_ipr: 0,
        bonus: 0,
        ipr: 0,
        inpp: 0,
        cnss: 0,
        cnss_patronal: 0,
        onem: 0,
        other_deductions: 0,
        transport: 0,
        communication: 0,
        loyer: 0,
        allocation_familiale: 0,
        status: "draft",
        paid_at: "",
      }}
      validate={(f) => (!f.employee_id || !f.period ? "Agent et période requis" : null)}
      prepare={(f) => {
        const c = cleanForm(f as any);
        delete c.net_pay;
        delete c.deductions;
        delete c.total_avantages;
        ["hours_worked","hourly_rate","days_worked","daily_rate","base_salary","assiette_ipr","bonus","ipr","inpp","cnss","cnss_patronal","onem","other_deductions","transport","communication","loyer","allocation_familiale"].forEach((k) => {
          c[k] = Number(c[k] || 0);
        });
        return c;
      }}
      columns={[
        {
          key: "employee_id",
          label: "Agent",
          render: (r) => {
            const e = empMap.get(r.employee_id);
            return e ? <span className="font-semibold">{e.first_name} {e.last_name}</span> : "—";
          },
        },
        { key: "contract_type", label: "Contrat", render: (r) => r.contract_type || "—" },
        { key: "base_salary", label: "Salaire brut", render: (r) => fmt(r.base_salary) },
        { key: "days_worked", label: "Jours", render: (r) => fmt(r.days_worked) },
        { key: "hours_worked", label: "Heures", render: (r) => `${fmt(r.hours_worked)} h` },
        { key: "total_avantages", label: "Avantages", render: (r) => fmt(r.total_avantages) },
        { key: "deductions", label: "Retenue", render: (r) => fmt(r.deductions) },
        { key: "net_pay", label: "Salaire net", render: (r) => <span className="font-bold text-primary">{fmt(r.net_pay)}</span> },
        { key: "status", label: "Statut", render: (r) => <Badge variant={r.status === "paid" ? "default" : "outline"}>{r.status}</Badge> },
      ]}
      renderForm={(form, setForm) => (
        <PaieForm form={form as Partial<Pay>} setForm={setForm as any} employees={employees} />
      )}
    />
  );
};

export default Paie;
