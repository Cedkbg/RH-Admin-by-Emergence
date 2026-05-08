import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Camera, CheckCircle2, MapPin, AlertTriangle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Status = "idle" | "scanning" | "validating" | "success" | "error";

const PresenceScan = () => {
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const coordsRef = useRef<GeolocationCoordinates | null>(null);
  const gpsErrorRef = useRef<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");
  const [gpsMsg, setGpsMsg] = useState<string>("Recherche GPS…");
  const [result, setResult] = useState<any>(null);

  // IMPORTANT iOS Safari : getUserMedia DOIT être appelé dans le même tick que le clic.
  // On démarre donc la caméra EN PREMIER (sans await avant), puis on demande le GPS en parallèle.
  const startScan = async () => {
    setStatus("scanning");
    setMessage("Pointez la caméra vers le QR code…");
    setGpsMsg("Recherche GPS…");
    coordsRef.current = null;
    gpsErrorRef.current = null;

    // Demande GPS en parallèle (n'interrompt pas la chaîne de gesture caméra)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { coordsRef.current = pos.coords; setGpsMsg("Position GPS acquise"); },
        (err) => { gpsErrorRef.current = err.message; setGpsMsg("GPS refusé : " + err.message); },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
      );
    } else {
      gpsErrorRef.current = "GPS non disponible";
      setGpsMsg("GPS non disponible sur cet appareil");
    }

    // Lance la caméra immédiatement (gesture user encore actif sur iOS)
    try {
      // Attend juste le mount du div #qr-reader (rendu au même render)
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      let handled = false;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decoded) => {
          if (handled) return;
          handled = true;
          await scanner.stop().catch(() => {});
          await waitAndValidate(decoded);
        },
        () => {},
      );
    } catch (e: any) {
      setStatus("error");
      const msg = e?.message || String(e);
      if (/NotAllowed|Permission/i.test(msg)) {
        setMessage("Accès caméra refusé. Activez-le dans Réglages Safari → Caméra.");
      } else if (/NotFound|Devices/i.test(msg)) {
        setMessage("Aucune caméra détectée sur cet appareil.");
      } else if (/NotReadable|TrackStart/i.test(msg)) {
        setMessage("Caméra utilisée par une autre application. Fermez les autres apps.");
      } else {
        setMessage("Caméra inaccessible : " + msg);
      }
    }
  };

  const waitAndValidate = async (qrToken: string) => {
    setStatus("validating");
    setMessage("Validation en cours…");
    // Attend jusqu'à 10s que le GPS arrive (si pas déjà là)
    const start = Date.now();
    while (!coordsRef.current && !gpsErrorRef.current && Date.now() - start < 10000) {
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!coordsRef.current) {
      setStatus("error");
      setMessage("Position GPS introuvable. Activez la localisation dans Réglages Safari → Position et réessayez.");
      return;
    }
    await validate(qrToken, coordsRef.current);
  };

  const validate = async (qrToken: string, gps: GeolocationCoordinates) => {
    const { data, error } = await supabase.functions.invoke("attendance-scan", {
      body: { qr_token: qrToken, gps_lat: gps.latitude, gps_lng: gps.longitude },
    });
    if (error || data?.error) {
      setStatus("error");
      setMessage(data?.error || error?.message || "Erreur de validation");
      return;
    }
    setResult(data);
    setStatus("success");
    try { sessionStorage.setItem("attendance:justScanned", data.action); } catch {}
  };

  useEffect(() => {
    return () => {
      const s = scannerRef.current;
      if (s && s.getState && s.getState() === 2) {
        s.stop().catch(() => {}).then(() => s.clear?.()).catch(() => {});
      }
      scannerRef.current = null;
    };
  }, []);

  return (
    <div className="mx-auto max-w-md space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold">Pointer ma présence</h1>
        <p className="text-sm text-muted-foreground">Scannez le QR de l'écran d'accueil de votre site.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">État</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {status === "idle" && (
            <Button size="lg" className="w-full" onClick={startScan}>
              <Camera className="mr-2 h-5 w-5" /> Démarrer le scan
            </Button>
          )}

          {status === "validating" && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> {message}
            </div>
          )}

          <div className={status === "scanning" ? "space-y-3" : "hidden"}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {gpsMsg}
            </div>
            <div id="qr-reader" className="overflow-hidden rounded-lg border min-h-[280px] bg-black/5" />
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button variant="outline" className="w-full" onClick={async () => {
              await scannerRef.current?.stop().catch(() => {});
              setStatus("idle"); setMessage("");
            }}>Annuler</Button>
          </div>

          {status === "success" && result && (
            <div className="space-y-3 rounded-lg border border-green-500/40 bg-green-50 p-4 dark:bg-green-950/20">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-6 w-6" />
                <span className="text-lg font-semibold">
                  {result.action === "check_in" ? "Entrée enregistrée" : "Sortie enregistrée"}
                </span>
              </div>
              <div className="text-sm space-y-1">
                <div><strong>Agent :</strong> {result.employee}</div>
                <div><strong>Lieu :</strong> {result.location}</div>
                <div><strong>Heure :</strong> {result.time}</div>
                <Badge variant="outline">{result.distance_meters} m du site</Badge>
              </div>
              <Button variant="outline" className="w-full" onClick={() => navigate("/presence")}>
                Retour
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> {message}
              </div>
              <Button variant="outline" className="w-full" onClick={() => { setStatus("idle"); setMessage(""); }}>
                Réessayer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PresenceScan;
