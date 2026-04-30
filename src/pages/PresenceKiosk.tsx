import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Clock, AlertTriangle } from "lucide-react";

/**
 * Écran tablette d'accueil : affiche un QR rotatif renouvelé toutes les 30 secondes.
 * Génération 100% côté client — simple et sans dépendance edge function.
 * Le QR contient juste { l: location_id, e: expires_at }. La validation côté
 * serveur vérifie l'expiration, l'utilisateur authentifié et le GPS dans le rayon.
 */
const WINDOW_MS = 30_000;

const PresenceKiosk = () => {
  const { locationId } = useParams<{ locationId: string }>();
  const [qrToken, setQrToken] = useState<string>("");
  const [locationName, setLocationName] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(30);
  const [now, setNow] = useState(new Date());
  const [error, setError] = useState<string>("");

  // Charge le nom du lieu une seule fois (lecture publique via RLS)
  useEffect(() => {
    if (!locationId) return;
    (async () => {
      const { data, error } = await supabase
        .from("attendance_locations")
        .select("id,name,active")
        .eq("id", locationId)
        .maybeSingle();
      if (error || !data) { setError("Lieu introuvable"); return; }
      if (!data.active) { setError("Lieu désactivé"); return; }
      setLocationName(data.name);
      setError("");
    })();
  }, [locationId]);

  // Génère un nouveau token toutes les 30s — simple, côté client
  useEffect(() => {
    if (!locationId || error) return;
    const generate = () => {
      const exp = Date.now() + WINDOW_MS;
      const payload = { v: 2, l: locationId, e: exp };
      setQrToken(btoa(JSON.stringify(payload)));
      setExpiresAt(exp);
    };
    generate();
    const id = setInterval(generate, WINDOW_MS);
    return () => clearInterval(id);
  }, [locationId, error]);

  // Countdown affiché
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
      setSecondsLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    }, 500);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Pointage présence</h1>
        <p className="mt-2 flex items-center justify-center gap-2 text-lg text-muted-foreground">
          <MapPin className="h-5 w-5" />
          {locationName || (error ? "—" : "Chargement...")}
        </p>
      </div>

      <div className="rounded-3xl border-4 border-primary bg-white p-8 shadow-2xl">
        {error ? (
          <div className="flex h-[320px] w-[320px] flex-col items-center justify-center gap-3 text-center text-destructive">
            <AlertTriangle className="h-10 w-10" />
            <span>{error}</span>
          </div>
        ) : qrToken ? (
          <QRCodeSVG value={qrToken} size={320} level="M" />
        ) : (
          <div className="flex h-[320px] w-[320px] animate-pulse items-center justify-center bg-muted">
            Chargement…
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center gap-3 rounded-full bg-card px-6 py-3 shadow-md">
        <Clock className="h-5 w-5 text-primary" />
        <span className="font-mono text-2xl font-bold tabular-nums">
          {now.toLocaleTimeString("fr-FR")}
        </span>
        <span className="text-sm text-muted-foreground">— Code valide {secondsLeft}s</span>
      </div>

      <p className="mt-6 max-w-md text-center text-sm text-muted-foreground">
        Scannez ce code avec l'application sur votre téléphone pour enregistrer votre arrivée ou votre départ.
      </p>
    </div>
  );
};

export default PresenceKiosk;
