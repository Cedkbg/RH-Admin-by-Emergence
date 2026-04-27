import { CrudPage } from "@/components/dashboard/CrudPage";
import { TextField, AreaField, SelectField, FormGrid, cleanForm } from "@/lib/forms";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface JobOffer {
  id: string;
  title: string;
  direction_id: string | null;
  description: string | null;
  location: string | null;
  contract_type: string | null;
  status: string;
  posted_at: string | null;
  closing_date: string | null;
}

const Recrutement = () => {
  const [directions, setDirections] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    supabase.from("directions").select("id,name").order("code").then(({ data }) => setDirections(data || []));
  }, []);

  return (
    <CrudPage<JobOffer>
      title="Recrutement"
      subtitle="offre(s) d'emploi"
      table="job_offers"
      orderBy={{ column: "created_at", ascending: false }}
      searchFields={["title", "location", "contract_type", "status"]}
      defaultForm={{ title: "", direction_id: "", description: "", location: "", contract_type: "CDI", status: "open", posted_at: "", closing_date: "" }}
      validate={(f) => (!f.title ? "Titre requis" : null)}
      prepare={(f) => cleanForm(f as any)}
      columns={[
        { key: "title", label: "Poste", render: (r) => <span className="font-semibold">{r.title}</span> },
        { key: "contract_type", label: "Contrat", render: (r) => r.contract_type || "—" },
        { key: "location", label: "Lieu", render: (r) => r.location || "—" },
        {
          key: "status", label: "Statut",
          render: (r) => <Badge variant={r.status === "open" ? "default" : "secondary"}>
            {r.status === "open" ? "Ouvert" : r.status === "closed" ? "Fermé" : r.status}
          </Badge>,
        },
        { key: "closing_date", label: "Clôture", render: (r) => r.closing_date ? new Date(r.closing_date).toLocaleDateString("fr-FR") : "—" },
      ]}
      renderForm={(form, setForm) => (
        <FormGrid>
          <TextField label="Titre du poste *" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required span={2} />
          <SelectField label="Direction" value={form.direction_id} onChange={(v) => setForm({ ...form, direction_id: v })}
            options={directions.map((d) => ({ value: d.id, label: d.name }))} />
          <SelectField label="Type de contrat" value={form.contract_type} onChange={(v) => setForm({ ...form, contract_type: v })}
            options={[{ value: "CDI", label: "CDI" }, { value: "CDD", label: "CDD" }, { value: "Stage", label: "Stage" }, { value: "Consultant", label: "Consultant" }]} />
          <TextField label="Lieu" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
          <SelectField label="Statut" value={form.status} onChange={(v) => setForm({ ...form, status: v })}
            options={[{ value: "open", label: "Ouvert" }, { value: "closed", label: "Fermé" }, { value: "draft", label: "Brouillon" }]} />
          <TextField label="Date de publication" value={form.posted_at} onChange={(v) => setForm({ ...form, posted_at: v })} type="date" />
          <TextField label="Date de clôture" value={form.closing_date} onChange={(v) => setForm({ ...form, closing_date: v })} type="date" />
          <AreaField label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
        </FormGrid>
      )}
    />
  );
};

export default Recrutement;
