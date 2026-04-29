import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Clock } from "lucide-react";

/**
 * Écran tablette d'accueil : affiche un QR rotatif renouvelé toutes les 30 secondes.
 * Les agents le scannent avec leur smartphone pour pointer (entrée/sortie).
 */
const PresenceKiosk = () => {
  const { locationId } = useParams<{ locationId: string }>();
  const [qrToken, setQrToken] = useState<string>("");
  const [locationName, setLocationName] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(30);
  const [now, setNow] = useState(new Date());
  const [error, setError] = useState<string>("");

  // Renouvelle le token
  useEffect(() => {
    if (!locationId) return;
    let cancelled = false;
    const refresh = async () => {
      const { data, error } = await supabase.functions.invoke("attendance-qr-token", {
        body: { location_id: locationId },
      });
      if (cancelled) return;
      if (error || data?.error) { setError(data?.error || error?.message || "Erreur"); return; }
      setQrToken(data.token);
      setExpiresAt(data.expires_at);
      setLocationName(data.location_name);
      setError("");
    };
    refresh();
    const id = setInterval(refresh, 25_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [locationId]);

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
          {locationName || "Chargement..."}
        </p>
      </div>

      <div className="rounded-3xl border-4 border-primary bg-white p-8 shadow-2xl">
        {error ? (
          <div className="flex h-[320px] w-[320px] items-center justify-center text-center text-destructive">
            {error}
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
