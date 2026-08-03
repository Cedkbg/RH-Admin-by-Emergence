import { useEffect, useRef, useState } from "react";
import {
  Settings as SettingsIcon, Save, ArrowLeft, ImageIcon, Upload, Wand2,
  Building2, Clock, Receipt, Gift, Award, Palette, ShieldCheck, Info,
} from "lucide-react";
import SetupWizard from "@/components/parametres/SetupWizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

/* =========================================================
   Schéma centralisé du profil entreprise
   Toutes ces clés sont enregistrées dans app_settings (jsonb).
   ========================================================= */
type Json = any;

const DEFAULTS = {
  // Entreprise
  company_name: "EMERGENCE DRC",
  company_legal_form: "SARL",
  company_sigle: "",
  company_rccm: "",
  company_id_nat: "",
  company_nif: "",
  company_cnss_num: "",
  company_inpp_num: "",
  company_address: "",
  company_city: "Kinshasa",
  company_province: "Kinshasa",
  company_country: "RDC",
  company_phone: "",
  company_email: "",
  company_website: "",
  about: "Système intégré de gestion des ressources humaines.",
  payment_day: 25,
  ui_color_primary: "#0052CC",
  ui_color_secondary: "#F4F5F7",

  // Temps de travail
  work_hours_per_day: 8,
  work_days_per_week: 5,
  overtime_rate: 130,          // %
  weekend_rate: 150,
  holiday_rate: 200,

  // Retenues légales (RDC)
  cnss_patronal: 13,           // %
  cnss_ouvrier: 5,
  inpp_rate: 3,
  onem_rate: 0.2,
  ipr_mode: "auto",            // auto | manuel
  ipr_brackets: [
    { from: 0,        to: 162000,  rate: 0 },
    { from: 162001,   to: 1800000, rate: 15 },
    { from: 1800001,  to: 3600000, rate: 30 },
    { from: 3600001,  to: null,    rate: 40 },
  ] as Array<{ from: number; to: number | null; rate: number }>,

  // Avantages
  avantages: {
    transport:           { enabled: true,  mode: "fixed", value: 0 },
    logement:            { enabled: true,  mode: "fixed", value: 0 },
    communication:       { enabled: true,  mode: "fixed", value: 0 },
    sante:               { enabled: true,  mode: "fixed", value: 0 },
    allocation_familiale:{ enabled: true,  mode: "fixed", value: 0 },
    prime_risque:        { enabled: false, mode: "fixed", value: 0 },
  } as Record<string, { enabled: boolean; mode: "fixed" | "percent"; value: number }>,

  // Primes
  primes: [
    { key: "rendement",      label: "Prime de rendement",      desc: "Basée sur les objectifs trimestriels.", value: 50000,  enabled: true  },
    { key: "ponctualite",    label: "Prime de ponctualité",    desc: "Bonus mensuel pour absence de retards.", value: 25000,  enabled: true  },
    { key: "responsabilite", label: "Prime de responsabilité", desc: "Indemnité pour postes d'encadrement.",   value: 120000, enabled: true  },
    { key: "logement",       label: "Prime de logement",       desc: "Obligation légale ou contractuelle.",    value: 150000, enabled: true  },
    { key: "risque",         label: "Prime de risque",         desc: "Travaux insalubres ou dangereux.",       value: 0,      enabled: false },
    { key: "exceptionnelle", label: "Prime exceptionnelle",    desc: "Fin d'année ou bonus spéciaux.",         value: 0,      enabled: false },
  ],

  // Apparence
  ui_theme: "system",     // light | dark | system
  ui_accent: "#1e3a8a",
  ui_currency: "CDF",
  ui_date_format: "dd/MM/yyyy",
  ui_language: "fr",
};

const ACCENTS = ["#1e3a8a", "#16a34a", "#7c3aed", "#ea580c", "#dc2626"];

