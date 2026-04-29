import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Camera, CheckCircle2, MapPin, AlertTriangle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Status = "idle" | "locating" | "scanning" | "validating" | "success" | "error";

const PresenceScan = () => {
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  const [coords, setCoords] = useState<GeolocationCoordinates | null>(null);

  // Demande GPS au démarrage du scan
  const startScan = async () => {
    setStatus("locating");
    setMessage("Récupération de votre position GPS…");
    if (!navigator.geolocation) { setStatus("error"); setMessage("GPS non disponible sur cet appareil."); return; }

    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords(pos.coords); launchCamera(pos.coords); },
      (err) => { setStatus("error"); setMessage("Position GPS refusée : " + err.message); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const launchCamera = async (gps: GeolocationCoordinates) => {
    setStatus("scanning");
    setMessage("Pointez la caméra vers le QR code…");
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decoded) => {
          if (status === "validating") return;
          await scanner.stop().catch(() => {});
          await validate(decoded, gps);
        },
        () => {},
      );
    } catch (e: any) {
      setStatus("error");
      setMessage("Caméra inaccessible : " + e.message);
    }
  };

  const validate = async (qrToken: string, gps: GeolocationCoordinates) => {
    setStatus("validating");
    setMessage("Validation en cours…");
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
  };

  useEffect(() => {
    return () => { scannerRef.current?.stop().catch(() => {}); };
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

          {(status === "locating" || status === "validating") && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> {message}
            </div>
          )}

          {status === "scanning" && (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" /> Position acquise
              </div>
              <div id="qr-reader" className="overflow-hidden rounded-lg border" />
              <p className="text-sm text-muted-foreground">{message}</p>
            </>
          )}

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
