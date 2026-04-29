import { useEffect, useRef, useState } from "react";
import { Settings as SettingsIcon, Save, ArrowLeft, ImageIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface SettingDef { label: string; default: string; textarea?: boolean }
const KEYS: Record<string, SettingDef> = {
  company_name: { label: "Nom de l'entreprise", default: "EMERGENCE DRC" },
  company_address: { label: "Adresse", default: "" },
  company_phone: { label: "Téléphone", default: "" },
  company_email: { label: "Email de contact", default: "" },
  about: { label: "À propos", default: "Système intégré de gestion des ressources humaines.", textarea: true },
};

const Parametres = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const { data } = await supabase.from("app_settings").select("key,value");
    const map: Record<string, string> = {};
    Object.entries(KEYS).forEach(([k, v]) => (map[k] = v.default));
    let logo = "";
    (data || []).forEach((r: any) => {
      try {
        const v = typeof r.value === "string" ? r.value : r.value?.value ?? JSON.stringify(r.value);
        if (r.key === "company_logo") logo = v;
        else map[r.key] = v;
      } catch { map[r.key] = String(r.value); }
    });
    setValues(map);
    setLogoUrl(logo);
  };
  useEffect(() => { refresh(); }, []);

  const uploadLogo = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }
    setUploadingLogo(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("branding")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (upErr) { setUploadingLogo(false); toast.error(upErr.message); return; }
    const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
    const { error: setErr } = await supabase
      .from("app_settings")
      .upsert({ key: "company_logo", value: { value: pub.publicUrl } });
    setUploadingLogo(false);
    if (setErr) { toast.error(setErr.message); return; }
    setLogoUrl(pub.publicUrl);
    toast.success("Logo mis à jour. Rechargez l'application pour voir le changement partout.");
  };

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
      <Button variant="ghost" onClick={() => navigate(-1)} className="w-fit -ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
      </Button>

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
