import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Users, QrCode, CalendarDays, Mail, ChevronDown, Network, CheckCircle2, Clock, AlertTriangle, Smartphone, LogIn, LogOut, Wallet, Printer, HeartHandshake, ListChecks, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MyAttendanceCard } from "@/components/dashboard/MyAttendanceCard";

interface Direction { id: string; name: string; code: string | null; manager_name: string | null; description: string | null; }
interface Employee { id: string; first_name: string; last_name: string; position: string | null; email: string | null; direction_id: string | null; }
interface Attendance { id: string; date: string; check_in: string | null; check_out: string | null; status: string; }
interface PaySlip {
  id: string; period: string; net_pay: number; status: string; paid_at: string | null;
  base_salary: number; deductions: number; total_avantages: number; bonus: number; bonus_type: string | null;
  contract_type: string | null; days_worked: number; hours_worked: number; hourly_rate: number; daily_rate: number;
  transport: number; communication: number; loyer: number; allocation_familiale: number;
  cnss: number; ipr: number; inpp: number; onem: number; other_deductions: number;
  bonus_details?: { label?: string; type?: string; amount?: number }[] | null;
}
type PrintableValue = string | number | null | undefined;
const fmt = (n: PrintableValue) => Number(n || 0).toLocaleString("fr-FR");
const esc = (s: PrintableValue) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const sleep = (ms: number) => new Promise<null>((resolve) => setTimeout(() => resolve(null), ms));
const withTimeout = async <T,>(promise: PromiseLike<T>, ms: number): Promise<T | null> => Promise.race([promise, sleep(ms)]) as Promise<T | null>;

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
  const [payslips, setPayslips] = useState<PaySlip[]>([]);
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
    const result = await withTimeout(
      supabase
        .from("attendance")
        .select("id,date,check_in,check_out,status")
        .eq("employee_id", employeeId)
        .eq("date", today)
        .maybeSingle(),
      1800
    );
    setTodayAttendance((result?.data as Attendance | null) ?? null);
  };

  // Timeout de secu : ne jamais laisser l'ecran sur Chargement
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setLoading(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const empResult = await withTimeout(
          supabase
            .from("employees")
            .select("id, first_name, last_name, position, email, direction_id")
            .ilike("email", user.email!)
            .maybeSingle(),
          2200
        );
        const emp = empResult?.data;
        setMe(emp as Employee | null);

        const allDirsResult = await withTimeout(
          supabase
            .from("directions")
            .select("id, name, code, manager_name, description")
            .order("code"),
          1800
        );
        const allDirs = allDirsResult?.data;
        setAllDirections((allDirs as Direction[]) || []);

        if (emp?.direction_id) {
          const detailResult = await withTimeout(
            Promise.all([
              supabase.from("directions").select("id, name, code, manager_name, description").eq("id", emp.direction_id).maybeSingle(),
              supabase.from("employees").select("id, first_name, last_name, position, email, direction_id").eq("direction_id", emp.direction_id).order("last_name"),
            ]),
            2200
          );
          setDirection((detailResult?.[0]?.data as Direction | null) ?? null);
          setColleagues((detailResult?.[1]?.data as Employee[]) || []);
        }
        if (emp?.id) {
          await loadAttendance(emp.id).catch(() => null);
          const psResult = await withTimeout(
            supabase.from("payroll").select("*").eq("employee_id", emp.id).order("period", { ascending: false }).limit(12),
            1800
          );
          const ps = psResult?.data;
          setPayslips((ps as PaySlip[]) || []);
        }
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

      {me && <MyAttendanceCard employeeId={me.id} />}

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

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/bien-etre" className="group rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Mon bien-être</h3>
              <p className="text-xs text-muted-foreground">Début & fin de journée</p>
            </div>
          </div>
        </Link>
        <Link to="/mes-conges" className="group rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
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

      {payslips.length > 0 && (
        <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <header className="border-b p-4 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Mes bulletins de paie</h2>
            <Badge variant="secondary" className="ml-1">{payslips.length}</Badge>
          </header>
          <ul className="divide-y">
            {payslips.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 p-3 hover:bg-muted/30">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Période {p.period}</p>
                  <p className="text-xs text-muted-foreground">
                    Net : <span className="font-bold text-primary">{fmt(p.net_pay)} FC</span>
                    {" • "}<Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => {
                  const w = window.open("", "_blank", "width=800,height=900");
                  if (!w) return;
                  const primes = Array.isArray(p.bonus_details) && p.bonus_details.length > 0
                    ? p.bonus_details.map((b) => `<tr><td>Prime ${esc(b.label || b.type || "")}</td><td class="r">${fmt(b.amount)}</td></tr>`).join("")
                    : `<tr><td>Prime ${esc(p.bonus_type || "")}</td><td class="r">${fmt(p.bonus)}</td></tr>`;
                  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Bulletin ${esc(p.period)}</title>
<style>body{font-family:Arial;padding:32px;color:#222;max-width:780px;margin:auto}h1{margin:0 0 4px;font-size:20px}h2{font-size:14px;margin:18px 0 6px;border-bottom:2px solid #333}table{width:100%;border-collapse:collapse}td{padding:4px 6px;border-bottom:1px solid #eee;font-size:13px}.r{text-align:right}.tot{font-weight:bold;background:#f0f4ff}</style>
</head><body>
<h1>BULLETIN DE PAIE</h1><p>Période : <b>${esc(p.period)}</b> &nbsp;|&nbsp; ${esc(me?.first_name)} ${esc(me?.last_name)} &nbsp;|&nbsp; Contrat : ${esc(p.contract_type || "—")}</p>
<h2>Présence</h2><table><tr><td>Jours prestés</td><td class="r">${fmt(p.days_worked)}</td></tr><tr><td>Heures</td><td class="r">${fmt(p.hours_worked)} h</td></tr><tr class="tot"><td>Salaire brut</td><td class="r">${fmt(p.base_salary)} FC</td></tr></table>
<h2>Avantages</h2><table><tr><td>Transport</td><td class="r">${fmt(p.transport)}</td></tr><tr><td>Communication</td><td class="r">${fmt(p.communication)}</td></tr><tr><td>Loyer</td><td class="r">${fmt(p.loyer)}</td></tr><tr><td>Allocation familiale</td><td class="r">${fmt(p.allocation_familiale)}</td></tr>${primes}<tr class="tot"><td>Total</td><td class="r">+ ${fmt(p.total_avantages)} FC</td></tr></table>
<h2>Retenues</h2><table><tr><td>CNSS</td><td class="r">${fmt(p.cnss)}</td></tr><tr><td>IPR</td><td class="r">${fmt(p.ipr)}</td></tr><tr><td>INPP</td><td class="r">${fmt(p.inpp)}</td></tr><tr><td>ONEM</td><td class="r">${fmt(p.onem)}</td></tr><tr><td>Autres</td><td class="r">${fmt(p.other_deductions)}</td></tr><tr class="tot"><td>Total</td><td class="r">- ${fmt(p.deductions)} FC</td></tr></table>
<h2>Net à payer</h2><table><tr class="tot" style="background:#dbeafe;font-size:18px"><td>SALAIRE NET</td><td class="r">${fmt(p.net_pay)} FC</td></tr></table>
<script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
                  w.document.close();
                }}><Printer className="h-3.5 w-3.5 mr-1" /> Bulletin</Button>
              </li>
            ))}
          </ul>
        </section>
      )}

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
                  {((c.first_name || "")[0] || "") + ((c.last_name || "")[0] || "")}
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
