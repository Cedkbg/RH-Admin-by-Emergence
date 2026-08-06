import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Building2, Loader2, Plus, Users2, ShieldAlert, Link as LinkIcon, Trash2, Network, Sparkles } from "lucide-react";
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
const [toDelete, setToDelete] = useState<OrgRow | null>(null);
  const [deleting, setDeleting] = useState(false);
const [restoring, setRestoring] = useState(false);
  const [deduping, setDeduping] = useState(false);

  const handleDedupeDirections = async () => {
    setDeduping(true);
    const { data, error } = await supabase.functions.invoke("create-organization", {
      body: { action: "dedupe_directions" },
    });
    setDeduping(false);
    const res = data as any;
    if (error || res?.error) {
      toast.error(res?.error || error?.message || "Déduplication échouée");
      return;
    }
    toast.success(
      `Doublons nettoyés : ${res?.removed_directions ?? 0} direction(s) supprimée(s), ` +
      `${res?.moved_departments ?? 0} département(s), ${res?.moved_employees ?? 0} agent(s) ré-affecté(s)`,
    );
  };

  const handleRestoreDirections = async () => {
    setRestoring(true);
    const { data, error } = await supabase.functions.invoke("create-organization", {
      body: { action: "restore_directions" },
    });
    setRestoring(false);
    const res = data as any;
    if (error || res?.error) {
      toast.error(res?.error || error?.message || "Restauration échouée");
      return;
    }
    toast.success(
      `Organigramme restauré : ${res?.created_directions ?? 0} direction(s), ${res?.created_departments ?? 0} département(s)`,
    );
  };

const handleDelete = async () => {
    if (!toDelete) return;
    // Protéger l'entreprise principale / racine
    if (toDelete.slug === "emergence-drc") {
      toast.error("L'entreprise principale « Emergence DRC » ne peut pas être supprimée.");
      setToDelete(null);
      return;
    }
    setDeleting(true);
    // Suppression directe via la politique RLS "platform admins delete organizations".
    // Les données métier (directions, employés, paie, etc.) partent en cascade via
    // organization_id ... REFERENCES organizations(id) ON DELETE CASCADE.
    const { error } = await supabase.from("organizations").delete().eq("id", toDelete.id);
    setDeleting(false);
    if (error) {
      toast.error(error.message || "Suppression échouée");
      return;
    }
    toast.success(`Entreprise « ${toDelete.name} » supprimée`);
    setToDelete(null);
    load();
  };

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
<div className="flex items-center gap-2">
<Button
            variant="outline"
            disabled={restoring}
            onClick={handleRestoreDirections}
            title="Recrée les 10 directions par défaut (DG, DGA, D1-D8) et leurs départements pour chaque entreprise qui en manque"
          >
            {restoring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Network className="mr-2 h-4 w-4" />Restaurer l'organigramme
          </Button>
          <Button
            variant="outline"
            disabled={deduping}
            onClick={handleDedupeDirections}
            title="Fusionne les directions en double (même code) d'une même entreprise en ré-affectant leurs départements et agents"
          >
            {deduping && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Sparkles className="mr-2 h-4 w-4" />Dédupliquer les directions
          </Button>
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
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    disabled={linking === o.id}
                    onClick={() => generateInvite(o)}
                  >
                    {linking === o.id
                      ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      : <LinkIcon className="mr-2 h-4 w-4" />}
                    Lien
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    disabled={deleting === true}
                    onClick={() => setToDelete(o)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {orgs.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune entreprise pour le moment.</p>
          )}
        </div>
      )}

      <Dialog open={!!invite} onOpenChange={(o) => !o && setInvite(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Lien d'accès — {invite?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Envoyez ce lien à l'administrateur de l'entreprise ({invite?.email}). Il pourra définir son
              mot de passe puis compléter les informations de son entreprise dans Paramètres.
            </p>
            <div className="rounded-md border bg-muted/40 p-2 text-xs break-all">{invite?.link}</div>
            <Button
              className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(invite?.link ?? "");
                toast.success("Lien copié");
              }}
            >
              Copier le lien
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette entreprise ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer définitivement « <strong>{toDelete?.name}</strong> ».
              Toutes les données associées (employés, congés, paie, paramètres, etc.) ainsi que les
              comptes utilisateurs de ses membres seront irrémédiablement supprimés. Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
