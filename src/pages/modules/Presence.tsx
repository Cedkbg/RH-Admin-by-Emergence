import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ClipboardList, Plus, ArrowLeft, QrCode, MapPinned, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TextField, SelectField, AreaField, FormGrid, cleanForm } from "@/lib/forms";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { LiveStats } from "@/components/dashboard/LiveStats";
import ValidationConges from "@/pages/ValidationConges";
import { useUserRoles } from "@/hooks/useUserRoles";


interface AttRow { id: string; employee_id: string; date: string; check_in: string | null; check_out: string | null; status: string; }
interface LeaveRow { id: string; employee_id: string; leave_type: string; start_date: string; end_date: string; reason: string | null; status: string; }
interface Emp { id: string; first_name: string; last_name: string; matricule: string | null; direction_id: string | null; department_id: string | null; }
interface RefRow { id: string; name: string; }

const Presence = () => {
  const { isAdmin } = useAuth();
  const { hasAny } = useUserRoles();
  const canValidate = hasAny(["admin", "rh", "secretaire", "assistant_direction"]);
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [directions, setDirections] = useState<Map<string, string>>(new Map());
  const [departments, setDepartments] = useState<Map<string, string>>(new Map());
  const [attendance, setAttendance] = useState<AttRow[]>([]);
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [openAtt, setOpenAtt] = useState(false);
  const [openLeave, setOpenLeave] = useState(false);
  const [att, setAtt] = useState<any>({ employee_id: "", date: new Date().toISOString().slice(0, 10), check_in: "", check_out: "", status: "present" });
  const [leave, setLeave] = useState<any>({ employee_id: "", leave_type: "paid", start_date: "", end_date: "", reason: "", status: "pending" });

  const refresh = async () => {
    const [e, a, l, d, dep] = await Promise.all([
      supabase.from("employees").select("id,first_name,last_name,matricule,direction_id,department_id").order("last_name"),
      supabase.from("attendance").select("*").order("date", { ascending: false }).limit(200),
      supabase.from("leave_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("directions").select("id,name"),
      supabase.from("departments").select("id,name"),
    ]);
    setEmployees((e.data as Emp[]) || []);
    setAttendance((a.data as AttRow[]) || []);
    setLeaves((l.data as LeaveRow[]) || []);
    const dm = new Map<string, string>(); (d.data as RefRow[] || []).forEach((x) => dm.set(x.id, x.name)); setDirections(dm);
    const pm = new Map<string, string>(); (dep.data as RefRow[] || []).forEach((x) => pm.set(x.id, x.name)); setDepartments(pm);
  };
  useEffect(() => { refresh(); }, []);

  const empName = (id: string) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.first_name} ${e.last_name}` : "—";
  };
  const empInfo = (id: string) => {
    const e = employees.find((x) => x.id === id);
    if (!e) return { dir: "—", dep: "—", mat: "—" };
    return {
      dir: e.direction_id ? directions.get(e.direction_id) || "—" : "—",
      dep: e.department_id ? departments.get(e.department_id) || "—" : "—",
      mat: e.matricule || "—",
    };
  };

  const addAtt = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!att.employee_id) { toast.error("Agent requis"); return; }
    const { error } = await supabase.from("attendance").insert(cleanForm(att));
    if (error) { toast.error(error.message); return; }
    toast.success("Pointage enregistré");
    setOpenAtt(false); refresh();
  };

  const addLeave = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!leave.employee_id || !leave.start_date || !leave.end_date) { toast.error("Champs requis manquants"); return; }
    const { error } = await supabase.from("leave_requests").insert(cleanForm(leave));
    if (error) { toast.error(error.message); return; }
    toast.success("Demande créée");
    setOpenLeave(false); refresh();
  };

  const updateLeaveStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("leave_requests").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "Approuvée" : "Refusée");
    refresh();
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate(-1)} className="w-fit -ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Présence & Congés</h1>
          <p className="text-sm text-muted-foreground">Pointage par scan QR + GPS, et gestion des congés.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="default">
            <Link to="/presence/scan"><QrCode className="mr-2 h-4 w-4" /> Pointer (scan)</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/presence/locations"><MapPinned className="mr-2 h-4 w-4" /> Lieux de pointage</Link>
          </Button>
        </div>
      </div>

      <LiveStats variant="presence" />

      <Tabs defaultValue="attendance">

        <TabsList>
          <TabsTrigger value="attendance"><ClipboardList className="mr-2 h-4 w-4" /> Pointage</TabsTrigger>
          <TabsTrigger value="leaves"><CalendarDays className="mr-2 h-4 w-4" /> Congés</TabsTrigger>
          {canValidate && (
            <TabsTrigger value="validation"><ShieldCheck className="mr-2 h-4 w-4" /> Validation</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="attendance" className="mt-4">
          <div className="mb-3 flex justify-between">
            <Badge variant="secondary">{attendance.length} pointage(s)</Badge>
            {isAdmin && <Button onClick={() => setOpenAtt(true)}><Plus className="mr-2 h-4 w-4" /> Pointage</Button>}
          </div>
          <section className="rounded-xl border bg-card shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead><tr className="border-b bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
                <th className="p-4">Date</th><th className="p-4">Agent</th><th className="p-4">Direction</th><th className="p-4">Département</th><th className="p-4">Entrée</th><th className="p-4">Sortie</th><th className="p-4">Statut</th>
              </tr></thead>
              <tbody>
                {attendance.length === 0 ? (
                  <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">Aucun pointage.</td></tr>
                ) : attendance.map((a) => {
                  const info = empInfo(a.employee_id);
                  return (
                  <tr key={a.id} className="border-b hover:bg-muted/50 text-sm">
                    <td className="p-4">{new Date(a.date).toLocaleDateString("fr-FR")}</td>
                    <td className="p-4">
                      <div className="font-semibold">{empName(a.employee_id)}</div>
                      <div className="text-[11px] text-muted-foreground">{info.mat}</div>
                    </td>
                    <td className="p-4"><Badge variant="outline" className="font-normal">{info.dir}</Badge></td>
                    <td className="p-4 text-muted-foreground">{info.dep}</td>
                    <td className="p-4">{a.check_in || "—"}</td>
                    <td className="p-4">{a.check_out || "—"}</td>
                    <td className="p-4"><Badge variant={a.status === "present" ? "default" : "secondary"}>{a.status}</Badge></td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </TabsContent>

        <TabsContent value="leaves" className="mt-4">
          <div className="mb-3 flex justify-between">
            <Badge variant="secondary">{leaves.length} demande(s)</Badge>
            {isAdmin && <Button onClick={() => setOpenLeave(true)}><Plus className="mr-2 h-4 w-4" /> Demande</Button>}
          </div>
          <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
                <th className="p-4">Agent</th><th className="p-4">Type</th><th className="p-4">Du</th><th className="p-4">Au</th><th className="p-4">Statut</th>
                {isAdmin && <th className="p-4">Action</th>}
              </tr></thead>
              <tbody>
                {leaves.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">Aucune demande.</td></tr>
                ) : leaves.map((l) => (
                  <tr key={l.id} className="border-b hover:bg-muted/50 text-sm">
                    <td className="p-4 font-semibold">{empName(l.employee_id)}</td>
                    <td className="p-4">{l.leave_type}</td>
                    <td className="p-4">{new Date(l.start_date).toLocaleDateString("fr-FR")}</td>
                    <td className="p-4">{new Date(l.end_date).toLocaleDateString("fr-FR")}</td>
                    <td className="p-4">
                      <Badge variant={l.status === "approved" ? "default" : l.status === "rejected" ? "destructive" : "outline"}>
                        {l.status === "pending" ? "En attente" : l.status === "approved" ? "Approuvée" : "Refusée"}
                      </Badge>
                    </td>
                    {isAdmin && (
                      <td className="p-4 space-x-1">
                        {l.status === "pending" && <>
                          <Button size="sm" variant="default" onClick={() => updateLeaveStatus(l.id, "approved")}>Approuver</Button>
                          <Button size="sm" variant="outline" onClick={() => updateLeaveStatus(l.id, "rejected")}>Refuser</Button>
                        </>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </TabsContent>

        {canValidate && (
          <TabsContent value="validation" className="mt-4">
            <ValidationConges />
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={openAtt} onOpenChange={setOpenAtt}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau pointage</DialogTitle><DialogDescription>Enregistrer une présence.</DialogDescription></DialogHeader>
          <form onSubmit={addAtt} className="space-y-3">
            <FormGrid>
              <SelectField label="Agent *" value={att.employee_id} onChange={(v) => setAtt({ ...att, employee_id: v })}
                options={employees.map((e) => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))} span={2} />
              <TextField label="Date" value={att.date} onChange={(v) => setAtt({ ...att, date: v })} type="date" span={2} />
              <TextField label="Entrée" value={att.check_in} onChange={(v) => setAtt({ ...att, check_in: v })} type="time" />
              <TextField label="Sortie" value={att.check_out} onChange={(v) => setAtt({ ...att, check_out: v })} type="time" />
              <SelectField label="Statut" value={att.status} onChange={(v) => setAtt({ ...att, status: v })}
                options={[{ value: "present", label: "Présent" }, { value: "absent", label: "Absent" }, { value: "late", label: "En retard" }]} span={2} />
            </FormGrid>
            <DialogFooter><Button variant="outline" type="button" onClick={() => setOpenAtt(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openLeave} onOpenChange={setOpenLeave}>
        <DialogContent>
          <DialogHeader><DialogTitle>Demande de congé</DialogTitle><DialogDescription>Saisir une demande pour un agent.</DialogDescription></DialogHeader>
          <form onSubmit={addLeave} className="space-y-3">
            <FormGrid>
              <SelectField label="Agent *" value={leave.employee_id} onChange={(v) => setLeave({ ...leave, employee_id: v })}
                options={employees.map((e) => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))} span={2} />
              <SelectField label="Type" value={leave.leave_type} onChange={(v) => setLeave({ ...leave, leave_type: v })}
                options={[{ value: "paid", label: "Payé" }, { value: "unpaid", label: "Non payé" }, { value: "sick", label: "Maladie" }, { value: "maternity", label: "Maternité" }]} span={2} />
              <TextField label="Du *" value={leave.start_date} onChange={(v) => setLeave({ ...leave, start_date: v })} type="date" required />
              <TextField label="Au *" value={leave.end_date} onChange={(v) => setLeave({ ...leave, end_date: v })} type="date" required />
              <AreaField label="Motif" value={leave.reason} onChange={(v) => setLeave({ ...leave, reason: v })} />
            </FormGrid>
            <DialogFooter><Button variant="outline" type="button" onClick={() => setOpenLeave(false)}>Annuler</Button><Button type="submit">Créer</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Presence;
