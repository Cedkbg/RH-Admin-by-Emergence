import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, Mail, Trash2, Filter, Pencil, ArrowLeft, Send, CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Champ date sûr dans une Dialog Radix : Popover + Calendar (évite le conflit
 *  focus-trap avec le picker natif <input type="date"> qui faisait "bégayer"
 *  tout le formulaire dès qu'on cliquait sur la date de naissance). */
function SafeDateField({
  value, onChange, placeholder = "Choisir une date", disabledFuture = false,
}: { value: string; onChange: (v: string) => void; placeholder?: string; disabledFuture?: boolean }) {
  const date = value ? parseISO(value) : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd MMMM yyyy", { locale: fr }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[60]" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : "")}
          captionLayout="dropdown-buttons"
          fromYear={1940}
          toYear={new Date().getFullYear() + 1}
          disabled={disabledFuture ? (d) => d > new Date() : undefined}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useSearchParams, useNavigate } from "react-router-dom";

interface DirectionRow { id: string; name: string; code: string | null; manager_name: string | null }
interface DepartmentRow { id: string; name: string; direction_id: string }
interface EmployeeRow {
  id: string;
  matricule: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  birth_date: string | null;
  position: string | null;
  direction_id: string | null;
  department_id: string | null;
  contract_type: string | null;
  gender: string | null;
  base_salary: number | null;
  manager_id: string | null;
  status: "active" | "suspended" | "departed";
  hire_date: string | null;
}

const POSITION_SUGGESTIONS = [
  "Directeur", "Manager", "Secrétaire", "Assistant(e)", "Chef de service",
  "Analyste", "Chargé(e) de mission", "Comptable", "Développeur", "Technicien",
  "Agent administratif", "Coordinateur", "Stagiaire", "Consultant",
];

const CONTRACT_TYPES = ["CDI", "CDD", "Stage", "Alternance", "Freelance", "Intérim"];

const DEFAULT_DIRECTIONS: DirectionRow[] = [
  { id: "DG", code: "DG", name: "Direction Générale", manager_name: null },
  { id: "DGA", code: "DGA", name: "Direction Générale Adjointe", manager_name: null },
  { id: "D1", code: "D1", name: "Direction Technologie", manager_name: null },
  { id: "D2", code: "D2", name: "Direction Produits", manager_name: null },
  { id: "D3", code: "D3", name: "Direction Opérations", manager_name: null },
  { id: "D4", code: "D4", name: "Direction Financière", manager_name: null },
  { id: "D5", code: "D5", name: "Direction Risques", manager_name: null },
  { id: "D6", code: "D6", name: "Direction Commerciale", manager_name: null },
  { id: "D7", code: "D7", name: "Direction RH", manager_name: null },
  { id: "D8", code: "D8", name: "Direction Juridique", manager_name: null },
];

const statusLabel: Record<EmployeeRow["status"], string> = {
  active: "Actif", suspended: "Suspendu", departed: "Départ",
};

const blankForm = {
  first_name: "", last_name: "", email: "", phone: "", address: "",
  birth_date: "", position: "", direction_id: "", department_id: "", department_name: "",
  contract_type: "CDI", gender: "", base_salary: "", manager_id: "",
  status: "active" as EmployeeRow["status"], hire_date: "",
};

const DIRECTION_MENU_CLASS = "max-h-[220px] touch-pan-y overflow-y-auto overscroll-contain";

