import { CrudPage } from "@/components/dashboard/CrudPage";
import { TextField, AreaField, SelectField, FormGrid, cleanForm } from "@/lib/forms";
import { Badge } from "@/components/ui/badge";

interface Training { id: string; title: string; description: string | null; trainer: string | null; start_date: string | null; end_date: string | null; status: string; }

const Formation = () => (
  <CrudPage<Training>
    title="Formation"
    subtitle="session(s)"
    table="trainings"
    orderBy={{ column: "start_date", ascending: false }}
    searchFields={["title", "trainer", "status"]}
    defaultForm={{ title: "", description: "", trainer: "", start_date: "", end_date: "", status: "planned" }}
    validate={(f) => (!f.title ? "Titre requis" : null)}
    prepare={(f) => cleanForm(f as any)}
    columns={[
      { key: "title", label: "Formation", render: (r) => <span className="font-semibold">{r.title}</span> },
      { key: "trainer", label: "Formateur", render: (r) => r.trainer || "—" },
      { key: "start_date", label: "Début", render: (r) => r.start_date ? new Date(r.start_date).toLocaleDateString("fr-FR") : "—" },
      { key: "end_date", label: "Fin", render: (r) => r.end_date ? new Date(r.end_date).toLocaleDateString("fr-FR") : "—" },
      { key: "status", label: "Statut", render: (r) =>
        <Badge variant={r.status === "completed" ? "secondary" : r.status === "ongoing" ? "default" : "outline"}>
          {r.status === "planned" ? "Planifiée" : r.status === "ongoing" ? "En cours" : r.status === "completed" ? "Terminée" : r.status}
        </Badge>
      },
    ]}
    renderForm={(form, setForm) => (
      <FormGrid>
        <TextField label="Titre *" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required span={2} />
        <TextField label="Formateur" value={form.trainer} onChange={(v) => setForm({ ...form, trainer: v })} span={2} />
        <TextField label="Date début" value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} type="date" />
        <TextField label="Date fin" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} type="date" />
        <SelectField label="Statut" value={form.status} onChange={(v) => setForm({ ...form, status: v })}
          options={[{ value: "planned", label: "Planifiée" }, { value: "ongoing", label: "En cours" }, { value: "completed", label: "Terminée" }, { value: "cancelled", label: "Annulée" }]} span={2} />
        <AreaField label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
      </FormGrid>
    )}
  />
);

export default Formation;
