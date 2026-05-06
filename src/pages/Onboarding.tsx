import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserCog, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getSetupStatus } from "@/lib/setupStatus";

export default function Onboarding() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [admin, setAdmin] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const hash = window.location.hash || "";
        const search = window.location.search || "";
        if (
          /access_token=|type=(recovery|invite|signup|magiclink|email_change)|code=[\w-]+/.test(
            hash + search,
          )
        ) {
          setInitialLoading(false);
          navigate(`/reset-password${search}${hash}`, { replace: true });
          return;
        }
        const setupStatus = await getSetupStatus();
        if (setupStatus.adminExists) {
          setInitialLoading(false);
          navigate("/auth", { replace: true });
          return;
        }
        setInitialLoading(false);
      } catch (err) {
        console.error("Onboarding init error:", err);
        setInitialLoading(false);
      }
    })();
  }, [navigate]);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !admin.full_name.trim() ||
      !admin.email.trim() ||
      admin.password.length < 8
    ) {
      toast.error("Nom, email et mot de passe (8+ caractères) requis");
      return;
    }
    setSaving(true);

    const { data, error } = await supabase.functions.invoke("complete-onboarding", {
      body: {
        company: { name: "Mon entreprise" },
        admin: {
          full_name: admin.full_name.trim(),
          email: admin.email.trim(),
          password: admin.password,
        },
      },
    });

    if (error || (data as any)?.error) {
      setSaving(false);
      toast.error((data as any)?.error || error?.message || "Création échouée");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: admin.email.trim(),
      password: admin.password,
    });

    setSaving(false);
    if (signInError) {
      toast.success(
        "Compte administrateur créé. Connectez-vous avec l'email et le mot de passe.",
      );
      navigate("/auth", { replace: true });
      return;
    }
    toast.success("Compte administrateur créé — bienvenue !");
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex items-center justify-center gap-2 text-primary">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary">
            <UserCog className="h-5 w-5" />
          </div>
          <span className="text-sm font-medium">Compte administrateur</span>
        </div>

        <div className="rounded-2xl border bg-card shadow-xl p-6 md:p-8 animate-fade-in">
          <form onSubmit={createAdmin} className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Créer le compte administrateur
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Ce compte aura tous les droits : il pourra configurer
                l'entreprise dans <strong>Paramètres</strong> et inviter les
                autres utilisateurs (qui recevront un email de confirmation).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label>Nom complet *</Label>
                <Input
                  value={admin.full_name}
                  onChange={(e) => setAdmin({ ...admin, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={admin.email}
                  onChange={(e) => setAdmin({ ...admin, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Mot de passe * (8+)</Label>
                <Input
                  type="password"
                  value={admin.password}
                  onChange={(e) => setAdmin({ ...admin, password: e.target.value })}
                  minLength={8}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Créer le compte
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
