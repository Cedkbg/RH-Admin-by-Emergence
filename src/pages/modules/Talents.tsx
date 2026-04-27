import { CrudPage } from "@/components/dashboard/CrudPage";
import { TextField, AreaField, SelectField, FormGrid, cleanForm } from "@/lib/forms";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Talent { id: string; employee_id: string; potential: string; skills: string | null; career_plan: string | null; }

const Talents = () => {
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  useEffect(() => {
    supabase.from("employees").select("id,first_name,last_name").order("last_name").then(({ data }) => setEmployees(data || []));
  }, []);

  return (
    <CrudPage<Talent>
      title="Gestion des talents"
      subtitle="profil(s) talent"
      table="talents"
      orderBy={{ column: "created_at", ascending: false }}
      searchFields={["potential", "skills"]}
      defaultForm={{ employee_id: "", potential: "medium", skills: "", career_plan: "" }}
      validate={(f) => (!f.employee_id ? "Agent requis" : null)}
      prepare={(f) => cleanForm(f as any)}
      columns={[
        { key: "employee_id", label: "Agent", render: (r) => {
          const e = employees.find((x) => x.id === r.employee_id);
          return e ? <span className="font-semibold">{e.first_name} {e.last_name}</span> : "—";
        }},
        { key: "potential", label: "Potentiel", render: (r) =>
          <Badge variant={r.potential === "high" ? "default" : r.potential === "low" ? "secondary" : "outline"}>
            {r.potential === "high" ? "Élevé" : r.potential === "low" ? "Faible" : "Moyen"}
          </Badge>
        },
        { key: "skills", label: "Compétences clés", render: (r) => r.skills || "—" },
      ]}
      renderForm={(form, setForm) => (
        <FormGrid>
          <SelectField label="Agent *" value={form.employee_id} onChange={(v) => setForm({ ...form, employee_id: v })}
            options={employees.map((e) => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))} span={2} />
          <SelectField label="Potentiel" value={form.potential} onChange={(v) => setForm({ ...form, potential: v })}
            options={[{ value: "low", label: "Faible" }, { value: "medium", label: "Moyen" }, { value: "high", label: "Élevé" }]} span={2} />
          <AreaField label="Compétences clés" value={form.skills} onChange={(v) => setForm({ ...form, skills: v })} />
          <AreaField label="Plan de carrière" value={form.career_plan} onChange={(v) => setForm({ ...form, career_plan: v })} />
        </FormGrid>
      )}
    />
  );
};

export default Talents;
