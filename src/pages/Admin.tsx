import { useEffect, useState } from "react";
import { Shield, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
}

const Admin = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const [{ data: profs }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role").eq("role", "admin"),
    ]);
    setProfiles(profs || []);
    setAdminIds(new Set((roles || []).map((r: any) => r.user_id)));
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const toggleAdmin = async (userId: string) => {
    if (userId === user?.id) {
      toast.error("Vous ne pouvez pas modifier votre propre rôle.");
      return;
    }
    const isAdminUser = adminIds.has(userId);
    if (isAdminUser) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (error) { toast.error(error.message); return; }
      toast.success("Privilèges admin retirés");
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      if (error) { toast.error(error.message); return; }
      toast.success("Promu administrateur");
    }
    refresh();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
        <p className="text-sm text-muted-foreground">Gérez les comptes utilisateurs et leurs rôles.</p>
      </div>

      <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="border-b p-4">
          <h2 className="font-semibold">Utilisateurs ({profiles.length})</h2>
        </div>
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Chargement…</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
                <th className="p-4">Utilisateur</th>
                <th className="p-4">Email</th>
                <th className="p-4">Rôle</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => {
                const isAdminUser = adminIds.has(p.id);
                const isMe = p.id === user?.id;
                return (
                  <tr key={p.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <div className="font-medium">{p.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("fr-FR")}</div>
                    </td>
                    <td className="p-4 text-sm">{p.email}</td>
                    <td className="p-4">
                      {isAdminUser
                        ? <Badge>Admin RH</Badge>
                        : <Badge variant="secondary">Employé</Badge>}
                      {isMe && <Badge variant="outline" className="ml-2">Vous</Badge>}
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        size="sm"
                        variant={isAdminUser ? "outline" : "default"}
                        disabled={isMe}
                        onClick={() => toggleAdmin(p.id)}
                      >
                        {isAdminUser ? <><ShieldOff className="mr-1 h-4 w-4" /> Retirer admin</> : <><Shield className="mr-1 h-4 w-4" /> Promouvoir admin</>}
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {profiles.length === 0 && (
                <tr><td colSpan={4} className="p-12 text-center text-muted-foreground">Aucun utilisateur.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default Admin;
