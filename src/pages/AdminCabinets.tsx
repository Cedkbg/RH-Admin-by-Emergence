import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, UserPlus, Loader2, Link2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type RoleKey = "dg" | "dga" | "manager" | "secretaire" | "assistant_direction" | "rh";

const ROLE_META: Record<RoleKey, { label: string; needsDirection: "fixed-DG" | "fixed-DGA" | "any" | "optional" | "none" }> = {
  dg: { label: "Directeur Général", needsDirection: "fixed-DG" },
  dga: { label: "Directeur Général Adjoint", needsDirection: "fixed-DGA" },
  manager: { label: "Manager de Direction", needsDirection: "any" },
  secretaire: { label: "Secrétaire", needsDirection: "optional" },
  assistant_direction: { label: "Assistant de Direction", needsDirection: "any" },
  rh: { label: "Responsable RH", needsDirection: "none" },
};

const HIERARCHY: Record<string, RoleKey[]> = {
  admin: ["dg", "dga", "manager", "secretaire", "assistant_direction", "rh"],
  dg: ["dga", "secretaire", "rh"],
  dga: ["manager", "secretaire"],
  manager: ["assistant_direction"],
};

type ProfileLite = { id: string; full_name: string | null; email: string | null };

export default function AdminCabinets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [callerRoles, setCallerRoles] = useState<string[]>([]);
  const [directions, setDirections] = useState<{ id: string; code: string; name: string }[]>([]);
  const [executives, setExecutives] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [loading, setLoading] = useState(true);

  const allowedRoles = useMemo(() => {
    const set = new Set<RoleKey>();
    callerRoles.forEach((r) => HIERARCHY[r]?.forEach((x) => set.add(x)));
    return Array.from(set);
  }, [callerRoles]);

  const [activeRole, setActiveRole] = useState<RoleKey | null>(null);

  useEffect(() => {
    if (!activeRole && allowedRoles.length) setActiveRole(allowedRoles[0]);
  }, [allowedRoles, activeRole]);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: roles }, { data: dirs }, { data: execs }, { data: profs }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("directions").select("id,code,name").order("code"),
      supabase.from("direction_executives").select("id,role,user_id,direction_id"),
      supabase.from("profiles").select("id,full_name,email").order("full_name"),
    ]);
    setCallerRoles((roles || []).map((r: any) => r.role));
    setDirections(dirs || []);
    setExecutives(execs || []);
    setProfiles(profs || []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [user]);

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground">Chargement…</div>;
  }

  if (!allowedRoles.length) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold">Accès restreint</h1>
        <p className="text-muted-foreground">Vous n'avez pas la permission de gérer les comptes de cabinet.</p>
        <Button onClick={() => navigate(-1)} variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate(-1)} className="w-fit -ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
      </Button>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gestion des cabinets</h1>
        <p className="text-sm text-muted-foreground">
          Créez de nouveaux comptes ou affectez des utilisateurs déjà inscrits à une direction.
        </p>
      </div>

      <Tabs value={activeRole ?? undefined} onValueChange={(v) => setActiveRole(v as RoleKey)}>
        <TabsList className="flex-wrap h-auto">
          {allowedRoles.map((r) => (
            <TabsTrigger key={r} value={r}>{ROLE_META[r].label}</TabsTrigger>
          ))}
        </TabsList>
        {allowedRoles.map((r) => {
          const isSingleton = r === "dg" || r === "dga";
          const alreadyExists = isSingleton && executives.some((e) => e.role === r);
          return (
            <TabsContent key={r} value={r} className="space-y-6">
              {alreadyExists ? (
                <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-foreground">
                  <strong>{ROLE_META[r].label}</strong> déjà désigné. Un seul {ROLE_META[r].label.toLowerCase()} est autorisé dans l'organisation.
                  Retirez l'affectation existante ci-dessous (bouton « Retirer ») avant d'en créer une nouvelle.
                </div>
              ) : (
                <>
                  <AssignExistingForm role={r} directions={directions} profiles={profiles} onAssigned={refresh} />
                  <CreateForm role={r} directions={directions} onCreated={refresh} />
                </>
              )}
              <ExistingList role={r} executives={executives} directions={directions} profiles={profiles} onChanged={refresh} canRemove={callerRoles.includes("admin")} />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

function AssignExistingForm({ role, directions, profiles, onAssigned }: {
  role: RoleKey;
  directions: { id: string; code: string; name: string }[];
  profiles: ProfileLite[];
  onAssigned: () => void;
}) {
  const meta = ROLE_META[role];
  const [userId, setUserId] = useState("");
  const [directionCode, setDirectionCode] = useState<string>(
    meta.needsDirection === "fixed-DG" ? "DG" : meta.needsDirection === "fixed-DGA" ? "DGA" : ""
  );
  const [submitting, setSubmitting] = useState(false);

  const showDirection = meta.needsDirection !== "none";
  const directionLocked = meta.needsDirection === "fixed-DG" || meta.needsDirection === "fixed-DGA";
  const directionRequired = meta.needsDirection === "any" || directionLocked;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) { toast.error("Sélectionnez un utilisateur"); return; }
    if (directionRequired && !directionCode) { toast.error("Sélectionnez une direction"); return; }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("assign-executive", {
      body: { user_id: userId, role, direction_code: directionCode || undefined },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast.error(((data as any)?.error) || error?.message || "Échec de l'affectation");
      return;
    }
    toast.success(`${meta.label} affecté avec succès`);
    setUserId("");
    if (!directionLocked) setDirectionCode("");
    onAssigned();
  };

  return (
    <form onSubmit={submit} className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Affecter un utilisateur existant — {meta.label}</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Choisissez une personne déjà inscrite et assignez-lui ce rôle{showDirection ? " sur la direction de votre choix" : ""}.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Utilisateur *</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger><SelectValue placeholder="Sélectionner un utilisateur" /></SelectTrigger>
            <SelectContent>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {(p.full_name || "—")} {p.email ? `· ${p.email}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {showDirection && (
          <div className="space-y-2">
            <Label>Direction {directionRequired ? "*" : "(optionnel)"}</Label>
            <Select value={directionCode} onValueChange={setDirectionCode} disabled={directionLocked}>
              <SelectTrigger><SelectValue placeholder="Choisir une direction" /></SelectTrigger>
              <SelectContent>
                {directions.map((d) => (
                  <SelectItem key={d.id} value={d.code ?? ""}>{d.code} — {d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting} variant="secondary">
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Affectation…</> : <><Link2 className="mr-2 h-4 w-4" />Affecter</>}
        </Button>
      </div>
    </form>
  );
}

function CreateForm({ role, directions, onCreated }: {
  role: RoleKey;
  directions: { id: string; code: string; name: string }[];
  onCreated: () => void;
}) {
  const meta = ROLE_META[role];
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [directionCode, setDirectionCode] = useState<string>(
    meta.needsDirection === "fixed-DG" ? "DG" : meta.needsDirection === "fixed-DGA" ? "DGA" : ""
  );
  const [submitting, setSubmitting] = useState(false);

  const showDirection = meta.needsDirection !== "none";
  const directionLocked = meta.needsDirection === "fixed-DG" || meta.needsDirection === "fixed-DGA";
  const directionRequired = meta.needsDirection === "any" || directionLocked;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || password.length < 8) {
      toast.error("Nom, email et mot de passe (8+ caractères) requis");
      return;
    }
    if (directionRequired && !directionCode) {
      toast.error("Veuillez choisir une direction");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: {
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        role,
        direction_code: directionCode || undefined,
      },
    });
    setSubmitting(false);
    if (error || (data && (data as any).error)) {
      toast.error(((data as any)?.error) || error?.message || "Échec de la création");
      return;
    }
    toast.success(`Compte ${meta.label} créé`);
    setFullName(""); setEmail(""); setPassword("");
    if (!directionLocked) setDirectionCode("");
    onCreated();
  };

  return (
    <form onSubmit={submit} className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Créer un nouveau compte {meta.label}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nom complet *</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Email *</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Mot de passe initial * (8+ caractères)</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        </div>
        {showDirection && (
          <div className="space-y-2">
            <Label>Direction {directionRequired ? "*" : "(optionnel)"}</Label>
            <Select value={directionCode} onValueChange={setDirectionCode} disabled={directionLocked}>
              <SelectTrigger><SelectValue placeholder="Choisir une direction" /></SelectTrigger>
              <SelectContent>
                {directions.map((d) => (
                  <SelectItem key={d.id} value={d.code ?? ""}>{d.code} — {d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création…</> : <><UserPlus className="mr-2 h-4 w-4" />Créer le compte</>}
        </Button>
      </div>
    </form>
  );
}

function ExistingList({ role, executives, directions, profiles, onChanged, canRemove }: {
  role: RoleKey;
  executives: any[];
  directions: { id: string; code: string; name: string }[];
  profiles: ProfileLite[];
  onChanged: () => void;
  canRemove: boolean;
}) {
  const filtered = executives.filter((e) => e.role === role);
  const dirById = new Map(directions.map((d) => [d.id, d]));
  const profById = new Map(profiles.map((p) => [p.id, p]));
  const [removingId, setRemovingId] = useState<string | null>(null);

  const remove = async (exec: any) => {
    const p = profById.get(exec.user_id);
    const label = ROLE_META[role].label;
    if (!confirm(`Retirer ${p?.full_name || "cet utilisateur"} du rôle ${label} ?\nCela libère le poste et permet d'affecter une autre personne.`)) return;
    setRemovingId(exec.id);
    try {
      const { error: e1 } = await supabase.from("direction_executives").delete().eq("id", exec.id);
      if (e1) throw e1;
      // Vérifier s'il reste d'autres affectations de ce rôle pour cet utilisateur
      const { data: remaining } = await supabase
        .from("direction_executives")
        .select("id")
        .eq("user_id", exec.user_id)
        .eq("role", role);
      if (!remaining || remaining.length === 0) {
        const { error: e2 } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", exec.user_id)
          .eq("role", role);
        if (e2) throw e2;
      }
      toast.success(`${label} retiré`);
      onChanged();
    } catch (err: any) {
      console.error("[remove executive]", err);
      toast.error(err?.message || "Échec du retrait (réservé à l'admin)");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="text-sm font-semibold mb-3">Affectations existantes ({filtered.length})</h3>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun compte assigné pour ce rôle.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((e) => {
            const d = dirById.get(e.direction_id);
            const p = profById.get(e.user_id);
            return (
              <li key={e.id} className="flex items-center justify-between gap-3 text-sm p-2 rounded-md bg-secondary/40">
                <div className="min-w-0">
                  <div className="font-medium truncate">{p?.full_name || "Utilisateur inconnu"}</div>
                  {p?.email && <div className="text-xs text-muted-foreground truncate">{p.email}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {d && <Badge variant="outline">{d.code} — {d.name}</Badge>}
                  {canRemove && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => remove(e)}
                      disabled={removingId === e.id}
                    >
                      {removingId === e.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-4 w-4 mr-1" />Retirer</>}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!canRemove && filtered.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground italic">
          Seul l'administrateur peut retirer une affectation.
        </p>
      )}
    </div>
  );
}
