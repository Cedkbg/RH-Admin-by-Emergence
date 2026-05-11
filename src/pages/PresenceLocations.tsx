import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, MapPin, Plus, Trash2, Crosshair, Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Loc {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  active: boolean;
}

const toFiniteNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const formatCoord = (value: unknown, digits = 5) => {
  const numberValue = toFiniteNumber(value);
  return numberValue === null ? "—" : numberValue.toFixed(digits);
};

const PresenceLocations = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Loc[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", latitude: "", longitude: "", radius_meters: "50" });
  const mountedRef = useRef(true);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("attendance_locations_public" as any).select("*").order("name");
    if (error) toast.error(error.message);
    setRows(((data as unknown) as Loc[]) || []);
    setLoading(false);
  };
  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => { mountedRef.current = false; };
  }, []);

  const useMyPosition = () => {
    try {
      const geo = typeof navigator !== "undefined" ? navigator.geolocation : null;
      if (!geo || typeof geo.getCurrentPosition !== "function") {
        toast.error("Géolocalisation non supportée par ce navigateur");
        return;
      }
      if (typeof window !== "undefined" && window.isSecureContext === false) {
        toast.error("La géolocalisation requiert HTTPS. Ouvrez l'app en https://…");
        return;
      }
      setGpsLoading(true);
      geo.getCurrentPosition(
        (pos) => {
          try {
            const lat = Number(pos?.coords?.latitude);
            const lng = Number(pos?.coords?.longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
              toast.error("Coordonnées GPS invalides");
            } else {
              if (!mountedRef.current) return;
              setForm((f) => ({ ...f, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
              toast.success("Position GPS récupérée");
            }
          } catch (e: any) {
            toast.error("Erreur GPS : " + (e?.message || "inconnue"));
          } finally {
            if (mountedRef.current) setGpsLoading(false);
          }
        },
        (err) => {
          const code = err?.code;
          const msg =
            code === 1 ? "Permission refusée. Autorisez la localisation dans le navigateur."
            : code === 2 ? "Position indisponible. Vérifiez le GPS / réseau."
            : code === 3 ? "Délai dépassé. Réessayez à l'extérieur."
            : (err?.message || "Erreur inconnue");
          if (mountedRef.current) {
            toast.error("Position : " + msg);
            setGpsLoading(false);
          }
        },
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
      );
    } catch (e: any) {
      setGpsLoading(false);
      toast.error("Géolocalisation : " + (e?.message || "erreur"));
    }
  };

  const reset = () => setForm({ name: "", address: "", latitude: "", longitude: "", radius_meters: "50" });

  const save = async (openAfter = false) => {
    if (!form.name.trim()) { toast.error("Nom du site requis"); return; }
    if (!form.latitude || !form.longitude) { toast.error("Position GPS requise — cliquez « Utiliser ma position »"); return; }
    setSaving(true);
    const { data, error } = await supabase.from("attendance_locations").insert({
      name: form.name.trim(),
      address: form.address.trim() || null,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      radius_meters: Number(form.radius_meters) || 50,
      active: true,
    }).select("id").single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Site créé !");
    setOpen(false);
    reset();
    if (openAfter && data?.id) {
      window.open(`/presence/kiosk/${data.id}`, "_blank");
    } else {
      refresh();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce site ?")) return;
    const { error } = await supabase.from("attendance_locations").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Supprimé");
    refresh();
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 animate-fade-in p-1">
      <Button variant="ghost" onClick={() => navigate(-1)} className="w-fit -ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lieux de pointage</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Créez un site, puis ouvrez son écran QR sur la tablette d'accueil.
          </p>
        </div>
        {isAdmin && (
          <Button size="lg" onClick={() => { reset(); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Nouveau site
          </Button>
        )}
      </div>

      {/* Guide rapide */}
      {rows.length === 0 && !loading && (
        <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-8 text-center">
          <QrCode className="mx-auto mb-3 h-12 w-12 text-primary" />
          <h3 className="text-lg font-semibold">Aucun site configuré</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Créez votre premier site en 10 secondes : nommez-le, cliquez sur <b>« Utiliser ma position »</b>, puis <b>« Créer & ouvrir le QR »</b>.
          </p>
          {isAdmin && (
            <Button className="mt-4" size="lg" onClick={() => { reset(); setOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Créer mon premier site
            </Button>
          )}
        </div>
      )}

      {/* Cartes des sites */}
      {rows.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="font-semibold truncate">{r.name}</h3>
                  </div>
                  {r.address && <p className="mt-1 text-xs text-muted-foreground truncate">{r.address}</p>}
                </div>
                <Badge variant={r.active ? "default" : "secondary"}>{r.active ? "Actif" : "Inactif"}</Badge>
              </div>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p className="font-mono">{formatCoord(r.latitude)}, {formatCoord(r.longitude)}</p>
                <p>Rayon : <b>{r.radius_meters} m</b></p>
              </div>
              <div className="mt-4 flex gap-2">
                <Button asChild size="sm" className="flex-1">
                  <Link to={`/presence/kiosk/${r.id}`} target="_blank">
                    <QrCode className="mr-1 h-3.5 w-3.5" /> Ouvrir QR
                  </Link>
                </Button>
                {isAdmin && (
                  <Button size="icon" variant="outline" onClick={() => remove(r.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog création simplifiée */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau site de pointage</DialogTitle>
            <DialogDescription>3 étapes : nommez, géolocalisez, créez.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">1. Nom du site *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex : Siège - Kinshasa" className="mt-1.5" />
            </div>

            <div>
              <Label htmlFor="addr">Adresse (optionnel)</Label>
              <Input id="addr" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Avenue, ville…" className="mt-1.5" />
            </div>

            <div>
              <Label>2. Position GPS *</Label>
              <Button type="button" variant="outline" className="mt-1.5 w-full" onClick={useMyPosition} disabled={gpsLoading}>
                {gpsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crosshair className="mr-2 h-4 w-4" />}
                {gpsLoading ? "Récupération…" : "Utiliser ma position actuelle"}
              </Button>
              {form.latitude && form.longitude && (
                <p className="mt-2 text-xs text-muted-foreground font-mono">
                  ✓ {formatCoord(form.latitude)}, {formatCoord(form.longitude)}
                </p>
              )}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Input type="number" step="any" placeholder="Latitude" value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
                <Input type="number" step="any" placeholder="Longitude" value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
              </div>
            </div>

            <div>
              <Label htmlFor="radius">3. Rayon autorisé (mètres)</Label>
              <Input id="radius" type="number" value={form.radius_meters}
                onChange={(e) => setForm({ ...form, radius_meters: e.target.value })} className="mt-1.5" />
              <p className="mt-1 text-xs text-muted-foreground">L'agent doit être à moins de {form.radius_meters || 50} m du point GPS pour pointer.</p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button onClick={() => save(true)} disabled={saving} className="w-full" size="lg">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
              Créer & ouvrir le QR
            </Button>
            <Button variant="outline" onClick={() => save(false)} disabled={saving} className="w-full">
              Créer seulement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PresenceLocations;
