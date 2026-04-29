import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, UserPlus, Loader2 } from "lucide-react";
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

export default function AdminCabinets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [callerRoles, setCallerRoles] = useState<string[]>([]);
  const [directions, setDirections] = useState<{ id: string; code: string; name: string }[]>([]);
  const [executives, setExecutives] = useState<any[]>([]);
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
    const [{ data: roles }, { data: dirs }, { data: execs }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("directions").select("id,code,name").order("code"),
      supabase.from("direction_executives").select("id,role,user_id,direction_id"),
    ]);
    setCallerRoles((roles || []).map((r: any) => r.role));
    setDirections(dirs || []);
    setExecutives(execs || []);
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
        <p className="text-muted-foreground">Vous n'avez pas la permission de créer des comptes de cabinet.</p>
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
        <p className="text-sm text-muted-foreground">Créez les comptes de la haute direction et de leurs collaborateurs.</p>
      </div>

      <Tabs value={activeRole ?? undefined} onValueChange={(v) => setActiveRole(v as RoleKey)}>
        <TabsList className="flex-wrap h-auto">
          {allowedRoles.map((r) => (
            <TabsTrigger key={r} value={r}>{ROLE_META[r].label}</TabsTrigger>
          ))}
        </TabsList>
        {allowedRoles.map((r) => (
          <TabsContent key={r} value={r} className="space-y-6">
            <CreateForm role={r} directions={directions} onCreated={refresh} />
            <ExistingList role={r} executives={executives} directions={directions} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
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
        <h2 className="text-lg font-semibold">Créer un compte {meta.label}</h2>
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

function ExistingList({ role, executives, directions }: {
  role: RoleKey;
  executives: any[];
  directions: { id: string; code: string; name: string }[];
}) {
  const filtered = executives.filter((e) => e.role === role);
  const dirById = new Map(directions.map((d) => [d.id, d]));
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="text-sm font-semibold mb-3">Comptes existants ({filtered.length})</h3>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun compte assigné pour ce rôle.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((e) => {
            const d = dirById.get(e.direction_id);
            return (
              <li key={e.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-secondary/40">
                <span className="font-mono text-xs text-muted-foreground">{e.user_id.slice(0, 8)}…</span>
                {d && <Badge variant="outline">{d.code} — {d.name}</Badge>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
