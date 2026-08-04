import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Loader2, Plus, Users2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { AccessDenied } from "@/components/AccessDenied";

type OrgRow = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  active: boolean;
  created_at: string;
  member_count: number;
};

const EMPTY = {
  name: "",
  legal_name: "",
  city: "",
  country: "RD Congo",
  phone: "",
  email: "",
  rccm: "",
  id_national: "",
  tax_number: "",
  currency: "CDF",
  admin_full_name: "",
  admin_email: "",
  admin_password: "",
};

export default function Plateforme() {
  const { isPlatformAdmin, loading } = useOrganization();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [invite, setInvite] = useState<{ name: string; email: string; link: string } | null>(null);
  const [linking, setLinking] = useState<string | null>(null);

  const generateInvite = async (o: OrgRow) => {
    setLinking(o.id);
    const { data, error } = await supabase.functions.invoke("create-organization", {
      body: { action: "invite_link", organization_id: o.id, origin: window.location.origin },
    });
    setLinking(null);
    const res = data as any;
    if (error || res?.error) return toast.error(res?.error || error?.message || "Génération échouée");
    setInvite({ name: o.name, email: res.email, link: res.invite_link });
  };

  const load = async () => {
    setFetching(true);
    const { data, error } = await supabase.functions.invoke("create-organization", { method: "GET" });
    setFetching(false);
    if (error) return;
    setOrgs(((data as any)?.organizations ?? []) as OrgRow[]);
  };

  useEffect(() => {
    if (isPlatformAdmin) load();
    else setFetching(false);
  }, [isPlatformAdmin]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.admin_email.trim() || form.admin_password.length < 8) {
      toast.error("Nom de l'entreprise, email admin et mot de passe (8+) requis");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("create-organization", {
      body: { ...form, origin: window.location.origin },
    });
    setSaving(false);
    const res = data as any;
    if (error || res?.error) return toast.error(res?.error || error?.message || "Création échouée");
    toast.success(`Entreprise « ${form.name} » créée avec son administrateur`);
    if (res?.invite_link) {
      setInvite({ name: form.name, email: form.admin_email, link: res.invite_link });
    }
    setForm({ ...EMPTY });
    setOpen(false);
    load();
  };

  const field = (k: keyof typeof EMPTY, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={form[k]}
        onChange={(e) => setForm({ ...form, [k]: e.target.value })}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return <AccessDenied />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" /> Plateforme
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestion des entreprises clientes du logiciel. Chaque entreprise dispose de son espace isolé.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nouvelle entreprise</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Créer une entreprise cliente</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {field("name", "Nom de l'entreprise *")}
                {field("legal_name", "Dénomination légale")}
                {field("city", "Ville")}
                {field("country", "Pays")}
                {field("phone", "Téléphone")}
                {field("email", "Email", "email")}
                {field("rccm", "RCCM")}
                {field("id_national", "ID National")}
                {field("tax_number", "N° Impôt")}
                {field("currency", "Devise")}
              </div>
              <div className="rounded-lg border p-3 space-y-3">
                <p className="text-sm font-medium">Administrateur de l'entreprise</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {field("admin_full_name", "Nom complet *")}
                  {field("admin_email", "Email *", "email")}
                  <div className="md:col-span-2">{field("admin_password", "Mot de passe * (8+)", "password")}</div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Créer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {fetching ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orgs.map((o) => (
            <Card key={o.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-lg border bg-background flex items-center justify-center overflow-hidden">
                    {o.logo_url
                      ? <img src={o.logo_url} alt={o.name} className="h-full w-full object-contain" />
                      : <Building2 className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <span className="truncate">{o.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p className="truncate">{[o.city, o.country].filter(Boolean).join(", ") || "—"}</p>
                <p className="truncate">{o.email || "—"}</p>
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="secondary" className="gap-1">
                    <Users2 className="h-3 w-3" />{o.member_count} utilisateur{o.member_count > 1 ? "s" : ""}
                  </Badge>
                  <Badge variant={o.active ? "default" : "outline"}>{o.active ? "Active" : "Inactive"}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {orgs.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune entreprise pour le moment.</p>
          )}
        </div>
      )}
    </div>
  );
}
