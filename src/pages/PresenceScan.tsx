import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Camera, CheckCircle2, MapPin, AlertTriangle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Status = "idle" | "gps" | "gpsReady" | "scanning" | "validating" | "success" | "error";

const gpsErrorMessage = (err?: GeolocationPositionError | null) => {
  const code = err?.code;
  if (code === 1) return "Localisation refusée. Autorisez la position dans Réglages Safari → Position.";
  if (code === 2) return "Position indisponible. Activez le GPS et vérifiez le réseau.";
  if (code === 3) return "Délai GPS dépassé. Réessayez à l'extérieur ou près d'une fenêtre.";
  return err?.message || "Position GPS introuvable.";
};

const cameraErrorMessage = (error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error || "");
  if (/NotAllowed|Permission/i.test(msg)) return "Accès caméra refusé. Activez-le dans Réglages Safari → Caméra.";
  if (/NotFound|Devices|Overconstrained/i.test(msg)) return "Aucune caméra arrière détectée sur cet appareil.";
  if (/NotReadable|TrackStart/i.test(msg)) return "Caméra utilisée par une autre application. Fermez les autres apps.";
  return "Caméra inaccessible : " + (msg || "erreur inconnue");
};

const PresenceScan = () => {
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const coordsRef = useRef<GeolocationCoordinates | null>(null);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");
  const [gpsMsg, setGpsMsg] = useState<string>("Recherche GPS…");
  const [result, setResult] = useState<any>(null);

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    scannerRef.current = null;
    try {
      if (scanner.getState && scanner.getState() === 2) await scanner.stop();
      scanner.clear?.();
    } catch {}
  };

  // iOS Safari est fragile avec les permissions : on demande d'abord le GPS
  // directement sur un clic, puis la caméra directement sur un second clic.
  const startGps = () => {
    setStatus("gps");
    setMessage("Autorisez la localisation pour confirmer votre présence sur site.");
    setGpsMsg("Recherche GPS…");
    coordsRef.current = null;

    const geo = typeof navigator !== "undefined" ? navigator.geolocation : null;
    if (!geo || typeof geo.getCurrentPosition !== "function") {
      setStatus("error");
      setMessage("GPS non disponible sur cet appareil.");
      return;
    }
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      setStatus("error");
      setMessage("La localisation requiert HTTPS. Ouvrez l'application avec le lien sécurisé https://.");
      return;
    }

    geo.getCurrentPosition(
      (pos) => {
        if (!mountedRef.current) return;
        coordsRef.current = pos.coords;
        setGpsMsg("Position GPS acquise");
        setMessage("Position confirmée. Lancez maintenant la caméra pour scanner le QR code.");
        setStatus("gpsReady");
      },
      (err) => {
        if (!mountedRef.current) return;
        setGpsMsg("GPS refusé ou indisponible");
        setStatus("error");
        setMessage(gpsErrorMessage(err));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  const startCamera = () => {
    if (!coordsRef.current) {
      setStatus("error");
      setMessage("Position GPS introuvable. Recommencez en autorisant la localisation.");
      return;
    }
    try {
      setStatus("scanning");
      setMessage("Pointez la caméra vers le QR code…");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      let handled = false;
      scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decoded) => {
          if (handled) return;
          handled = true;
          await stopScanner();
          await validate(decoded, coordsRef.current!);
        },
        () => {},
      ).catch((e) => {
        if (!mountedRef.current) return;
        setStatus("error");
        setMessage(cameraErrorMessage(e));
      });
    } catch (e: any) {
      setStatus("error");
      setMessage(cameraErrorMessage(e));
    }
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
