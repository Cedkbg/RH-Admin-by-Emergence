import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Building2, UserCog, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Step = 1 | 2;

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);

  // Step 1 — Entreprise
  const [company, setCompany] = useState({
    name: "", logoUrl: "", address: "", phone: "", email: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Step 2 — Compte administrateur (premier utilisateur)
  const [admin, setAdmin] = useState({
    full_name: "", email: "", password: "",
  });

  useEffect(() => {
    (async () => {
      const { data: settings } = await supabase
        .from("app_settings")
        .select("key,value")
        .in("key", ["company_name", "company_logo", "company_address", "company_phone", "company_email"]);
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
    })();
  }, []);

  const saveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.name.trim()) { toast.error("Le nom de l'entreprise est obligatoire"); return; }
    setSaving(true);

    let logoBase64: string | undefined;
    let logoContentType: string | undefined;
    let logoExt: string | undefined;
    if (logoFile) {
      const buf = await logoFile.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
      logoBase64 = btoa(bin);
      logoContentType = logoFile.type || "image/png";
      logoExt = logoFile.name.split(".").pop() || "png";
    }

    const { data, error } = await supabase.functions.invoke("complete-onboarding", {
      body: {
        company: {
          name: company.name,
          logoUrl: company.logoUrl,
          logoBase64,
          logoContentType,
          logoExt,
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

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin.full_name.trim() || !admin.email.trim() || admin.password.length < 8) {
      toast.error("Nom, email et mot de passe (8+ caractères) requis");
      return;
    }
    setSaving(true);

    const redirectUrl = `${window.location.origin}/`;
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: admin.email.trim(),
      password: admin.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: admin.full_name.trim() },
      },
    });

    if (signUpError) {
      setSaving(false);
      toast.error(signUpError.message);
      return;
    }

    // Si la session est immédiatement disponible (auto-confirm), marquer onboarding terminé
    if (signUpData.session && signUpData.user) {
      await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", signUpData.user.id);
      setSaving(false);
      toast.success("Compte administrateur créé — bienvenue !");
      navigate("/", { replace: true });
      return;
    }

    setSaving(false);
    toast.success("Compte créé. Vérifiez votre email pour confirmer puis connectez-vous.");
    navigate("/auth", { replace: true });
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
              <UserCog className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium">Administrateur</span>
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
            <form onSubmit={createAdmin} className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Créer le compte administrateur</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Ce premier compte sera administrateur de la plateforme. Vous pourrez ensuite ajouter les autres utilisateurs.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label>Nom complet *</Label>
                  <Input value={admin.full_name} onChange={(e) => setAdmin({ ...admin, full_name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={admin.email} onChange={(e) => setAdmin({ ...admin, email: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Mot de passe * (8+)</Label>
                  <Input type="password" value={admin.password} onChange={(e) => setAdmin({ ...admin, password: e.target.value })} minLength={8} required />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={saving}>
                  Retour
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Créer & terminer
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
