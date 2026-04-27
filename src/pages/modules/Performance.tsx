import { CrudPage } from "@/components/dashboard/CrudPage";
import { TextField, AreaField, SelectField, FormGrid, cleanForm } from "@/lib/forms";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  id: string;
  employee_id: string;
  period: string;
  score: number | null;
  comments: string | null;
  reviewed_at: string | null;
}

const Performance = () => {
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  useEffect(() => {
    supabase.from("employees").select("id,first_name,last_name").order("last_name").then(({ data }) => setEmployees(data || []));
  }, []);

  return (
    <CrudPage<Review>
      title="Performance"
      subtitle="évaluation(s)"
      table="performance_reviews"
      orderBy={{ column: "reviewed_at", ascending: false }}
      searchFields={["period"]}
      defaultForm={{ employee_id: "", period: "", score: undefined, comments: "", reviewed_at: new Date().toISOString().slice(0, 10) }}
      validate={(f) => (!f.employee_id || !f.period ? "Agent et période requis" : null)}
      prepare={(f) => {
        const c = cleanForm(f as any);
        if (c.score === "") c.score = null;
        else if (c.score != null) c.score = Number(c.score);
        return c;
      }}
      columns={[
        { key: "employee_id", label: "Agent", render: (r) => {
          const e = employees.find((x) => x.id === r.employee_id);
          return e ? <span className="font-semibold">{e.first_name} {e.last_name}</span> : "—";
        }},
        { key: "period", label: "Période" },
        { key: "score", label: "Note /10", render: (r) =>
          r.score == null ? "—" :
          <Badge variant={r.score >= 7 ? "default" : r.score >= 5 ? "outline" : "destructive"}>{r.score}/10</Badge>
        },
        { key: "reviewed_at", label: "Date", render: (r) => r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString("fr-FR") : "—" },
      ]}
      renderForm={(form, setForm) => (
        <FormGrid>
          <SelectField label="Agent *" value={form.employee_id} onChange={(v) => setForm({ ...form, employee_id: v })}
            options={employees.map((e) => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))} span={2} />
          <TextField label="Période *" value={form.period} onChange={(v) => setForm({ ...form, period: v })} required placeholder="2026 T1" />
          <TextField label="Note /10" value={form.score as any} onChange={(v) => setForm({ ...form, score: v as any })} type="number" placeholder="0-10" />
          <TextField label="Date d'évaluation" value={form.reviewed_at} onChange={(v) => setForm({ ...form, reviewed_at: v })} type="date" span={2} />
          <AreaField label="Commentaires" value={form.comments} onChange={(v) => setForm({ ...form, comments: v })} />
        </FormGrid>
      )}
    />
  );
};

export default Performance;