const Parametres = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [v, setV] = useState<Record<string, Json>>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setField = (k: string, val: Json) => setV((s) => ({ ...s, [k]: val }));

  const refresh = async () => {
    const { data } = await supabase.from("app_settings").select("key,value");
    const next: Record<string, Json> = { ...DEFAULTS };
    let logo = "";
    (data || []).forEach((r: any) => {
      const raw = r.value;
      const val = raw && typeof raw === "object" && "value" in raw ? raw.value : raw;
      if (r.key === "company_logo") { logo = typeof val === "string" ? val : ""; return; }
      if (r.key in DEFAULTS) next[r.key] = val;
    });
    setV(next);
    setLogoUrl(logo);
  };
  useEffect(() => { refresh(); }, []);

  const currentOrgId = async (): Promise<string | null> => {
    const { data } = await supabase.from("organization_members").select("organization_id").maybeSingle();
    return (data as any)?.organization_id ?? null;
  };

  const uploadLogo = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Veuillez sélectionner une image");
    setUploadingLogo(true);
    const orgId = await currentOrgId();
    const ext = file.name.split(".").pop() || "png";
    const path = `${orgId ?? "global"}/logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("branding").upload(path, file, { upsert: true, cacheControl: "3600" });
    if (upErr) { setUploadingLogo(false); return toast.error(upErr.message); }
    const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "company_logo", value: { value: pub.publicUrl } }, { onConflict: "organization_id,key" });
    if (orgId) await supabase.from("organizations").update({ logo_url: pub.publicUrl }).eq("id", orgId);
    setUploadingLogo(false);
    if (error) return toast.error(error.message);
    setLogoUrl(pub.publicUrl);
    toast.success("Logo de l'entreprise mis à jour");
  };

  const saveAll = async () => {
    setSaving(true);
    const rows = Object.entries(v).map(([key, value]) => ({ key, value: { value } }));
    const { error } = await supabase.from("app_settings").upsert(rows, { onConflict: "organization_id,key" });
    const orgId = await currentOrgId();
    if (orgId) {
      await supabase.from("organizations").update({
        name: (v.company_name as string) || undefined,
        legal_name: (v.company_legal_form as string) || null,
        address: (v.company_address as string) || null,
        city: (v.company_city as string) || null,
        country: (v.company_country as string) || null,
        phone: (v.company_phone as string) || null,
        email: (v.company_email as string) || null,
        website: (v.company_website as string) || null,
        rccm: (v.company_rccm as string) || null,
        id_national: (v.company_id_nat as string) || null,
        tax_number: (v.company_nif as string) || null,
      }).eq("id", orgId);
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profil entreprise enregistré");
  };

  // Helpers UI
  const num = (k: string, suffix?: string) => (
    <div className="relative">
      <Input
        type="number"
        value={v[k] ?? 0}
        onChange={(e) => setField(k, e.target.value === "" ? 0 : Number(e.target.value))}
        disabled={!isAdmin}
        className={suffix ? "pr-10" : ""}
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
    </div>
  );

  const txt = (k: string, placeholder?: string) => (
    <Input value={v[k] ?? ""} onChange={(e) => setField(k, e.target.value)} disabled={!isAdmin} placeholder={placeholder} />
  );

  const monthlyHours = ((Number(v.work_hours_per_day) || 0) * (Number(v.work_days_per_week) || 0) * 52) / 12;

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in p-4">
      <Button variant="ghost" onClick={() => navigate(-1)} className="w-fit -ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" /> Paramètres — Profil de l'entreprise
          </h1>
          <p className="text-sm text-muted-foreground">
            Configurez l'identité, la paie, les retenues et l'apparence. Tout est enregistré dans le profil entreprise.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isAdmin && <Badge variant="secondary">Lecture seule</Badge>}
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => setWizardOpen(true)}>
                <Wand2 className="mr-2 h-4 w-4" /> Configuration assistée
              </Button>
              <Button onClick={saveAll} disabled={saving}>
                <Save className="mr-2 h-4 w-4" /> {saving ? "Enregistrement…" : "Enregistrer tout"}
              </Button>
            </>
          )}
        </div>
      </div>

      <SetupWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        initial={v}
        initialLogo={logoUrl}
        onSaved={refresh}
      />

      <Tabs defaultValue="entreprise" className="space-y-4">
        <TabsList className="flex w-full flex-wrap h-auto">
          <TabsTrigger value="entreprise"><Building2 className="h-4 w-4 mr-2" />Entreprise</TabsTrigger>
          <TabsTrigger value="temps"><Clock className="h-4 w-4 mr-2" />Temps</TabsTrigger>
          <TabsTrigger value="retenues"><Receipt className="h-4 w-4 mr-2" />Retenues</TabsTrigger>
          <TabsTrigger value="avantages"><Gift className="h-4 w-4 mr-2" />Avantages</TabsTrigger>
          <TabsTrigger value="primes"><Award className="h-4 w-4 mr-2" />Primes</TabsTrigger>
          <TabsTrigger value="apparence"><Palette className="h-4 w-4 mr-2" />Apparence</TabsTrigger>
        </TabsList>

        {/* ENTREPRISE */}
        <TabsContent value="entreprise" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Logo</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-xl border bg-white flex items-center justify-center overflow-hidden shrink-0">
                  {logoUrl ? <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" /> : <ImageIcon className="h-8 w-8 text-muted-foreground" />}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-xs text-muted-foreground">PNG, JPG ou SVG. Visible dans toute l'application.</p>
                  <input ref={fileInputRef} type="file" accept="image/*" hidden
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ""; }} />
                  <Button variant="outline" size="sm" disabled={!isAdmin || uploadingLogo} onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />{uploadingLogo ? "Téléversement…" : "Changer le logo"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Identité & coordonnées</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Nom de l'entreprise</Label>{txt("company_name")}</div>
              <div><Label>Forme juridique</Label>{txt("company_legal_form", "SARL, SAS…")}</div>
              <div><Label>RCCM</Label>{txt("company_rccm")}</div>
              <div><Label>ID NAT</Label>{txt("company_id_nat")}</div>
              <div><Label>N° Impôt (NIF)</Label>{txt("company_nif")}</div>
              <div><Label>Téléphone</Label>{txt("company_phone", "+243 …")}</div>
              <div><Label>Email</Label>{txt("company_email")}</div>
              <div><Label>Site web</Label>{txt("company_website")}</div>
              <div className="md:col-span-2"><Label>Adresse</Label>{txt("company_address")}</div>
              <div><Label>Ville</Label>{txt("company_city")}</div>
              <div><Label>Pays</Label>{txt("company_country")}</div>
              <div className="md:col-span-2">
                <Label>À propos</Label>
                <Textarea rows={3} value={v.about ?? ""} onChange={(e) => setField("about", e.target.value)} disabled={!isAdmin} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEMPS */}
        <TabsContent value="temps" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Régime standard</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Heures par jour</Label>{num("work_hours_per_day", "h")}</div>
              <div><Label>Jours par semaine</Label>{num("work_days_per_week", "j")}</div>
              <div className="md:col-span-2 rounded-lg bg-muted/50 p-3 text-sm flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                Heures mensuelles théoriques : <strong>{monthlyHours.toFixed(2)} h</strong>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Majorations</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Heures supplémentaires</Label>{num("overtime_rate", "%")}</div>
              <div><Label>Travail week-end</Label>{num("weekend_rate", "%")}</div>
              <div><Label>Jours fériés</Label>{num("holiday_rate", "%")}</div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RETENUES */}
        <TabsContent value="retenues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />CNSS</span>
                <Badge variant="secondary">Total : {(Number(v.cnss_patronal) + Number(v.cnss_ouvrier)).toFixed(2)} %</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Part patronale</Label>{num("cnss_patronal", "%")}</div>
              <div><Label>Part ouvrière</Label>{num("cnss_ouvrier", "%")}</div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">INPP</CardTitle></CardHeader>
              <CardContent>{num("inpp_rate", "%")}</CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">ONEM</CardTitle></CardHeader>
              <CardContent>{num("onem_rate", "%")}</CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Barème IPR</span>
                <Select value={v.ipr_mode} onValueChange={(val) => setField("ipr_mode", val)} disabled={!isAdmin}>
                  <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="manuel">Manuel</SelectItem>
                  </SelectContent>
                </Select>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr><th className="text-left p-2">Tranche (CDF)</th><th className="text-right p-2">Taux (%)</th></tr>
                  </thead>
                  <tbody>
                    {(v.ipr_brackets as any[]).map((b, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">
                          {b.from.toLocaleString()} – {b.to ? b.to.toLocaleString() : "et plus"}
                        </td>
                        <td className="p-2 text-right">
                          {v.ipr_mode === "manuel" ? (
                            <Input
                              type="number"
                              className="w-24 ml-auto"
                              value={b.rate}
                              onChange={(e) => {
                                const arr = [...(v.ipr_brackets as any[])];
                                arr[i] = { ...arr[i], rate: Number(e.target.value) };
                                setField("ipr_brackets", arr);
                              }}
                              disabled={!isAdmin}
                            />
                          ) : `${b.rate} %`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Barème IPR RDC 2024 appliqué en mode automatique.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AVANTAGES */}
        <TabsContent value="avantages" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Indemnités & avantages</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(v.avantages as any).map(([key, a]: [string, any]) => (
                <div key={key} className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="capitalize">{key.replace(/_/g, " ")}</Label>
                    <Switch
                      checked={a.enabled}
                      onCheckedChange={(c) => setField("avantages", { ...v.avantages, [key]: { ...a, enabled: c } })}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Select
                      value={a.mode}
                      onValueChange={(val) => setField("avantages", { ...v.avantages, [key]: { ...a, mode: val } })}
                      disabled={!isAdmin || !a.enabled}
                    >
                      <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Montant fixe</SelectItem>
                        <SelectItem value="percent">Pourcentage</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={a.value}
                      onChange={(e) => setField("avantages", { ...v.avantages, [key]: { ...a, value: Number(e.target.value) } })}
                      disabled={!isAdmin || !a.enabled}
                    />
                    <span className="text-xs text-muted-foreground w-10">{a.mode === "percent" ? "%" : "CDF"}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground flex gap-2">
            <Info className="h-4 w-4 shrink-0" />
            Les avantages activés alimentent automatiquement les calculs IPR/CNSS sur la fiche de paie.
          </div>
        </TabsContent>

        {/* PRIMES */}
        <TabsContent value="primes" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Catalogue des primes</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(v.primes as any[]).map((p, i) => (
                <div key={p.key} className="rounded-lg border p-3 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[180px]">
                    <div className="font-medium text-sm">{p.label}</div>
                    <div className="text-xs text-muted-foreground">{p.desc}</div>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">Valeur par défaut (CDF)</Label>
                    <Input
                      type="number"
                      className="w-32"
                      value={p.value}
                      onChange={(e) => {
                        const arr = [...(v.primes as any[])];
                        arr[i] = { ...arr[i], value: Number(e.target.value) };
                        setField("primes", arr);
                      }}
                      disabled={!isAdmin || !p.enabled}
                    />
                  </div>
                  <Switch
                    checked={p.enabled}
                    onCheckedChange={(c) => {
                      const arr = [...(v.primes as any[])];
                      arr[i] = { ...arr[i], enabled: c };
                      setField("primes", arr);
                    }}
                    disabled={!isAdmin}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* APPARENCE */}
        <TabsContent value="apparence" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Thème & accent</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Thème</Label>
                <Select value={v.ui_theme} onValueChange={(val) => setField("ui_theme", val)} disabled={!isAdmin}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Clair</SelectItem>
                    <SelectItem value="dark">Sombre</SelectItem>
                    <SelectItem value="system">Automatique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Couleur d'accentuation</Label>
                <div className="flex items-center gap-2 mt-2">
                  {ACCENTS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => setField("ui_accent", c)}
                      className={`h-9 w-9 rounded-md border-2 transition ${v.ui_accent === c ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Région & langue</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Langue</Label>
                <Select value={v.ui_language} onValueChange={(val) => setField("ui_language", val)} disabled={!isAdmin}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français (RDC)</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Format de date</Label>
                <Select value={v.ui_date_format} onValueChange={(val) => setField("ui_date_format", val)} disabled={!isAdmin}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dd/MM/yyyy">jj/mm/aaaa</SelectItem>
                    <SelectItem value="yyyy-MM-dd">aaaa-mm-jj</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Devise</Label>
                <Select value={v.ui_currency} onValueChange={(val) => setField("ui_currency", val)} disabled={!isAdmin}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CDF">CDF (Franc congolais)</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isAdmin && (
        <div className="sticky bottom-4 flex justify-end">
          <Button size="lg" onClick={saveAll} disabled={saving} className="shadow-lg">
            <Save className="mr-2 h-4 w-4" /> {saving ? "Enregistrement…" : "Enregistrer le profil entreprise"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Parametres;
