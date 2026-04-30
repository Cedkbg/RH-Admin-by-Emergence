import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";

/**
 * Page utilisée pour :
 *  - les invitations Supabase (nouvel agent qui définit son mot de passe)
 *  - les réinitialisations de mot de passe
 *  - les magic links
 *
 * Elle accepte les deux formats de tokens Supabase :
 *  - Hash : #access_token=...&refresh_token=...&type=invite|recovery
 *  - Query (PKCE) : ?code=xxx
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    let alive = true;

    const init = async () => {
      // 1) Flow PKCE : ?code=xxx → exchange
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!alive) return;
        if (error) {
          setErrorMsg("Lien invalide ou expiré. Demandez un nouveau lien à votre RH.");
          return;
        }
        // Nettoie l'URL
        window.history.replaceState({}, "", window.location.pathname);
        setReady(true);
        return;
      }

      // 2) Flow hash : #access_token=...&refresh_token=...
      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
      const params = new URLSearchParams(hash);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (!alive) return;
        if (error) {
          setErrorMsg("Lien invalide ou expiré. Demandez un nouveau lien à votre RH.");
          return;
        }
        window.history.replaceState({}, "", window.location.pathname);
        setReady(true);
        return;
      }

      // 3) Sinon, peut-être déjà connecté (cas du clic récent)
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      if (data.session) setReady(true);
      else setErrorMsg("Aucun lien valide détecté. Vérifiez le lien reçu par email.");
    };

    // Écoute aussi l'événement (au cas où Supabase traite le hash automatiquement)
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });

    init();
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error("Les mots de passe ne correspondent pas"); return; }
    if (password.length < 6) { toast.error("Minimum 6 caractères"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Mot de passe défini ! Vous pouvez maintenant vous connecter.");
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl tracking-tight">Activez votre compte</CardTitle>
          <CardDescription>
            {ready
              ? "Définissez votre mot de passe pour accéder à la plateforme."
              : errorMsg || "Vérification du lien…"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ready ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pw">Nouveau mot de passe</Label>
                <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw2">Confirmer</Label>
                <Input id="pw2" type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement…</> : "Valider et se connecter"}
              </Button>
            </form>
          ) : errorMsg ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive text-center">{errorMsg}</p>
              <Button variant="outline" className="w-full" onClick={() => navigate("/auth", { replace: true })}>
                Retour à la connexion
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
