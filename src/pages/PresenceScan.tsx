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
    setMessage("Autorisez la localisation. On affine la précision pendant quelques secondes…");
    setGpsMsg("Recherche GPS…");
    coordsRef.current = null;

    const geo = typeof navigator !== "undefined" ? navigator.geolocation : null;
    if (!geo || typeof geo.watchPosition !== "function") {
      setStatus("error");
      setMessage("GPS non disponible sur cet appareil.");
      return;
    }
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      setStatus("error");
      setMessage("La localisation requiert HTTPS. Ouvrez l'application avec le lien sécurisé https://.");
      return;
    }

    let watchId: number | null = null;
    let timeoutId: number | null = null;
    let bailoutId: number | null = null;
    let best: GeolocationCoordinates | null = null;

    const finish = (errMsg?: string) => {
      if (watchId !== null) { try { geo.clearWatch(watchId); } catch {} watchId = null; }
      if (timeoutId !== null) { clearTimeout(timeoutId); timeoutId = null; }
      if (bailoutId !== null) { clearTimeout(bailoutId); bailoutId = null; }
      if (!mountedRef.current) return;
      if (best && Number.isFinite(best.latitude) && Number.isFinite(best.longitude)) {
        coordsRef.current = best;
        const acc = Math.round(best.accuracy || 0);
        setGpsMsg(`Position GPS acquise (±${acc} m)`);
        setMessage("Position confirmée. Lancez maintenant la caméra pour scanner le QR code.");
        setStatus("gpsReady");
      } else {
        setGpsMsg("GPS refusé ou indisponible");
        setStatus("error");
        setMessage(errMsg || "Position GPS introuvable. Sortez à l'air libre puis réessayez.");
      }
    };

    watchId = geo.watchPosition(
      (pos) => {
        if (!mountedRef.current) return;
        const c = pos.coords;
        if (!Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)) return;
        if (!best || (c.accuracy ?? 9999) < (best.accuracy ?? 9999)) best = c;
        const acc = Math.round(c.accuracy || 0);
        setGpsMsg(`Affinage GPS… ±${acc} m`);
        // Stop dès qu'on a une excellente précision
        if ((c.accuracy ?? 9999) <= 15) finish();
      },
      (err) => {
        // Si on a déjà une lecture acceptable, on la garde
        if (best) finish();
        else finish(gpsErrorMessage(err));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );

    // Bailout : 8s max d'affinage, puis on prend la meilleure lecture
    bailoutId = window.setTimeout(() => finish(), 8000);
    // Filet de sécurité dur : 22s
    timeoutId = window.setTimeout(() => finish("Délai GPS dépassé. Réessayez à l'extérieur."), 22000);
  };

  const startCamera = async () => {
    if (!coordsRef.current) {
      setStatus("error");
      setMessage("Position GPS introuvable. Recommencez en autorisant la localisation.");
      return;
    }
    try {
      setStatus("scanning");
      setMessage("Pointez la caméra vers le QR code…");
      // Nettoyage dur du conteneur pour éviter l'écran blanc sur ré-essais (iOS/Android)
      await stopScanner();
      const container = document.getElementById("qr-reader");
      if (container) container.innerHTML = "";
      // Pré-warm la caméra : force la demande de permission et libère le stream avant html5-qrcode
      try {
        const test = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
        test.getTracks().forEach((t) => t.stop());
      } catch (permErr) {
        setStatus("error");
        setMessage(cameraErrorMessage(permErr));
        return;
      }
      const scanner = new Html5Qrcode("qr-reader", { verbose: false });
      scannerRef.current = scanner;
      let handled = false;
      // Détecteur d'écran blanc : si aucun frame décodable + pas de <video> après 5s, on relance
      const whiteScreenTimer = window.setTimeout(() => {
        const video = document.querySelector("#qr-reader video") as HTMLVideoElement | null;
        if (!video || video.readyState < 2) {
          setMessage("La caméra met du temps à démarrer. Touchez « Recharger la caméra ».");
        }
      }, 5000);
      scanner.start(
        { facingMode: { ideal: "environment" } },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decoded) => {
          if (handled) return;
          handled = true;
          clearTimeout(whiteScreenTimer);
          await stopScanner();
          await validate(decoded, coordsRef.current!);
        },
        () => {},
      ).catch((e) => {
        clearTimeout(whiteScreenTimer);
        if (!mountedRef.current) return;
        setStatus("error");
        setMessage(cameraErrorMessage(e));
      });
    } catch (e: any) {
      setStatus("error");
      setMessage(cameraErrorMessage(e));
    }
  };

  const reloadCamera = async () => {
    await stopScanner();
    const container = document.getElementById("qr-reader");
    if (container) container.innerHTML = "";
    setTimeout(() => startCamera(), 300);
  };

  const validate = async (qrToken: string, gps: GeolocationCoordinates) => {
    setStatus("validating");
    setMessage("Validation en cours…");
    const { data, error } = await supabase.functions.invoke("attendance-scan", {
      body: {
        qr_token: qrToken,
        gps_lat: gps.latitude,
        gps_lng: gps.longitude,
        gps_accuracy: Number.isFinite(gps.accuracy) ? gps.accuracy : null,
      },
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
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
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
            <Button size="lg" className="w-full" onClick={startGps}>
              <MapPin className="mr-2 h-5 w-5" /> Autoriser la position GPS
            </Button>
          )}

          {(status === "gps" || status === "gpsReady") && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {status === "gps" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4 text-primary" />}
                {gpsMsg}
              </div>
              <p className="text-sm text-muted-foreground">{message}</p>
              {status === "gpsReady" && (
                <Button size="lg" className="w-full" onClick={startCamera}>
                  <Camera className="mr-2 h-5 w-5" /> Ouvrir la caméra
                </Button>
              )}
            </div>
          )}

          <div id="qr-reader" className={status === "gpsReady" || status === "scanning" ? "overflow-hidden rounded-lg border min-h-[280px] bg-black/5" : "hidden"} />

          {status === "validating" && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> {message}
            </div>
          )}

          <div className={status === "scanning" ? "space-y-3" : "hidden"}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {gpsMsg}
            </div>
            <p className="text-sm text-muted-foreground">{message}</p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={reloadCamera}>
                <Camera className="mr-2 h-4 w-4" /> Recharger la caméra
              </Button>
              <Button variant="outline" className="flex-1" onClick={async () => {
                await stopScanner();
                setStatus("idle"); setMessage("");
              }}>Annuler</Button>
            </div>
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
