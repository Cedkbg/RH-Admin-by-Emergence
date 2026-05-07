import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { UserCircle2, Loader2 } from "lucide-react";

/**
 * Espace de connexion professionnel.
 * - Pas de création publique de compte (les comptes sont créés par l'administration RH).
 * - Session persistante (localStorage) : rester connecté après fermeture du navigateur.
 */
export default function AgentAuth() {
  const { session, signIn, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  useEffect(() => {
    if (session) navigate("/", { replace: true });
  }, [session, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Normalisation : retire espaces invisibles (copier-coller) + email en minuscules
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const { error } = await signIn(cleanEmail, cleanPassword);
    setLoading(false);
    if (error) toast.error("Email ou mot de passe incorrect. Vérifiez bien (sans espace au début/fin) ou demandez un nouveau mot de passe à l'admin.");
    else toast.success("Bienvenue !");
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Email de réinitialisation envoyé.");
      setForgotOpen(false);
    }
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-muted p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <UserCircle2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl tracking-tight">Connexion EMERGENCE DRC</CardTitle>
          <CardDescription>Connectez-vous avec votre compte professionnel</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email professionnel</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Connexion…" : "Se connecter"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Vous restez connecté sur cet appareil jusqu'à votre déconnexion.
            </p>
            <button
              type="button"
              onClick={() => { setForgotEmail(email); setForgotOpen(true); }}
              className="text-sm text-primary hover:underline w-full text-center"
            >
              Mot de passe oublié ?
            </button>
          </form>

          {forgotOpen && (
            <form onSubmit={handleForgot} className="space-y-3 mt-4 p-4 border rounded-md bg-muted/30">
              <p className="text-sm font-medium">Réinitialiser le mot de passe</p>
              <Input
                type="email"
                placeholder="Votre email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={loading} className="flex-1">
                  {loading ? "Envoi…" : "Envoyer le lien"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setForgotOpen(false)}>
                  Annuler
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-4 border-t text-center space-y-2">
            <p className="text-xs text-muted-foreground">Vous êtes administrateur RH ?</p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate("/auth")}
            >
              Connexion administrateur
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
