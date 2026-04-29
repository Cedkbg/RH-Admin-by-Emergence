import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Building2, Users2, Check, ArrowRight, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Step = 1 | 2;

const ROLE_OPTIONS = [
  { value: "rh", label: "Responsable RH" },
  { value: "dg", label: "Directeur Général", direction: "DG" },
  { value: "dga", label: "Directeur Général Adjoint", direction: "DGA" },
  { value: "manager", label: "Manager de Direction" },
  { value: "secretaire", label: "Secrétaire" },
  { value: "assistant_direction", label: "Assistant de Direction" },
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);

  // Step 1 — Entreprise
  const [company, setCompany] = useState({
    name: "", logoUrl: "", address: "", phone: "", email: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Step 2 — Premier chef
  const [chief, setChief] = useState({
    full_name: "", email: "", password: "", role: "rh", direction_code: "",
  });
  const [directions, setDirections] = useState<{ id: string; code: string; name: string }[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: settings }, { data: dirs }] = await Promise.all([
        supabase.from("app_settings").select("key,value").in("key", [
          "company_name", "company_logo", "company_address", "company_phone", "company_email",
        ]),
        supabase.from("directions").select("id,code,name").order("code"),
      ]);
      const map: any = {};
      (settings || []).forEach((r: any) => {
        const v = typeof r.value === "string" ? r.value : r.value?.value;
        map[r.key] = v ?? "";
      });
      setCompany({
        name: map.company_name || "",
        logoUrl: map.company_logo || "",
        address: map.company_address || "",
        phone: map.company_phone || "",
        email: map.company_email || "",
      });
      setDirections(dirs || []);
    })();
  }, []);

  const saveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.name.trim()) { toast.error("Le nom de l'entreprise est obligatoire"); return; }
    setSaving(true);

    let logoUrl = company.logoUrl;
    if (logoFile) {
      const ext = logoFile.name.split(".").pop() || "png";
      const path = `company/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("branding").upload(path, logoFile, { upsert: true });
      if (upErr) { setSaving(false); toast.error("Upload logo échoué : " + upErr.message); return; }
      const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
      logoUrl = pub.publicUrl;
    }

    const { data, error } = await supabase.functions.invoke("complete-onboarding", {
      body: {
        company: {
          name: company.name,
          logoUrl,
          address: company.address,
          phone: company.phone,
          email: company.email,
        },
      },
    });
    setSaving(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Enregistrement échoué");
      return;
    }
    toast.success("Informations entreprise enregistrées");
    setStep(2);
  };

  const finishOnboarding = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
    toast.success("Configuration terminée — bienvenue !");
    navigate("/", { replace: true });
  };

  const createChief = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chief.full_name.trim() || !chief.email.trim() || chief.password.length < 8) {
      toast.error("Nom, email et mot de passe (8+ caractères) requis");
      return;
    }
    const roleMeta = ROLE_OPTIONS.find((r) => r.value === chief.role)!;
    const needsDirection = ["manager", "assistant_direction"].includes(chief.role);
    const fixedDir = roleMeta.direction;
    const directionCode = fixedDir || (needsDirection ? chief.direction_code : undefined);
    if (needsDirection && !directionCode) { toast.error("Direction requise pour ce rôle"); return; }

    setSaving(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: {
        email: chief.email.trim(),
        password: chief.password,
        full_name: chief.full_name.trim(),
        role: chief.role,
        direction_code: directionCode,
      },
    });
    setSaving(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Création échouée");
      return;
    }
    toast.success(`${roleMeta.label} créé`);
    await finishOnboarding();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Stepper */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className={`flex items-center gap-2 ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`flex h-9 w-9 items-center justify-center rounded-full ${step > 1 ? "bg-primary text-primary-foreground" : step === 1 ? "bg-primary/10 ring-2 ring-primary" : "bg-muted"}`}>
              {step > 1 ? <Check className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
            </div>
            <span className="text-sm font-medium">Entreprise</span>
          </div>
          <div className={`h-px w-12 ${step >= 2 ? "bg-primary" : "bg-border"}`} />
          <div className={`flex items-center gap-2 ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`flex h-9 w-9 items-center justify-center rounded-full ${step === 2 ? "bg-primary/10 ring-2 ring-primary" : "bg-muted"}`}>
              <Users2 className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium">Premier chef</span>
          </div>
        </div>

        <div className="rounded-2xl border bg-card shadow-xl p-6 md:p-8 animate-fade-in">
          {step === 1 && (
            <form onSubmit={saveCompany} className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Configurer votre entreprise</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Bienvenue ! Commençons par les informations de base.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label>Nom de l'entreprise *</Label>
                  <Input value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} required />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-3">
                    {(logoFile || company.logoUrl) && (
                      <img
                        src={logoFile ? URL.createObjectURL(logoFile) : company.logoUrl}
                        alt="logo"
                        className="h-14 w-14 rounded-lg object-contain bg-secondary p-1"
                      />
                    )}
                    <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Adresse</Label>
                  <Textarea rows={2} value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  Continuer
                </Button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={createChief} className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Créer votre premier chef</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Ce compte aura le droit d'ajouter des agents. Vous pourrez créer les autres rôles depuis la page <strong>Cabinets</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom complet *</Label>
                  <Input value={chief.full_name} onChange={(e) => setChief({ ...chief, full_name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Rôle *</Label>
                  <Select value={chief.role} onValueChange={(v) => setChief({ ...chief, role: v, direction_code: "" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={chief.email} onChange={(e) => setChief({ ...chief, email: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Mot de passe initial * (8+)</Label>
                  <Input type="password" value={chief.password} onChange={(e) => setChief({ ...chief, password: e.target.value })} minLength={8} required />
                </div>
                {["manager", "assistant_direction"].includes(chief.role) && (
                  <div className="md:col-span-2 space-y-2">
                    <Label>Direction *</Label>
                    <Select value={chief.direction_code} onValueChange={(v) => setChief({ ...chief, direction_code: v })}>
                      <SelectTrigger><SelectValue placeholder="Choisir une direction" /></SelectTrigger>
                      <SelectContent>
                        {directions.map((d) => <SelectItem key={d.id} value={d.code}>{d.code} — {d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={finishOnboarding} disabled={saving}>
                  <SkipForward className="mr-2 h-4 w-4" /> Plus tard
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={saving}>
                    Retour
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Créer & terminer
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
