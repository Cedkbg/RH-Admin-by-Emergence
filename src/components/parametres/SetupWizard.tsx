import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, Save, Upload, ImageIcon,
  Users, Clock, Receipt, Building2, FileText, BarChart3, Scale, MapPin, Palette, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  initial: Record<string, any>;
  initialLogo: string;
  onSaved: () => void;
}

const PROVINCES = [
  "Kinshasa", "Kongo-Central", "Kwango", "Kwilu", "Mai-Ndombe", "Kasaï", "Kasaï-Central",
  "Kasaï-Oriental", "Lomami", "Sankuru", "Maniema", "Sud-Kivu", "Nord-Kivu", "Ituri",
  "Haut-Uele", "Bas-Uele", "Tshopo", "Mongala", "Nord-Ubangi", "Sud-Ubangi", "Équateur",
  "Tshuapa", "Tanganyika", "Haut-Lomami", "Lualaba", "Haut-Katanga",
];

const FEATURES = [
  { icon: Users,    title: "Gestion des employés",     desc: "Dossiers du personnel, contrats et documents d'identité sécurisés." },
  { icon: Clock,    title: "Gestion des présences",    desc: "Heures travaillées, congés et absences avec workflow de validation." },
  { icon: Wallet,   title: "Gestion des salaires",     desc: "Calcul automatisé des primes, heures supplémentaires et retenues." },
  { icon: Scale,    title: "CNSS / INPP / ONEM",       desc: "Déclarations sociales conformes aux taux légaux de la RDC." },
  { icon: FileText, title: "Fiches de paie PDF",       desc: "Bulletins de paie clairs, détaillés et conformes au code du travail." },
  { icon: BarChart3,title: "Rapports RH",              desc: "Performance, turnover et masse salariale en temps réel." },
];

const OVERTIME = [125, 130, 150];
const WEEKEND = [150, 175, 200];
const HOLIDAY = [200, 250];

