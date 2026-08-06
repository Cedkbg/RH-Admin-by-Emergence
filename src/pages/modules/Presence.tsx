import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ClipboardList, Plus, ArrowLeft, QrCode, MapPinned, ShieldCheck, Trash2, Eraser, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { AgentPresenceBlock } from "@/components/presence/AgentPresenceBlock";
import { AgentPresenceHistory } from "@/components/presence/AgentPresenceHistory";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} 
from "@/components/ui/select";

interface AttRow { id: string; employee_id: string; date: string; check_in: string | null; check_out: string | null; status: string; }
interface LeaveRow { id: string; employee_id: string; leave_type: string; start_date: string; end_date: string; reason: string | null; status: string; }
interface Emp { id: string; first_name: string; last_name: string; matricule: string | null; direction_id: string | null; department_id: string | null; position: string | null; hourly_rate: number | null; base_salary: number | null; }
interface RefRow { id: string; name: string; }

const currentPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const periodLabel = (p: string) => {
  const [y, m] = p.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());
};

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
  const [attendancePeriod, setAttendancePeriod] = useState(currentPeriod());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const refresh = async () => {
    const [e, a, l, d, dep] = await Promise.all([
      supabase.from("employees").select("id,first_name,last_name,matricule,direction_id,department_id,position,hourly_rate,base_salary").order("last_name"),
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

  const deleteAttendance = async (id: string) => {
    if (!confirm("Supprimer ce pointage ?")) return;
    const { error } = await supabase.from("attendance").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Pointage supprimé"); refresh();
  };

  const purgeOldAttendance = async () => {
    if (!confirm("Supprimer tous les pointages de plus de 90 jours ?")) return;
    const cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const { error } = await supabase.from("attendance").delete().lt("date", cutoff);
    if (error) { toast.error(error.message); return; }
    toast.success("Anciens pointages supprimés"); refresh();
  };

  const deleteLeave = async (id: string) => {
    if (!confirm("Supprimer cette demande de congé ?")) return;
    const { error } = await supabase.from("leave_requests").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Demande supprimée"); refresh();
  };

  // Compute agent blocks data from attendance records
  const agentBlocks = useMemo(() => {
    const [y, m] = attendancePeriod.split("-").map(Number);
    let workingDays = 0;
    for (let d = new Date(y, m - 1, 1); d.getMonth() === m - 1; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0) workingDays++;
    }

    const periodAtt = attendance.filter((a) => a.date.startsWith(attendancePeriod));

    const agentMap = new Map<string, { days: Set<string>; totalHours: number; lastCheckIn: string | null; isCurrent: boolean }>();
    const todayStr = new Date().toISOString().slice(0, 10);
    
    periodAtt.forEach((a) => {
      let rec = agentMap.get(a.employee_id);
      if (!rec) {
        rec = { days: new Set(), totalHours: 0, lastCheckIn: null, isCurrent: false };
        agentMap.set(a.employee_id, rec);
      }
      rec.days.add(a.date);
      if (a.check_in && a.check_out) {
        const [h1, m1] = a.check_in.split(":").map(Number);
        const [h2, m2] = a.check_out.split(":").map(Number);
        const diff = (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
        if (diff > 0) rec.totalHours += diff;
        rec.lastCheckIn = null;
        rec.isCurrent = false;
      }
      // If today and has check_in but no check_out = currently working
      if (a.date === todayStr && a.check_in && !a.check_out) {
        rec.isCurrent = true;
        rec.lastCheckIn = a.check_in;
      }
    });

    return employees
      .map((emp) => {
        const stats = agentMap.get(emp.id);
        const daysWorked = stats ? stats.days.size : 0;
        const totalHours = stats ? Math.round(stats.totalHours * 100) / 100 : 0;
        const presenceRate = workingDays > 0 ? Math.round((daysWorked / workingDays) * 100) : 0;
        
        // Calculate hourly rate + salary
        const hr = Number(emp.hourly_rate || 0);
        const baseSal = Number(emp.base_salary || 0);
        const hourlyRate = hr > 0 ? hr : (baseSal > 0 ? baseSal / 160 : 0);
        const earnedSalary = +(totalHours * hourlyRate).toFixed(2);
        
        return {
          agentId: emp.id,
          firstName: emp.first_name,
          lastName: emp.last_name,
          matricule: emp.matricule,
          direction: emp.direction_id ? directions.get(emp.direction_id) || "—" : "—",
          department: emp.department_id ? departments.get(emp.department_id) || "—" : "—",
          position: emp.position,
          daysWorked,
          workingDays,
          totalHours,
          presenceRate,
          hourlyRate,
          earnedSalary,
          isCurrentlyWorking: stats?.isCurrent || false,
          currentCheckIn: stats?.lastCheckIn || null,
        };
      })
      .filter((block) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          block.lastName.toLowerCase().includes(q) ||
          block.firstName.toLowerCase().includes(q) ||
          (block.matricule || "").toLowerCase().includes(q) ||
          block.direction.toLowerCase().includes(q)
        );
      });
  }, [employees, attendance, attendancePeriod, directions, searchQuery]);

  const selectedAgent = selectedAgentId ? employees.find((e) => e.id === selectedAgentId) : null;

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
          {/* Period selector & search bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Période :</span>
              <Select value={attendancePeriod} onValueChange={setAttendancePeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                    return <SelectItem key={key} value={key}>{periodLabel(key)}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un agent"
                  className="h-9 pl-9 text-sm"
                />
              </div>
              <Badge variant="secondary" className="h-9 px-3">
                {agentBlocks.filter((b) => b.daysWorked > 0).length}/{agentBlocks.length} actifs
              </Badge>
              {isAdmin && (
                <>
                  <Button size="sm" variant="outline" onClick={purgeOldAttendance}>
                    <Eraser className="mr-1 h-4 w-4" /> Purge {`>`}90j
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setOpenAtt(true)}>
                    <Plus className="mr-1 h-4 w-4" /> Pointage
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Agent blocks grid */}
          {agentBlocks.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card p-12 text-center text-sm text-muted-foreground">
              {searchQuery ? "Aucun agent ne correspond à votre recherche." : "Aucune donnée de présence pour cette période."}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {agentBlocks.map((block) => (
                <AgentPresenceBlock
                  key={block.agentId}
                  {...block}
                  period={periodLabel(attendancePeriod)}
                  onClick={() => setSelectedAgentId(block.agentId)}
                />
              ))}
            </div>
          )}
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
                      <td className="p-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          {l.status === "pending" && <>
                            <Button size="sm" variant="default" onClick={() => updateLeaveStatus(l.id, "approved")}>Approuver</Button>
                            <Button size="sm" variant="outline" onClick={() => updateLeaveStatus(l.id, "rejected")}>Refuser</Button>
                          </>}
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deleteLeave(l.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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

      {/* Agent history dialog */}
      <AgentPresenceHistory
        agentId={selectedAgentId}
        firstName={selectedAgent?.first_name || ""}
        lastName={selectedAgent?.last_name || ""}
        matricule={selectedAgent?.matricule || null}
        direction={selectedAgent?.direction_id ? directions.get(selectedAgent.direction_id) || "—" : "—"}
        onClose={() => setSelectedAgentId(null)}
      />

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

