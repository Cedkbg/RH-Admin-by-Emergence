import { CrudPage } from "@/components/dashboard/CrudPage";
import { TextField, AreaField, SelectField, FormGrid, cleanForm } from "@/lib/forms";
import { Badge } from "@/components/ui/badge";

interface Legal { id: string; title: string; type: string | null; description: string | null; status: string; due_date: string | null; }

const Juridique = () => (
  <CrudPage<Legal>
    title="Juridique & Conformité"
    subtitle="dossier(s)"
    table="legal_records"
    orderBy={{ column: "created_at", ascending: false }}
    searchFields={["title", "type", "status"]}
    defaultForm={{ title: "", type: "contract", description: "", status: "active", due_date: "" }}
    validate={(f) => (!f.title ? "Titre requis" : null)}
    prepare={(f) => cleanForm(f as any)}
    columns={[
      { key: "title", label: "Dossier", render: (r) => <span className="font-semibold">{r.title}</span> },
      { key: "type", label: "Type", render: (r) => r.type || "—" },
      { key: "due_date", label: "Échéance", render: (r) => r.due_date ? new Date(r.due_date).toLocaleDateString("fr-FR") : "—" },
      { key: "status", label: "Statut", render: (r) =>
        <Badge variant={r.status === "active" ? "default" : r.status === "expired" ? "destructive" : "secondary"}>
          {r.status === "active" ? "Actif" : r.status === "expired" ? "Expiré" : r.status === "pending" ? "En attente" : r.status}
        </Badge>
      },
    ]}
    renderForm={(form, setForm) => (
      <FormGrid>
        <TextField label="Titre *" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required span={2} />
        <SelectField label="Type" value={form.type} onChange={(v) => setForm({ ...form, type: v })}
          options={[{ value: "contract", label: "Contrat" }, { value: "compliance", label: "Conformité" }, { value: "litigation", label: "Litige" }, { value: "policy", label: "Politique" }]} />
        <SelectField label="Statut" value={form.status} onChange={(v) => setForm({ ...form, status: v })}
          options={[{ value: "active", label: "Actif" }, { value: "pending", label: "En attente" }, { value: "expired", label: "Expiré" }, { value: "closed", label: "Clos" }]} />
        <TextField label="Échéance" value={form.due_date} onChange={(v) => setForm({ ...form, due_date: v })} type="date" span={2} />
        <AreaField label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
      </FormGrid>
    )}
  />
);

export default Juridique;
