import { CrudPage } from "@/components/dashboard/CrudPage";
import { TextField, AreaField, SelectField, FormGrid, cleanForm } from "@/lib/forms";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  priority: string;
  status: string;
  due_date: string | null;
}

const priorityColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "secondary", medium: "outline", high: "default", urgent: "destructive",
};

const Taches = () => {
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  useEffect(() => {
    supabase.from("employees").select("id,first_name,last_name").order("last_name").then(({ data }) => setEmployees(data || []));
  }, []);

  return (
    <CrudPage<Task>
      title="Tâches & Projets"
      subtitle="tâche(s)"
      table="tasks"
      orderBy={{ column: "created_at", ascending: false }}
      searchFields={["title", "status", "priority"]}
      defaultForm={{ title: "", description: "", assignee_id: "", priority: "medium", status: "todo", due_date: "" }}
      validate={(f) => (!f.title ? "Titre requis" : null)}
      prepare={(f) => cleanForm(f as any)}
      columns={[
        { key: "title", label: "Tâche", render: (r) => <span className="font-semibold">{r.title}</span> },
        { key: "assignee_id", label: "Assigné à", render: (r) => {
          const e = employees.find((x) => x.id === r.assignee_id);
          return e ? `${e.first_name} ${e.last_name}` : "—";
        }},
        { key: "priority", label: "Priorité", render: (r) => <Badge variant={priorityColor[r.priority] || "outline"}>{r.priority}</Badge> },
        { key: "status", label: "Statut", render: (r) => <Badge variant={r.status === "done" ? "secondary" : "default"}>{r.status}</Badge> },
        { key: "due_date", label: "Échéance", render: (r) => r.due_date ? new Date(r.due_date).toLocaleDateString("fr-FR") : "—" },
      ]}
      renderForm={(form, setForm) => (
        <FormGrid>
          <TextField label="Titre *" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required span={2} />
          <SelectField label="Assigné à" value={form.assignee_id} onChange={(v) => setForm({ ...form, assignee_id: v })}
            options={employees.map((e) => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))} />
          <TextField label="Échéance" value={form.due_date} onChange={(v) => setForm({ ...form, due_date: v })} type="date" />
          <SelectField label="Priorité" value={form.priority} onChange={(v) => setForm({ ...form, priority: v })}
            options={[{ value: "low", label: "Basse" }, { value: "medium", label: "Moyenne" }, { value: "high", label: "Haute" }, { value: "urgent", label: "Urgente" }]} />
          <SelectField label="Statut" value={form.status} onChange={(v) => setForm({ ...form, status: v })}
            options={[{ value: "todo", label: "À faire" }, { value: "in_progress", label: "En cours" }, { value: "done", label: "Terminé" }, { value: "blocked", label: "Bloqué" }]} />
          <AreaField label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
        </FormGrid>
      )}
    />
  );
};

export default Taches;
