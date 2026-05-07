import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Users, QrCode, CalendarDays, Mail, ChevronDown, Network, CheckCircle2, Clock, AlertTriangle, Smartphone, LogIn, LogOut, Wallet, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Direction { id: string; name: string; code: string | null; manager_name: string | null; description: string | null; }
interface Employee { id: string; first_name: string; last_name: string; position: string | null; email: string | null; direction_id: string | null; }
interface Attendance { id: string; date: string; check_in: string | null; check_out: string | null; status: string; }

// Heure limite d'arrivee (configurable plus tard via app_settings)
const ARRIVAL_DEADLINE_HOUR = 9; // 09:00

const AgentDashboard = () => {
  const { user } = useAuth();
  const [me, setMe] = useState<Employee | null>(null);
  const [direction, setDirection] = useState<Direction | null>(null);
  const [colleagues, setColleagues] = useState<Employee[]>([]);
  const [allDirections, setAllDirections] = useState<Direction[]>([]);
  const [showAllDirections, setShowAllDirections] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // Notification au retour de la page de scan
  useEffect(() => {
    const flag = sessionStorage.getItem("attendance:justScanned");
    if (flag) {
      sessionStorage.removeItem("attendance:justScanned");
      toast.success(flag === "check_in" ? "Entree enregistree ✅" : "Sortie enregistree ✅");
    }
  }, []);

  // Tic-tac pour rafraichir l'alerte d'heure limite
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const loadAttendance = async (employeeId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("attendance")
      .select("id,date,check_in,check_out,status")
      .eq("employee_id", employeeId)
      .eq("date", today)
      .maybeSingle();
    setTodayAttendance((data as Attendance | null) ?? null);
  };

  // Timeout de secu pour eviter le blocage (8 secondes)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn("AgentDashboard: timeout atteint, affichage force");
        setLoading(false);
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    
    const fetchData = async () => {
      try {
        const { data: emp } = await supabase
          .from("employees")
          .select("id, first_name, last_name, position, email, direction_id")
          .ilike("email", user.email!)
          .maybeSingle();
        setMe(emp as Employee | null);

        const { data: allDirs } = await supabase
          .from("directions")
          .select("id, name, code, manager_name, description")
          .order("code");
        setAllDirections((allDirs as Direction[]) || []);

        if (emp?.direction_id) {
          const [{ data: dir }, { data: cols }] = await Promise.all([
            supabase.from("directions").select("id, name, code, manager_name, description").eq("id", emp.direction_id).maybeSingle(),
            supabase.from("employees").select("id, first_name, last_name, position, email, direction_id").eq("direction_id", emp.direction_id).order("last_name"),
          ]);
          setDirection(dir as Direction | null);
          setColleagues((cols as Employee[]) || []);
        }
        if (emp?.id) await loadAttendance(emp.id);
      } catch (err) {
        console.error("Erreur AgentDashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user?.email]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Chargement…</div>;
  }

  const checkedIn = !!todayAttendance?.check_in;
  const checkedOut = !!todayAttendance?.check_out;
  const fullyDone = checkedIn && checkedOut;
  const isLate = !checkedIn && (now.getHours() > ARRIVAL_DEADLINE_HOUR ||
    (now.getHours() === ARRIVAL_DEADLINE_HOUR && now.getMinutes() > 0));

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

      {/* ====== BLOC PRESENCE DU JOUR — gros bouton + statut ====== */}
      {me && (
        <section className={`rounded-2xl border-2 p-5 shadow-sm transition-colors ${
          fullyDone ? "border-green-500/40 bg-green-50 dark:bg-green-950/20"
          : checkedIn ? "border-blue-500/40 bg-blue-50 dark:bg-blue-950/20"
          : isLate ? "border-destructive/40 bg-destructive/5"
          : "border-primary/40 bg-primary/5"
        }`}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-lg">Ma presence aujourd'hui</h2>
                <Badge variant="outline" className="text-xs">
                  {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                </Badge>
              </div>

              {/* Statut */}
              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  {checkedIn ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                  <span><b>Entree :</b> {checkedIn ? todayAttendance!.check_in?.slice(0, 5) : <span className="text-muted-foreground">non pointee</span>}</span>
                </div>
                <div className="flex items-center gap-2">
                  {checkedOut ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                  <span><b>Sortie :</b> {checkedOut ? todayAttendance!.check_out?.slice(0, 5) : <span className="text-muted-foreground">non pointee</span>}</span>
                </div>
              </div>

              {/* Alerte heure limite */}
              {isLate && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Vous n'avez pas encore pointe votre arrivee. L'heure limite etait <b>{String(ARRIVAL_DEADLINE_HOUR).padStart(2, "0")}:00</b> — pensez a scanner des que possible.</span>
                </div>
              )}
              {fullyDone && (
                <p className="mt-3 text-sm text-green-700 dark:text-green-400">
                  ✅ Journee complete enregistree. Bonne soirEE !
                </p>
              )}
            </div>
          </div>

          {/* GROS BOUTON Pointer maintenant */}
          {!fullyDone && (
            <Button
              asChild
              size="lg"
              className="mt-5 w-full h-16 text-base font-semibold shadow-md"
            >
              <Link to="/presence/scan">
                {checkedIn ? <LogOut className="mr-2 h-5 w-5" /> : <LogIn className="mr-2 h-5 w-5" />}
                {checkedIn ? "Pointer ma sortie" : "Pointer maintenant"}
                <QrCode className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          )}
        </section>
      )}

      {!me ? (
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="font-semibold mb-2">Profil agent non lie</h2>
          <p className="text-sm text-muted-foreground">
            Votre compte n'est pas encore rattache a une fiche agent. Contactez la RH pour qu'elle associe votre email a votre fiche.
          </p>
        </section>
      ) : !direction ? (
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="font-semibold mb-2">Direction non assignee</h2>
          <p className="text-sm text-muted-foreground">Aucune direction n'est liee a votre fiche agent. Contactez la RH.</p>
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

      <Collapsible open={showAllDirections} onOpenChange={setShowAllDirections}>
        <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Toutes les directions</h2>
              <Badge variant="secondary" className="ml-1">{allDirections.length}</Badge>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showAllDirections ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="divide-y border-t">
              {allDirections.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 p-3 hover:bg-muted/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate flex items-center gap-2">
                        {d.name}
                        {d.code && <Badge variant="outline" className="text-[10px]">{d.code}</Badge>}
                        {d.id === direction?.id && <Badge className="text-[10px]">Ma direction</Badge>}
                      </p>
                      {d.manager_name && (
                        <p className="text-xs text-muted-foreground truncate">Resp. {d.manager_name}</p>
                      )}
                    </div>
                  </div>
                  {d.code && (
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/direction/${d.code}`}>Voir</Link>
                    </Button>
                  )}
                </li>
              ))}
              {allDirections.length === 0 && (
                <li className="p-6 text-center text-sm text-muted-foreground">Aucune direction.</li>
              )}
            </ul>
          </CollapsibleContent>
        </section>
      </Collapsible>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/presence" className="group rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-module-green/10 text-module-green flex items-center justify-center">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Mes conges</h3>
              <p className="text-xs text-muted-foreground">Demander un conge</p>
            </div>
          </div>
        </Link>
        <Link to="/install" className="group rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Installer l'app</h3>
              <p className="text-xs text-muted-foreground">Sur l'ecran d'accueil</p>
            </div>
          </div>
        </Link>
        <Link to="/presence/scan" className="group rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-accent/40 text-foreground flex items-center justify-center">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Scanner un QR</h3>
              <p className="text-xs text-muted-foreground">Pointage rapide</p>
            </div>
          </div>
        </Link>
      </section>

      {colleagues.length > 0 && (
        <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <header className="border-b p-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Equipe — {colleagues.length} agent{colleagues.length > 1 ? "s" : ""}</h2>
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
