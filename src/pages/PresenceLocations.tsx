import { CrudPage } from "@/components/dashboard/CrudPage";
import { TextField, FormGrid, cleanForm } from "@/lib/forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface Loc {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  active: boolean;
}

const PresenceLocations = () => (
  <CrudPage<Loc>
    title="Lieux de pointage"
    subtitle="site(s) configuré(s)"
    table="attendance_locations"
    orderBy={{ column: "name", ascending: true }}
    searchFields={["name", "address"]}
    defaultForm={{ name: "", address: "", latitude: 0, longitude: 0, radius_meters: 50, active: true }}
    validate={(f) => (!f.name || !f.latitude || !f.longitude ? "Nom et coordonnées GPS requis" : null)}
    prepare={(f) => {
      const c = cleanForm(f as any);
      c.latitude = Number(c.latitude);
      c.longitude = Number(c.longitude);
      c.radius_meters = Number(c.radius_meters) || 50;
      return c;
    }}
    columns={[
      { key: "name", label: "Site", render: (r) => <span className="font-semibold">{r.name}</span> },
      { key: "address", label: "Adresse", render: (r) => r.address || "—" },
      { key: "latitude", label: "GPS", render: (r) => <span className="font-mono text-xs">{r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}</span> },
      { key: "radius_meters", label: "Rayon", render: (r) => <Badge variant="outline">{r.radius_meters} m</Badge> },
      { key: "active", label: "Statut", render: (r) => <Badge variant={r.active ? "default" : "secondary"}>{r.active ? "Actif" : "Inactif"}</Badge> },
      { key: "id", label: "Tablette", render: (r) => (
        <Button asChild variant="outline" size="sm">
          <Link to={`/presence/kiosk/${r.id}`} target="_blank"><ExternalLink className="mr-1 h-3 w-3" /> Ouvrir</Link>
        </Button>
      )},
    ]}
    renderForm={(form, setForm) => (
      <FormGrid>
        <TextField label="Nom du site *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required span={2} />
        <TextField label="Adresse" value={form.address} onChange={(v) => setForm({ ...form, address: v })} span={2} />
        <TextField label="Latitude *" value={form.latitude as any} onChange={(v) => setForm({ ...form, latitude: v as any })} type="number" placeholder="-4.32758" />
        <TextField label="Longitude *" value={form.longitude as any} onChange={(v) => setForm({ ...form, longitude: v as any })} type="number" placeholder="15.31357" />
        <TextField label="Rayon (mètres)" value={form.radius_meters as any} onChange={(v) => setForm({ ...form, radius_meters: v as any })} type="number" placeholder="50" span={2} />
      </FormGrid>
    )}
  />
);

export default PresenceLocations;
