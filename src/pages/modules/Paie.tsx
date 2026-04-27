import { CrudPage } from "@/components/dashboard/CrudPage";
import { TextField, SelectField, FormGrid, cleanForm } from "@/lib/forms";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Pay {
  id: string; employee_id: string; period: string;
  base_salary: number; bonus: number; deductions: number; net_pay: number;
  status: string; paid_at: string | null;
}

const Paie = () => {
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  useEffect(() => {
    if (isAdmin) supabase.from("employees").select("id,first_name,last_name").order("last_name").then(({ data }) => setEmployees(data || []));
  }, [isAdmin]);

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
      searchFields={["period", "status"]}
      defaultForm={{ employee_id: "", period: "", base_salary: 0, bonus: 0, deductions: 0, status: "draft", paid_at: "" }}
      validate={(f) => (!f.employee_id || !f.period ? "Agent et période requis" : null)}
      prepare={(f) => {
        const c = cleanForm(f as any);
        delete c.net_pay;
        c.base_salary = Number(c.base_salary || 0);
        c.bonus = Number(c.bonus || 0);
        c.deductions = Number(c.deductions || 0);
        return c;
      }}
      columns={[
        { key: "employee_id", label: "Agent", render: (r) => {
          const e = employees.find((x) => x.id === r.employee_id);
          return e ? <span className="font-semibold">{e.first_name} {e.last_name}</span> : "—";
        }},
        { key: "period", label: "Période" },
        { key: "base_salary", label: "Base", render: (r) => `${Number(r.base_salary).toLocaleString("fr-FR")}` },
        { key: "bonus", label: "Primes", render: (r) => `${Number(r.bonus).toLocaleString("fr-FR")}` },
        { key: "deductions", label: "Retenues", render: (r) => `${Number(r.deductions).toLocaleString("fr-FR")}` },
        { key: "net_pay", label: "Net", render: (r) => <span className="font-bold">{Number(r.net_pay).toLocaleString("fr-FR")}</span> },
        { key: "status", label: "Statut", render: (r) => <Badge variant={r.status === "paid" ? "default" : "outline"}>{r.status}</Badge> },
      ]}
      renderForm={(form, setForm) => (
        <FormGrid>
          <SelectField label="Agent *" value={form.employee_id} onChange={(v) => setForm({ ...form, employee_id: v })}
            options={employees.map((e) => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))} span={2} />
          <TextField label="Période *" value={form.period} onChange={(v) => setForm({ ...form, period: v })} required placeholder="2026-04" />
          <SelectField label="Statut" value={form.status} onChange={(v) => setForm({ ...form, status: v })}
            options={[{ value: "draft", label: "Brouillon" }, { value: "approved", label: "Approuvé" }, { value: "paid", label: "Payé" }]} />
          <TextField label="Salaire de base" value={form.base_salary as any} onChange={(v) => setForm({ ...form, base_salary: v as any })} type="number" />
          <TextField label="Primes" value={form.bonus as any} onChange={(v) => setForm({ ...form, bonus: v as any })} type="number" />
          <TextField label="Retenues" value={form.deductions as any} onChange={(v) => setForm({ ...form, deductions: v as any })} type="number" />
          <TextField label="Date de paiement" value={form.paid_at} onChange={(v) => setForm({ ...form, paid_at: v })} type="date" />
        </FormGrid>
      )}
    />
  );
};

export default Paie;