const Employes = () => {
  const { isAdmin } = useAuth();
  const { hasAny } = useUserRoles();
  // Tous les "chefs" + RH peuvent ajouter/éditer un agent
  const canManage = isAdmin || hasAny(["rh", "dg", "dga", "manager", "secretaire", "assistant_direction"]);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [directions, setDirections] = useState<DirectionRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [query, setQuery] = useState(params.get("q") || "");
  const [activeDir, setActiveDir] = useState<string | "all">("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [credentials, setCredentials] = useState<{ email: string; password: string; loginUrl: string; isNew: boolean } | null>(null);

  useEffect(() => { setQuery(params.get("q") || ""); }, [params]);

  const refresh = async () => {
    const [d, dep, e] = await Promise.all([
      supabase.from("directions").select("id,name,code,manager_name").order("code"),
      supabase.from("departments").select("id,name,direction_id").order("name"),
      supabase.from("employees").select("*").order("created_at", { ascending: false }),
    ]);
    setDirections(((d.data as DirectionRow[]) || []));
    setDepartments((dep.data as DepartmentRow[]) || []);
    setEmployees((e.data as EmployeeRow[]) || []);
  };

  useEffect(() => { refresh(); }, []);

  // Auto-ouverture du formulaire via ?new=1&direction=...
  useEffect(() => {
    if (params.get("new") === "1") {
      setEditingId(null);
      setForm({ ...blankForm, direction_id: params.get("direction") || "" });
      setOpen(true);
    }
  }, [params]);

  const filteredDepartments = useMemo(
    () => departments.filter((d) => !form.direction_id || d.direction_id === form.direction_id),
    [departments, form.direction_id]
  );

  const filtered = useMemo(() => employees.filter((e) => {
    const okDir = activeDir === "all" || e.direction_id === activeDir;
    const q = query.toLowerCase();
    const okQ = !q ||
      e.first_name.toLowerCase().includes(q) ||
      e.last_name.toLowerCase().includes(q) ||
      (e.email || "").toLowerCase().includes(q) ||
      (e.position || "").toLowerCase().includes(q) ||
      (e.matricule || "").toLowerCase().includes(q);
    return okDir && okQ;
  }), [employees, query, activeDir]);

  const openCreate = () => { setEditingId(null); setForm(blankForm); setOpen(true); };
  const openEdit = (e: EmployeeRow) => {
    setEditingId(e.id);
    setForm({
      first_name: e.first_name, last_name: e.last_name,
      email: e.email ?? "", phone: e.phone ?? "", address: e.address ?? "",
      birth_date: e.birth_date ?? "", position: e.position ?? "",
      direction_id: e.direction_id ?? "", department_id: e.department_id ?? "",
      department_name: departments.find((d) => d.id === e.department_id)?.name ?? "",
      contract_type: e.contract_type ?? "CDI", gender: e.gender ?? "",
      base_salary: e.base_salary?.toString() ?? "", manager_id: e.manager_id ?? "",
      status: e.status, hire_date: e.hire_date ?? "",
    });
    setOpen(true);
  };

  const handleSave = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.first_name || !form.last_name) { toast.error("Prénom et nom requis"); return; }
    setLoading(true);

    // Création à la volée du département s'il n'existe pas
    let departmentId = form.department_id || null;
    const deptName = form.department_name.trim();
    if (deptName && form.direction_id) {
      const existing = departments.find(
        (d) => d.direction_id === form.direction_id && d.name.toLowerCase() === deptName.toLowerCase()
      );
      if (existing) {
        departmentId = existing.id;
      } else {
        const { data: newDept, error: deptErr } = await supabase
          .from("departments")
          .insert({ name: deptName, direction_id: form.direction_id })
          .select("id,name,direction_id")
          .maybeSingle();
        if (deptErr) { setLoading(false); toast.error("Département : " + deptErr.message); return; }
        if (newDept) {
          departmentId = newDept.id;
          setDepartments((prev) => [...prev, newDept as DepartmentRow]);
        }
      }
    }

    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      birth_date: form.birth_date || null,
      position: form.position || null,
      direction_id: form.direction_id || null,
      department_id: departmentId,
      contract_type: form.contract_type || null,
      gender: form.gender || null,
      base_salary: form.base_salary ? Number(form.base_salary) : 0,
      manager_id: form.manager_id || null,
      status: form.status,
      hire_date: form.hire_date || null,
    };
    const { data: saved, error } = editingId
      ? await supabase.from("employees").update(payload).eq("id", editingId).select("id, email, first_name, last_name").maybeSingle()
      : await supabase.from("employees").insert(payload).select("id, email, first_name, last_name").maybeSingle();
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? "Agent modifié" : "Agent ajouté (matricule auto-généré)");
    setOpen(false);

    // Auto-invitation si nouvel agent avec email
    if (!editingId && saved?.email) {
      handleInvite({
        id: (saved as any).id,
        email: (saved as any).email,
        first_name: (saved as any).first_name,
        last_name: (saved as any).last_name,
      } as EmployeeRow);
    }
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet agent ?")) return;
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Agent supprimé");
    refresh();
  };

  const handleInvite = async (e: EmployeeRow, resetPassword = false) => {
    if (!e.email) { toast.error("Cet agent n'a pas d'email."); return; }
    const fullName = `${e.first_name} ${e.last_name}`.trim();
    const t = toast.loading(`Création du compte pour ${e.email}…`);
    const { data, error } = await supabase.functions.invoke("invite-employee", {
      body: {
        email: e.email,
        full_name: fullName,
        employee_id: e.id,
        reset_password: resetPassword,
      },
    });
    toast.dismiss(t);
    const res = data as any;
    if (error || (res && res.error)) {
      toast.error(res?.error || error?.message || "Échec");
      return;
    }
    if (res?.already_active && !resetPassword) {
      if (confirm(`${e.email} a déjà un compte actif. Voulez-vous générer un nouveau mot de passe (le précédent sera remplacé) ?`)) {
        return handleInvite(e, true);
      }
      return;
    }
    setCredentials({
      email: res.email,
      password: res.temp_password,
      loginUrl: res.login_url,
      isNew: !!res.is_new,
    });
    toast.success(`Compte prêt pour ${e.email}`);
  };

  const managerOptions = employees.filter((e) => e.id !== editingId);

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate(-1)} className="w-fit -ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Agents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} / {employees.length} agent{employees.length > 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={openCreate}
          disabled={!canManage}
          title={!canManage ? "Réservé aux chefs et à l'administrateur RH" : undefined}
        >
          <UserPlus className="mr-2 h-4 w-4" /> Ajouter un agent
        </Button>
      </div>

