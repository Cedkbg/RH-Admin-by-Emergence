import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ShieldCheck, ShieldOff, UserPlus } from "lucide-react";
import { toast } from "sonner";

type AppRole =
  | "admin" | "dg" | "dga" | "manager" | "rh"
  | "assistant_direction" | "secretaire" | "employee";

const ALL_ROLES: AppRole[] = [
  "admin", "dg", "dga", "manager", "rh",
  "assistant_direction", "secretaire", "employee",
];

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  dg: "DG",
  dga: "DGA",
  manager: "Manager",
  rh: "RH",
  assistant_direction: "Assist. Direction",
  secretaire: "Secrétaire",
  employee: "Agent",
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  dg: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  dga: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
  manager: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  rh: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  assistant_direction: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  secretaire: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  employee: "bg-muted text-muted-foreground border-border",
};

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  approval_status: string;
}

export function RolesManager() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rolesByUser, setRolesByUser] = useState<Record<string, AppRole[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<AppRole>("employee");
  const [principalAdminId, setPrincipalAdminId] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const [{ data: profs }, { data: roles }, { data: principalAdmin }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, approval_status").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("app_settings").select("value").eq("key", "principal_admin_id").limit(1).maybeSingle(),
    ]);
    setProfiles((profs as Profile[]) || []);
    const principalValue = principalAdmin?.value;
    setPrincipalAdminId(typeof principalValue === "string" ? principalValue : null);
    const map: Record<string, AppRole[]> = {};
    (roles || []).forEach((r: any) => {
      (map[r.user_id] ||= []).push(r.role);
    });
    setRolesByUser(map);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) =>
      `${p.full_name || ""} ${p.email || ""}`.toLowerCase().includes(q),
    );
  }, [profiles, search]);

  const addRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) return toast.error(error.message);
    toast.success(`Rôle ${ROLE_LABEL[role]} attribué`);
    setAddingFor(null);
    refresh();
  };

  const removeRole = async (userId: string, role: AppRole) => {
    if (principalAdminId === userId && role === "admin") {
      toast.error("Le rôle Admin du compte principal est protégé.");
      return;
    }
    if (userId === user?.id && role === "admin") {
      if (!confirm("⚠️ Vous êtes sur le point de retirer votre propre rôle admin. Continuer ?")) return;
    } else if (!confirm(`Retirer le rôle ${ROLE_LABEL[role]} ?`)) return;
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role);
    if (error) return toast.error(error.message);
    toast.success("Rôle retiré");
    refresh();
  };

  return (
    <section className="space-y-4">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un utilisateur…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {filtered.length} utilisateur{filtered.length > 1 ? "s" : ""}. Les changements de rôle sont audités.
        </p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
                <th className="p-4">Utilisateur</th>
                <th className="p-4">Statut</th>
                <th className="p-4">Rôles</th>
                <th className="p-4 w-72">Ajouter un rôle</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="p-12 text-center text-muted-foreground">Chargement…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="p-12 text-center text-muted-foreground">Aucun utilisateur.</td></tr>
              ) : filtered.map((p) => {
                const roles = rolesByUser[p.id] || [];
                const isPrincipalAdmin = principalAdminId === p.id;
                const available = ALL_ROLES.filter((r) => !roles.includes(r));
                const isAdding = addingFor === p.id;
                return (
                  <tr key={p.id} className="border-b hover:bg-muted/50 text-sm align-top">
                    <td className="p-4">
                      <div className="font-medium">{p.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{p.email}</div>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={p.approval_status === "approved" ? "default" : "outline"}
                        className={
                          p.approval_status === "approved" ? "" :
                          p.approval_status === "rejected" ? "border-destructive/50 text-destructive" : ""
                        }
                      >
                        {p.approval_status === "approved" ? "Approuvé"
                          : p.approval_status === "rejected" ? "Refusé" : "En attente"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5">
                        {roles.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">Aucun rôle</span>
                        ) : roles.map((r) => {
                          const protectedRole = isPrincipalAdmin && r === "admin";
                          return (
                            <Badge
                              key={r}
                              variant="outline"
                              className={`${ROLE_COLORS[r]} ${protectedRole ? "pr-2" : "group cursor-pointer pr-1"}`}
                              onClick={protectedRole ? undefined : () => removeRole(p.id, r)}
                              title={protectedRole ? "Rôle administrateur principal protégé" : "Cliquer pour retirer"}
                            >
                              {ROLE_LABEL[r]}
                              {protectedRole ? (
                                <ShieldCheck className="ml-1 h-3 w-3 opacity-70" />
                              ) : (
                                <ShieldOff className="ml-1 h-3 w-3 opacity-60 group-hover:opacity-100" />
                              )}
                            </Badge>
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-4">
                      {isAdding ? (
                        <div className="flex gap-2">
                          <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {available.map((r) => (
                                <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" onClick={() => addRole(p.id, newRole)} disabled={!available.includes(newRole)}>
                            <ShieldCheck className="mr-1 h-3.5 w-3.5" /> OK
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setAddingFor(null)}>Annuler</Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={available.length === 0}
                          onClick={() => { setAddingFor(p.id); setNewRole(available[0] || "employee"); }}
                        >
                          <UserPlus className="mr-1 h-3.5 w-3.5" /> Ajouter
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
