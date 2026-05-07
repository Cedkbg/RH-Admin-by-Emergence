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
  base_salary: number;
  bonus: number;
  ipr: number;
  inpp: number;
  cnss: number;
  onem: number;
  other_deductions: number;
  deductions: number;
  net_pay: number;
  status: string;
  paid_at: string | null;
}

const fmt = (n: any) => Number(n || 0).toLocaleString("fr-FR");

/** Sous-formulaire — gère sélection agent + auto-calcul des heures de présence + net */
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

  // Quand l'agent change : auto-remplir contrat + taux horaire
  const handleSelectEmployee = (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    setForm({
      ...form,
      employee_id: empId,
      contract_type: emp?.contract_type ?? "",
      hourly_rate: Number(emp?.hourly_rate ?? 0),
    });
  };

  // Quand agent + période sont définis : calculer heures via la table attendance
  useEffect(() => {
    const empId = form.employee_id;
    const period = form.period; // format "YYYY-MM"
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
      for (const r of data as any[]) {
        if (!r.check_in || !r.check_out) continue;
        const [h1, m1] = r.check_in.split(":").map(Number);
        const [h2, m2] = r.check_out.split(":").map(Number);
        const diff = h2 * 60 + m2 - (h1 * 60 + m1);
        if (diff > 0) totalMinutes += diff;
      }
      const hours = +(totalMinutes / 60).toFixed(2);
      setForm({ ...form, hours_worked: hours } as Partial<Pay>);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.employee_id, form.period]);

  const hours = Number(form.hours_worked || 0);
  const rate = Number(form.hourly_rate || 0);
  const computedBrut = hours > 0 && rate > 0 ? hours * rate : Number(form.base_salary || 0);
  const totalRetenues =
    Number(form.ipr || 0) +
    Number(form.inpp || 0) +
    Number(form.cnss || 0) +
    Number(form.onem || 0) +
    Number(form.other_deductions || 0);
  const net = computedBrut + Number(form.bonus || 0) - totalRetenues;

  return (
    <FormGrid>
      <SelectField
        label="Agent *"
        value={form.employee_id || ""}
        onChange={handleSelectEmployee}
        options={employees.map((e) => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))}
        span={2}
      />
      <TextField
        label="Période * (AAAA-MM)"
        value={form.period || ""}
        onChange={(v) => setForm({ ...form, period: v })}
        required
        placeholder="2026-04"
      />
      <TextField
        label="Type de contrat"
        value={form.contract_type || ""}
        onChange={(v) => setForm({ ...form, contract_type: v })}
        placeholder="CDI / CDD / Stage…"
      />

      <TextField
        label={`Heures travaillées${loadingHours ? " (calcul…)" : ""}`}
        value={String(form.hours_worked ?? 0)}
        onChange={(v) => setForm({ ...form, hours_worked: Number(v) as any })}
        type="number"
      />
      <TextField
        label="Taux horaire"
        value={String(form.hourly_rate ?? 0)}
        onChange={(v) => setForm({ ...form, hourly_rate: Number(v) as any })}
        type="number"
      />

      <div className="md:col-span-2 rounded-lg border bg-secondary/40 p-3 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Salaire brut (Heures × Taux)</span><span className="font-semibold">{fmt(computedBrut)}</span></div>
      </div>

      <TextField label="Salaire de base (manuel si pas d'heures)" value={String(form.base_salary ?? 0)} onChange={(v) => setForm({ ...form, base_salary: Number(v) as any })} type="number" />
      <TextField label="Primes" value={String(form.bonus ?? 0)} onChange={(v) => setForm({ ...form, bonus: Number(v) as any })} type="number" />

      <div className="md:col-span-2 mt-2 -mb-1 text-xs font-semibold uppercase text-muted-foreground">Retenues</div>
      <TextField label="IPR" value={String(form.ipr ?? 0)} onChange={(v) => setForm({ ...form, ipr: Number(v) as any })} type="number" />
      <TextField label="INPP" value={String(form.inpp ?? 0)} onChange={(v) => setForm({ ...form, inpp: Number(v) as any })} type="number" />
      <TextField label="CNSS" value={String(form.cnss ?? 0)} onChange={(v) => setForm({ ...form, cnss: Number(v) as any })} type="number" />
      <TextField label="ONEM" value={String(form.onem ?? 0)} onChange={(v) => setForm({ ...form, onem: Number(v) as any })} type="number" />
      <TextField label="Autres retenues" value={String(form.other_deductions ?? 0)} onChange={(v) => setForm({ ...form, other_deductions: Number(v) as any })} type="number" span={2} />

      <div className="md:col-span-2 rounded-lg border-2 border-primary/40 bg-primary/5 p-3 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-muted-foreground">Total retenues</span><span className="font-semibold">{fmt(totalRetenues)}</span></div>
        <div className="flex justify-between text-base"><span className="font-semibold">Salaire net</span><span className="font-bold text-primary">{fmt(net)}</span></div>
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
        .select("id,first_name,last_name,contract_type,hourly_rate,base_salary")
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
        base_salary: 0,
        bonus: 0,
        ipr: 0,
        inpp: 0,
        cnss: 0,
        onem: 0,
        other_deductions: 0,
        status: "draft",
        paid_at: "",
      }}
      validate={(f) => (!f.employee_id || !f.period ? "Agent et période requis" : null)}
      prepare={(f) => {
        const c = cleanForm(f as any);
        delete c.net_pay;
        delete c.deductions; // recalculé par le trigger
        ["hours_worked", "hourly_rate", "base_salary", "bonus", "ipr", "inpp", "cnss", "onem", "other_deductions"].forEach((k) => {
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
        { key: "hourly_rate", label: "T/T (Taux/h)", render: (r) => fmt(r.hourly_rate) },
        { key: "hours_worked", label: "T/t (Heures)", render: (r) => `${fmt(r.hours_worked)} h` },
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