<section className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> Filtrer par direction
          </div>
          <Select value={activeDir} onValueChange={(v) => setActiveDir(v)}>
            <SelectTrigger className="w-[240px] justify-between">
              <SelectValue placeholder="Toutes les directions" />
            </SelectTrigger>
            <SelectContent className={DIRECTION_MENU_CLASS}>
              <SelectItem value="all">
                Toutes les directions ({employees.length})
              </SelectItem>
              {directions.map((d) => {
                const count = employees.filter((e) => e.direction_id === d.id).length;
                return (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({count})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 border-b p-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, poste, email, matricule…" className="flex-1 h-10 bg-secondary pl-0" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-secondary/40">
                <th className="p-3 md:p-4 text-left text-xs uppercase font-semibold text-muted-foreground">Agent</th>
                <th className="hidden sm:table-cell p-3 md:p-4 text-left text-xs uppercase font-semibold text-muted-foreground">Poste</th>
                <th className="hidden md:table-cell p-3 md:p-4 text-left text-xs uppercase font-semibold text-muted-foreground">Direction</th>
                <th className="hidden lg:table-cell p-3 md:p-4 text-left text-xs uppercase font-semibold text-muted-foreground">Contrat</th>
                <th className="p-3 md:p-4 text-left text-xs uppercase font-semibold text-muted-foreground">Statut</th>
                <th className="hidden lg:table-cell p-3 md:p-4 text-left text-xs uppercase font-semibold text-muted-foreground">Contact</th>
                {canManage && <th className="p-3 md:p-4" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const dir = directions.find((d) => d.id === e.direction_id);
                const initials = `${e.first_name[0] ?? ""}${e.last_name[0] ?? ""}`.toUpperCase();
                return (
                  <tr key={e.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 md:p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{e.first_name} {e.last_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{e.matricule || "—"}</p>
                          <p className="sm:hidden text-xs text-muted-foreground truncate">{e.position || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell p-3 md:p-4">{e.position || "—"}</td>
                    <td className="hidden md:table-cell p-3 md:p-4">{dir?.name || "—"}</td>
                    <td className="hidden lg:table-cell p-3 md:p-4"><Badge variant="outline">{e.contract_type || "—"}</Badge></td>
                    <td className="p-3 md:p-4">
                      <Badge variant={e.status === "active" ? "default" : "secondary"}>{statusLabel[e.status]}</Badge>
                    </td>
                    <td className="hidden lg:table-cell p-3 md:p-4">
                      {e.email ? (
                        <a href={`mailto:${e.email}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                          <Mail className="h-3.5 w-3.5" /> {e.email}
                        </a>
                      ) : "—"}
                    </td>
                    {canManage && (
                      <td className="p-3 md:p-4">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(e)} title="Modifier">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleInvite(e)}
                            disabled={!e.email}
                            title={e.email ? "Envoyer une invitation par email" : "Email requis"}
                          >
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDelete(e.id)} title="Supprimer">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="p-12 text-center text-muted-foreground">
                    {employees.length === 0
                      ? (canManage ? 'Aucun agent. Cliquez sur "Ajouter un agent".' : "Un chef ou la RH peut en ajouter.")
                      : "Aucun résultat."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier l'agent" : "Nouvel agent"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Mettez à jour les informations." : "Le matricule sera généré automatiquement."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <Tabs defaultValue="identite">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="identite">Identité</TabsTrigger>
                <TabsTrigger value="poste">Poste & Contrat</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
              </TabsList>

              <TabsContent value="identite" className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Prénom *</Label><Input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
                  <div><Label>Nom *</Label><Input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
                  <div className="col-span-2">
                    <Label>Email du compte * <span className="text-xs text-muted-foreground font-normal">(sert à lier le pointage scan au compte de l'agent)</span></Label>
                    <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="agent@entreprise.com" />
                  </div>
                  <div>
                    <Label>Genre</Label>
                    <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculin</SelectItem>
                        <SelectItem value="F">Féminin</SelectItem>
                        
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date de naissance</Label>
                    <SafeDateField
                      value={form.birth_date}
                      onChange={(v) => setForm({ ...form, birth_date: v })}
                      placeholder="Choisir la date de naissance"
                      disabledFuture
                    />
                  </div>
                  <div className="col-span-2"><Label>Adresse</Label><Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                </div>
              </TabsContent>

              <TabsContent value="poste" className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Direction</Label>
                    <Select value={form.direction_id} onValueChange={(v) => setForm({ ...form, direction_id: v, department_id: "" })}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent className={DIRECTION_MENU_CLASS}>
                        {directions
                          .filter((d) => !["DG", "DGA"].includes((d.code || "").toUpperCase()))
                          .map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Département <span className="text-xs text-muted-foreground font-normal">(saisir ou choisir)</span></Label>
                    <Input
                      list="departments-list"
                      value={form.department_name}
                      onChange={(e) => {
                        const name = e.target.value;
                        const match = filteredDepartments.find((d) => d.name.toLowerCase() === name.toLowerCase());
                        setForm({ ...form, department_name: name, department_id: match?.id || "" });
                      }}
                      disabled={!form.direction_id}
                      placeholder={form.direction_id ? "Ex: Service paie" : "Choisir direction d'abord"}
                    />
                    <datalist id="departments-list">
                      {filteredDepartments.map((d) => <option key={d.id} value={d.name} />)}
                    </datalist>
                  </div>
                  <div className="col-span-2">
                    <Label>Poste</Label>
                    <Input list="positions" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Saisir ou choisir" />
                    <datalist id="positions">
                      {POSITION_SUGGESTIONS.map((p) => <option key={p} value={p} />)}
                    </datalist>
                  </div>
                  <div>
                    <Label>Type de contrat</Label>
                    <Select value={form.contract_type} onValueChange={(v) => setForm({ ...form, contract_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONTRACT_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Date d'embauche</Label><Input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} /></div>
                  <div><Label>Salaire de base (USD)</Label><Input type="number" min="0" step="0.01" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: e.target.value })} /></div>
                  <div>
                    <Label>Statut</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as EmployeeRow["status"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Actif</SelectItem>
                        <SelectItem value="suspended">Suspendu</SelectItem>
                        <SelectItem value="departed">Départ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Manager direct (chef de la direction)</Label>
                    <Input
                      readOnly
                      value={
                        form.direction_id
                          ? (directions.find((d) => d.id === form.direction_id) as any)?.manager_name || "Aucun chef défini pour cette direction"
                          : "Sélectionnez d'abord une direction"
                      }
                      className="bg-muted"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={loading}>{loading ? "…" : (editingId ? "Enregistrer" : "Ajouter")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!credentials} onOpenChange={(o) => !o && setCredentials(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Identifiants de l'agent</DialogTitle>
            <DialogDescription>
              {credentials?.isNew
                ? "Compte créé avec succès. Transmettez ces identifiants à l'agent — ils ne expirent pas."
                : "Nouveau mot de passe généré. Transmettez-le à l'agent."}
            </DialogDescription>
          </DialogHeader>
          {credentials && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <div className="flex gap-2">
                  <Input readOnly value={credentials.email} />
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => { navigator.clipboard.writeText(credentials.email); toast.success("Email copié"); }}>
                    Copier
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Mot de passe temporaire</Label>
                <div className="flex gap-2">
                  <Input readOnly value={credentials.password} className="font-mono" />
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => { navigator.clipboard.writeText(credentials.password); toast.success("Mot de passe copié"); }}>
                    Copier
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Lien de connexion</Label>
                <div className="flex gap-2">
                  <Input readOnly value={credentials.loginUrl} />
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => { navigator.clipboard.writeText(credentials.loginUrl); toast.success("Lien copié"); }}>
                    Copier
                  </Button>
                </div>
              </div>
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <p className="font-medium mb-1">À envoyer à l'agent :</p>
                <pre className="whitespace-pre-wrap text-xs">{`Bonjour,
Votre compte est prêt sur la plateforme RH.
Lien : ${credentials.loginUrl}
Email : ${credentials.email}
Mot de passe : ${credentials.password}

Vous pouvez vous connecter à tout moment, le lien n'expire pas.`}</pre>
                <Button type="button" size="sm" className="mt-2"
                  onClick={() => {
                    const msg = `Bonjour,\nVotre compte est prêt sur la plateforme RH.\nLien : ${credentials.loginUrl}\nEmail : ${credentials.email}\nMot de passe : ${credentials.password}\n\nVous pouvez vous connecter à tout moment, le lien n'expire pas.`;
                    navigator.clipboard.writeText(msg);
                    toast.success("Message complet copié");
                  }}>
                  Copier le message complet
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCredentials(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employes;