export default function SetupWizard({ open, onClose, initial, initialLogo, onSaved }: Props) {
  const [step, setStep] = useState(0);
  const [v, setV] = useState<Record<string, any>>(initial);
  const [logoUrl, setLogoUrl] = useState(initialLogo);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) { setV(initial); setLogoUrl(initialLogo); setStep(0); } }, [open, initial, initialLogo]);

  if (!open) return null;

  const set = (k: string, val: any) => setV((s) => ({ ...s, [k]: val }));
  const monthlyHours = ((Number(v.work_hours_per_day) || 0) * (Number(v.work_days_per_week) || 0) * 52) / 12;

  const currentOrgId = async (): Promise<string | null> => {
    const { data } = await supabase.from("organization_members").select("organization_id").maybeSingle();
    return (data as any)?.organization_id ?? null;
  };

  const uploadLogo = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Veuillez sélectionner une image");
    setUploading(true);
    const orgId = await currentOrgId();
    const ext = file.name.split(".").pop() || "png";
    const path = `${orgId ?? "global"}/logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("branding").upload(path, file, { upsert: true, cacheControl: "3600" });
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
    await supabase.from("app_settings").upsert(
      { key: "company_logo", value: { value: pub.publicUrl } },
      { onConflict: "organization_id,key" },
    );
    if (orgId) await supabase.from("organizations").update({ logo_url: pub.publicUrl }).eq("id", orgId);
    setUploading(false);
    setLogoUrl(pub.publicUrl);
    toast.success("Logo téléversé");
  };

  const persist = async (final = false) => {
    setSaving(true);
    const rows = Object.entries(v).map(([key, value]) => ({ key, value: { value } }));
    const { error } = await supabase.from("app_settings").upsert(rows, { onConflict: "organization_id,key" });
    const orgId = await currentOrgId();
    if (orgId && v.company_name) {
      await supabase.from("organizations").update({ name: String(v.company_name) }).eq("id", orgId);
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(final ? "Configuration terminée ✅" : "Brouillon enregistré");
    onSaved();
    if (final) onClose();
  };

  const steps = ["Bienvenue", "Identité légale", "Branding & finance", "Temps de travail", "Confirmation"];
  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const ChoiceBtn = ({ active, onClick, children, badge }: any) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all text-left",
        active ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40 bg-background"
      )}
    >
      {children}
      {badge && active && (
        <span className="absolute top-2 right-2 text-[9px] uppercase bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-bold">{badge}</span>
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="mx-auto max-w-4xl p-4 md:p-8">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Étape {step + 1} / {steps.length} — {steps[step]}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>Fermer</Button>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
        </div>

        {/* STEP 0 — WELCOME */}
        {step === 0 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Bienvenue dans RH & Paie Pro</h1>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Configurez votre organisation en quelques minutes afin de gérer vos employés, présences,
                rémunérations et déclarations sociales en conformité avec la législation de la RDC.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-center pt-4">
              <Button size="lg" onClick={next}>
                Commencer la configuration <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 1 — IDENTITÉ LÉGALE */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold">Informations légales & coordonnées</h2>
              <p className="text-sm text-muted-foreground">Configurez les paramètres légaux de votre organisation pour assurer la conformité RDC.</p>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Scale className="h-4 w-4 text-primary" />Informations légales</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Nom de l'entreprise *</Label><Input value={v.company_name ?? ""} onChange={(e) => set("company_name", e.target.value)} placeholder="Ex: Congo Services SARL" /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Sigle</Label><Input value={v.company_sigle ?? ""} onChange={(e) => set("company_sigle", e.target.value)} placeholder="Ex: CSS" /></div>
                  <div><Label>RCCM</Label><Input value={v.company_rccm ?? ""} onChange={(e) => set("company_rccm", e.target.value)} placeholder="CD/KNG/RCCM/..." /></div>
                  <div><Label>ID NAT</Label><Input value={v.company_id_nat ?? ""} onChange={(e) => set("company_id_nat", e.target.value)} placeholder="01-..." /></div>
                  <div><Label>Numéro Impôt (NIF)</Label><Input value={v.company_nif ?? ""} onChange={(e) => set("company_nif", e.target.value)} placeholder="A0..." /></div>
                  <div><Label>Numéro CNSS</Label><Input value={v.company_cnss_num ?? ""} onChange={(e) => set("company_cnss_num", e.target.value)} placeholder="Ex: 10 chiffres" /></div>
                  <div><Label>Numéro INPP</Label><Input value={v.company_inpp_num ?? ""} onChange={(e) => set("company_inpp_num", e.target.value)} placeholder="Numéro d'affiliation" /></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />Coordonnées</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Adresse</Label><Input value={v.company_address ?? ""} onChange={(e) => set("company_address", e.target.value)} placeholder="N°, Avenue, Quartier, Commune" /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Ville</Label><Input value={v.company_city ?? ""} onChange={(e) => set("company_city", e.target.value)} placeholder="Kinshasa, Goma, Lubumbashi..." /></div>
                  <div>
                    <Label>Province</Label>
                    <Select value={v.company_province ?? "Kinshasa"} onValueChange={(val) => set("company_province", val)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PROVINCES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Téléphone</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 bg-muted text-xs text-muted-foreground">+243</span>
                      <Input className="rounded-l-none" value={v.company_phone ?? ""} onChange={(e) => set("company_phone", e.target.value)} placeholder="81 234 5678" />
                    </div>
                  </div>
                  <div><Label>Email</Label><Input type="email" value={v.company_email ?? ""} onChange={(e) => set("company_email", e.target.value)} placeholder="contact@entreprise.cd" /></div>
                </div>
                <div><Label>Site web</Label><Input value={v.company_website ?? ""} onChange={(e) => set("company_website", e.target.value)} placeholder="https://www.entreprise.cd" /></div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 2 — BRANDING & FINANCE */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold">Branding & informations financières</h2>
              <p className="text-sm text-muted-foreground">Personnalisez l'apparence et définissez les paramètres de paie de base.</p>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palette className="h-4 w-4 text-primary" />Branding</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div>
                    <input ref={fileRef} type="file" accept="image/*" hidden
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ""; }} />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/30 flex flex-col items-center justify-center text-center p-4 transition-colors"
                    >
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                          <div className="text-sm font-medium">Zone d'upload logo</div>
                          <div className="text-xs text-muted-foreground">PNG, JPG ou SVG (Max 2MB)</div>
                        </>
                      )}
                    </button>
                    {uploading && <p className="text-xs text-muted-foreground mt-2 text-center">Téléversement…</p>}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label>Couleur principale</Label>
                      <div className="flex items-center gap-2 mt-1.5">
                        <input type="color" value={v.ui_color_primary ?? "#0052CC"} onChange={(e) => set("ui_color_primary", e.target.value)} className="h-10 w-12 rounded border cursor-pointer" />
                        <Input value={v.ui_color_primary ?? "#0052CC"} onChange={(e) => set("ui_color_primary", e.target.value)} className="font-mono" />
                      </div>
                    </div>
                    <div>
                      <Label>Couleur secondaire</Label>
                      <div className="flex items-center gap-2 mt-1.5">
                        <input type="color" value={v.ui_color_secondary ?? "#F4F5F7"} onChange={(e) => set("ui_color_secondary", e.target.value)} className="h-10 w-12 rounded border cursor-pointer" />
                        <Input value={v.ui_color_secondary ?? "#F4F5F7"} onChange={(e) => set("ui_color_secondary", e.target.value)} className="font-mono" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" />Informations financières</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Devise de tenue de paie</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    {["USD", "CDF", "EUR"].map((c) => (
                      <ChoiceBtn key={c} active={v.ui_currency === c} onClick={() => set("ui_currency", c)}>
                        <div className="text-center font-semibold">{c}</div>
                      </ChoiceBtn>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Jour habituel de paiement</Label>
                  <Select value={String(v.payment_day ?? 25)} onValueChange={(val) => set("payment_day", Number(val))}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <SelectItem key={d} value={String(d)}>{d} du mois</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 3 — TEMPS DE TRAVAIL */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold">Temps de travail</h2>
              <p className="text-sm text-muted-foreground">Configurez les règles de temps pour assurer la conformité avec le code du travail de la RDC.</p>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Régime standard</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Heures par jour</Label><Input type="number" value={v.work_hours_per_day ?? 8} onChange={(e) => set("work_hours_per_day", Number(e.target.value))} /></div>
                  <div><Label>Jours par semaine</Label><Input type="number" value={v.work_days_per_week ?? 5} onChange={(e) => set("work_days_per_week", Number(e.target.value))} /></div>
                </div>
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <div className="text-xs text-muted-foreground">Heures mensuelles théoriques</div>
                  <div className="text-lg font-bold text-primary">{monthlyHours.toFixed(2)} h</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Heures supplémentaires</CardTitle>
                <p className="text-xs text-muted-foreground border-l-2 border-primary pl-2">Taux légaux recommandés pour la RDC.</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {OVERTIME.map((r) => (
                    <ChoiceBtn key={r} active={Number(v.overtime_rate) === r} onClick={() => set("overtime_rate", r)} badge={r === 130 ? "Défaut" : null}>
                      <div className="text-center font-semibold">{r}%{r === 130 && Number(v.overtime_rate) !== 130 ? " (Défaut)" : ""}</div>
                    </ChoiceBtn>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Travail week-end</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {WEEKEND.map((r) => (
                    <ChoiceBtn key={r} active={Number(v.weekend_rate) === r} onClick={() => set("weekend_rate", r)} badge={r === 150 ? "Défaut" : null}>
                      <div className="font-semibold">Taux {r}%</div>
                    </ChoiceBtn>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Travail jours fériés</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {HOLIDAY.map((r) => (
                    <ChoiceBtn key={r} active={Number(v.holiday_rate) === r} onClick={() => set("holiday_rate", r)} badge={r === 200 ? "Défaut" : null}>
                      <div className="font-semibold">Taux {r}%</div>
                    </ChoiceBtn>
                  ))}
                  <p className="text-xs text-primary flex items-center gap-1 pt-1"><Check className="h-3 w-3" />Conforme à l'Arrêté Ministériel</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* STEP 4 — CONFIRMATION */}
        {step === 4 && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center space-y-2">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Récapitulatif</h2>
              <p className="text-sm text-muted-foreground">Vérifiez vos informations avant enregistrement.</p>
            </div>
            <Card>
              <CardContent className="p-4 space-y-3 text-sm">
                <Row label="Entreprise" value={`${v.company_name || "—"}${v.company_sigle ? ` (${v.company_sigle})` : ""}`} />
                <Row label="RCCM / ID NAT / NIF" value={[v.company_rccm, v.company_id_nat, v.company_nif].filter(Boolean).join(" • ") || "—"} />
                <Row label="CNSS / INPP" value={[v.company_cnss_num, v.company_inpp_num].filter(Boolean).join(" • ") || "—"} />
                <Row label="Adresse" value={`${v.company_address || "—"}, ${v.company_city || ""} (${v.company_province || ""})`} />
                <Row label="Contact" value={[v.company_phone && `+243 ${v.company_phone}`, v.company_email].filter(Boolean).join(" • ") || "—"} />
                <Row label="Devise / Paiement" value={`${v.ui_currency} — le ${v.payment_day || 25} du mois`} />
                <Row label="Temps" value={`${v.work_hours_per_day}h × ${v.work_days_per_week}j → ${monthlyHours.toFixed(2)} h/mois`} />
                <Row label="Majorations" value={`HS ${v.overtime_rate}% • WE ${v.weekend_rate}% • Fériés ${v.holiday_rate}%`} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* NAVIGATION */}
        <div className="flex items-center justify-between pt-8 mt-6 border-t">
          <Button variant="ghost" onClick={prev} disabled={step === 0}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Précédent
          </Button>
          <div className="flex items-center gap-2">
            {step > 0 && step < 4 && (
              <Button variant="outline" onClick={() => persist(false)} disabled={saving}>
                <Save className="mr-2 h-4 w-4" /> Enregistrer brouillon
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button onClick={next}>Suivant <ArrowRight className="ml-2 h-4 w-4" /></Button>
            ) : (
              <Button onClick={() => persist(true)} disabled={saving}>
                <Check className="mr-2 h-4 w-4" /> {saving ? "Enregistrement…" : "Terminer & enregistrer"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-4 border-b last:border-0 pb-2 last:pb-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right">{value}</span>
  </div>
);
