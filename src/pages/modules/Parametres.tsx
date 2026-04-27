import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const KEYS = {
  company_name: { label: "Nom de l'entreprise", default: "EMERGENCE DRC" },
  company_address: { label: "Adresse", default: "" },
  company_phone: { label: "Téléphone", default: "" },
  company_email: { label: "Email de contact", default: "" },
  about: { label: "À propos", default: "Système intégré de gestion des ressources humaines.", textarea: true },
};

const Parametres = () => {
  const { isAdmin } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    const { data } = await supabase.from("app_settings").select("key,value");
    const map: Record<string, string> = {};
    Object.entries(KEYS).forEach(([k, v]) => (map[k] = v.default));
    (data || []).forEach((r: any) => {
      try { map[r.key] = typeof r.value === "string" ? r.value : r.value?.value ?? JSON.stringify(r.value); }
      catch { map[r.key] = String(r.value); }
    });
    setValues(map);
  };
  useEffect(() => { refresh(); }, []);

  const save = async () => {
    setSaving(true);
    const rows = Object.entries(values).map(([key, value]) => ({ key, value: { value } }));
    const { error } = await supabase.from("app_settings").upsert(rows);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Paramètres enregistrés");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><SettingsIcon className="h-6 w-6" /> Paramètres</h1>
          <p className="text-sm text-muted-foreground">Configuration générale de l'application.</p>
        </div>
        {!isAdmin && <Badge variant="secondary">Lecture seule</Badge>}
      </div>

      <section className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        {Object.entries(KEYS).map(([key, def]) => (
          <div key={key}>
            <Label>{def.label}</Label>
            {def.textarea ? (
              <Textarea
                value={values[key] ?? ""}
                onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                disabled={!isAdmin}
                rows={3}
              />
            ) : (
              <Input
                value={values[key] ?? ""}
                onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                disabled={!isAdmin}
              />
            )}
          </div>
        ))}
        {isAdmin && (
          <Button onClick={save} disabled={saving} className="w-full">
            <Save className="mr-2 h-4 w-4" /> {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        )}
      </section>
    </div>
  );
};

export default Parametres;
