import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Smartphone, Share2, Plus, ArrowLeft, Chrome, Apple } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Guide pas-à-pas pour installer l'app sur l'écran d'accueil du téléphone.
 * Détecte iOS / Android et affiche les instructions adaptées.
 */
export default function Install() {
  const navigate = useNavigate();
  const [os, setOs] = useState<"ios" | "android" | "desktop">("desktop");
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setOs("ios");
    else if (/android/.test(ua)) setOs("android");
    else setOs("desktop");

    // Détecte si déjà installée
    if (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone) {
      setInstalled(true);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const triggerInstall = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setInstallEvent(null);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2 w-fit">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
      </Button>

      <div className="text-center space-y-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Smartphone className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Installer l'application</h1>
        <p className="text-sm text-muted-foreground">
          Ajoutez EMERGENCE à votre écran d'accueil pour y accéder en un clic, comme une vraie app.
        </p>
      </div>

      {installed && (
        <Card className="border-green-500/40 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4 text-sm text-green-700 dark:text-green-400">
            ✅ L'application est déjà installée sur cet appareil.
          </CardContent>
        </Card>
      )}

      {!installed && installEvent && (
        <Button size="lg" className="w-full" onClick={triggerInstall}>
          <Plus className="mr-2 h-5 w-5" /> Installer maintenant
        </Button>
      )}

      {os === "ios" && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 font-semibold">
              <Apple className="h-5 w-5" /> Sur iPhone / iPad (Safari)
            </div>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                <span>Ouvrez ce site dans <b>Safari</b> (pas Chrome)</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                <span>Touchez le bouton <Share2 className="inline h-4 w-4" /> <b>Partager</b> en bas de l'écran</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                <span>Faites défiler et touchez <b>« Sur l'écran d'accueil »</b></span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">4</span>
                <span>Touchez <b>« Ajouter »</b> en haut à droite</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      )}

      {os === "android" && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 font-semibold">
              <Chrome className="h-5 w-5" /> Sur Android (Chrome)
            </div>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                <span>Ouvrez le menu <b>⋮</b> en haut à droite de Chrome</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                <span>Touchez <b>« Installer l'application »</b> ou <b>« Ajouter à l'écran d'accueil »</b></span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                <span>Confirmez en touchant <b>« Installer »</b></span>
              </li>
            </ol>
          </CardContent>
        </Card>
      )}

      {os === "desktop" && (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            Pour installer l'application, ouvrez ce lien sur votre <b>téléphone</b>. Vous pourrez ensuite l'ajouter à votre écran d'accueil et y accéder comme à une vraie application.
          </CardContent>
        </Card>
      )}

      <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        💡 <b>Avantage :</b> une icône sur votre écran d'accueil, lancement instantané, plein écran, et accès direct au pointage.
      </div>
    </div>
  );
}
