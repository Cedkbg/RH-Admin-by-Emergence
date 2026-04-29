import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Users, QrCode, CalendarDays, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Direction { id: string; name: string; code: string | null; manager_name: string | null; description: string | null; }
interface Employee { id: string; first_name: string; last_name: string; position: string | null; email: string | null; direction_id: string | null; }

const AgentDashboard = () => {
  const { user } = useAuth();
  const [me, setMe] = useState<Employee | null>(null);
  const [direction, setDirection] = useState<Direction | null>(null);
  const [colleagues, setColleagues] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    (async () => {
      const { data: emp } = await supabase
        .from("employees")
        .select("id, first_name, last_name, position, email, direction_id")
        .ilike("email", user.email!)
        .maybeSingle();
      setMe(emp as Employee | null);

      if (emp?.direction_id) {
        const [{ data: dir }, { data: cols }] = await Promise.all([
          supabase.from("directions").select("id, name, code, manager_name, description").eq("id", emp.direction_id).maybeSingle(),
          supabase.from("employees").select("id, first_name, last_name, position, email, direction_id").eq("direction_id", emp.direction_id).order("last_name"),
        ]);
        setDirection(dir as Direction | null);
        setColleagues((cols as Employee[]) || []);
      }
      setLoading(false);
    })();
  }, [user?.email]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Chargement…</div>;
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          Bonjour {me?.first_name || user?.user_metadata?.full_name?.split(" ")[0] || "Agent"} 👋
        </h1>
        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
          <Mail className="h-3.5 w-3.5" /> {user?.email}
        </p>
      </header>

      {!me ? (
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="font-semibold mb-2">Profil agent non lié</h2>
          <p className="text-sm text-muted-foreground">
            Votre compte n'est pas encore rattaché à une fiche agent. Contactez la RH pour qu'elle associe votre email à votre fiche.
          </p>
        </section>
      ) : !direction ? (
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="font-semibold mb-2">Direction non assignée</h2>
          <p className="text-sm text-muted-foreground">Aucune direction n'est liée à votre fiche agent. Contactez la RH.</p>
        </section>
      ) : (
        <section className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="font-bold text-lg">{direction.name}</h2>
                {direction.code && <Badge variant="secondary">{direction.code}</Badge>}
              </div>
              {direction.manager_name && (
                <p className="text-sm text-muted-foreground mt-1">Responsable : <span className="font-medium text-foreground">{direction.manager_name}</span></p>
              )}
              {direction.description && <p className="text-sm text-muted-foreground mt-2">{direction.description}</p>}
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to={`/direction/${direction.code}`}>Voir la direction</Link>
            </Button>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/presence/scan" className="group rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Pointer ma présence</h3>
              <p className="text-xs text-muted-foreground">Scanner le QR code RH</p>
            </div>
          </div>
        </Link>
        <Link to="/presence" className="group rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-module-green/10 text-module-green flex items-center justify-center">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Mes congés</h3>
              <p className="text-xs text-muted-foreground">Demander un congé</p>
            </div>
          </div>
        </Link>
      </section>

      {colleagues.length > 0 && (
        <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <header className="border-b p-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Équipe — {colleagues.length} agent{colleagues.length > 1 ? "s" : ""}</h2>
          </header>
          <ul className="divide-y">
            {colleagues.map((c) => (
              <li key={c.id} className="flex items-center gap-3 p-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  {(c.first_name[0] || "") + (c.last_name[0] || "")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.first_name} {c.last_name} {c.id === me?.id && <span className="text-xs text-muted-foreground">(vous)</span>}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.position || "—"}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default AgentDashboard;
