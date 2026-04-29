import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  Users, Building2, Briefcase, UserCheck, UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { iconForCode, colorForCode } from "@/data/orgData";
import { colorClasses, modules } from "@/data/modules";
import { ExecutiveDashboard } from "@/components/dashboard/ExecutiveDashboard";
import { useDirectionAccess } from "@/hooks/useDirectionAccess";
import { AccessDenied } from "@/components/AccessDenied";

const DIRECTION_MODULES: Record<string, string[]> = {
  DG:  ["dashboard", "reports", "communication"],
  DGA: ["dashboard", "tasks", "reports"],
  D1:  ["security", "settings", "documents"],
  D2:  ["tasks", "performance", "talents"],
  D3:  ["attendance", "tasks", "documents"],
  D4:  ["payroll", "reports"],
  D5:  ["legal", "security", "documents"],
  D6:  ["recruitment", "communication", "performance"],
  D7:  ["employees", "recruitment", "training", "attendance", "payroll", "performance", "talents", "wellbeing"],
  D8:  ["legal", "documents"],
  D9:  ["legal", "reports", "security"],
  D10: ["documents", "reports", "tasks"],
  D11: ["tasks", "talents", "performance", "documents"],
};

interface Direction {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  manager_name: string | null;
}
interface Department {
  id: string;
  direction_id: string;
  code: string | null;
  name: string;
  description: string | null;
  manager_name: string | null;
}
interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  position: string | null;
  status: string;
  matricule: string | null;
}

export default function DirectionDetail() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [direction, setDirection] = useState<Direction | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [openDeptIds, setOpenDeptIds] = useState<Set<string>>(new Set());

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", description: "", manager_name: "" });
  const [saving, setSaving] = useState(false);

  const upperCode = (code || "").toUpperCase();
  const isExecutiveZone = ["DG", "DGA"].includes(upperCode) || /^D\d+$/.test(upperCode);
  const { allowed, loading: accessLoading } = useDirectionAccess(isExecutiveZone ? upperCode : undefined);

  const refresh = async () => {
    const { data: dir } = await supabase
      .from("directions").select("*").eq("code", upperCode).maybeSingle();
    setDirection(dir as Direction | null);
    if (!dir) return;

    const [{ data: depts }, { data: emps }] = await Promise.all([
      supabase.from("departments").select("*").eq("direction_id", dir.id).order("code"),
      supabase.from("employees").select("id,first_name,last_name,email,position,status,matricule")
        .eq("direction_id", dir.id).order("last_name"),
    ]);
    setDepartments((depts || []) as Department[]);
    setEmployees((emps || []) as Employee[]);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [upperCode]);

  const toggleDept = (id: string) => {
    setOpenDeptIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ code: "", name: "", description: "", manager_name: "" });
    setDialogOpen(true);
  };
  const openEdit = (d: Department) => {
    setEditingId(d.id);
    setForm({
      code: d.code ?? "", name: d.name,
      description: d.description ?? "", manager_name: d.manager_name ?? "",
    });
    setDialogOpen(true);
  };

  const saveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!direction) return;
    if (!form.name.trim()) { toast.error("Le nom est obligatoire"); return; }
    setSaving(true);
    const payload = {
      direction_id: direction.id,
      code: form.code || null,
      name: form.name,
      description: form.description || null,
      manager_name: form.manager_name || null,
    };
    const { error } = editingId
      ? await supabase.from("departments").update(payload).eq("id", editingId)
      : await supabase.from("departments").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? "Département modifié" : "Département créé");
    setDialogOpen(false);
    refresh();
  };

  const removeDept = async (id: string) => {
    if (!confirm("Supprimer ce département ?")) return;
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Département supprimé");
    refresh();
  };

  if (!direction) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Button variant="ghost" onClick={() => navigate("/organigramme")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
        <div className="mt-8 p-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
          Direction introuvable.
        </div>
      </div>
    );
  }

  const Icon = iconForCode(direction.code || "");
  const color = colorForCode(direction.code || "");
  const c = colorClasses[color];
  const moduleIds = DIRECTION_MODULES[direction.code || ""] || [];
  const directionModules = moduleIds
    .map((mid) => modules.find((m) => m.id === mid))
    .filter((m): m is NonNullable<typeof m> => !!m);

  const presentEmployees = employees.filter((e) => e.status === "active").length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate("/organigramme")} className="-ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Organigramme
      </Button>

      {/* Header */}
      <div className="flex items-start gap-4 p-6 rounded-xl border bg-card shadow-sm">
        <div className={cn("p-4 rounded-xl text-primary-foreground shrink-0", c.bg)}>
          <Icon className="h-7 w-7" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{direction.name}</h1>
            {direction.code && <Badge variant="outline" className="font-mono">{direction.code}</Badge>}
          </div>
          {direction.manager_name && (
            <p className="text-sm text-muted-foreground mt-1">
              <span className="font-medium">Responsable :</span> {direction.manager_name}
            </p>
          )}
          {direction.description && (
            <p className="text-sm text-muted-foreground mt-2">{direction.description}</p>
          )}
        </div>
      </div>

      {/* Tableau de bord exclusif au DG */}
      {upperCode === "DG" && <ExecutiveDashboard />}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Building2} label="Départements" value={departments.length} colorClass={c.bg} />
        <KpiCard icon={Users}     label="Agents"       value={employees.length}   colorClass={c.bg} />
        <KpiCard icon={UserCheck} label="Actifs"       value={presentEmployees}   colorClass={c.bg} />
        <KpiCard icon={Briefcase} label="Modules"      value={directionModules.length} colorClass={c.bg} />
      </div>

      {/* Modules opérationnels */}
      {directionModules.length > 0 && (
        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-3">Fonctionnalités opérationnelles</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {directionModules.map((m) => {
              const MIcon = m.icon;
              const mc = colorClasses[m.color];
              return (
                <Link
                  key={m.id}
                  to={m.path}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-md hover:-translate-y-0.5 transition"
                >
                  <div className={cn("p-2 rounded-lg", mc.iconBg)}>
                    <MIcon className={cn("h-4 w-4", mc.text)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.shortDescription}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {/* Départements */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Départements ({departments.length})</h2>
          {isAdmin && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter
            </Button>
          )}
        </div>

        {departments.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
            Aucun département.
          </div>
        ) : (
          <div className="space-y-2">
            {departments.map((dept) => {
              const isOpen = openDeptIds.has(dept.id);
              return (
                <Collapsible key={dept.id} open={isOpen} onOpenChange={() => toggleDept(dept.id)}>
                  <div className="border rounded-lg bg-card overflow-hidden">
                    <div className="flex items-center justify-between p-3 hover:bg-muted/40">
                      <CollapsibleTrigger asChild>
                        <button className="flex-1 flex items-center gap-3 text-left">
                          <div className={cn("p-2 rounded-lg shrink-0", c.iconBg)}>
                            <Building2 className={cn("h-4 w-4", c.text)} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{dept.name}</p>
                            {dept.code && (
                              <p className="text-xs font-mono text-muted-foreground">{dept.code}</p>
                            )}
                          </div>
                          {isOpen
                            ? <ChevronUp className="h-4 w-4 ml-auto text-muted-foreground" />
                            : <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />}
                        </button>
                      </CollapsibleTrigger>
                      {isAdmin && (
                        <div className="flex gap-1 ml-2">
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={(e) => { e.stopPropagation(); openEdit(dept); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={(e) => { e.stopPropagation(); removeDept(dept.id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 pt-1 border-t bg-muted/20 space-y-2">
                        {dept.manager_name && (
                          <p className="text-xs"><span className="font-medium">Responsable :</span> {dept.manager_name}</p>
                        )}
                        {dept.description && (
                          <p className="text-xs text-muted-foreground">{dept.description}</p>
                        )}
                        {!dept.manager_name && !dept.description && (
                          <p className="text-xs text-muted-foreground italic">Aucune information détaillée.</p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </Card>

      {/* Agents */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold">Agents de la direction ({employees.length})</h2>
          <div className="flex gap-2">
            {["D7", "DG", "DGA"].includes(upperCode) && (
              <Button size="sm" asChild>
                <Link to={`/employes?direction=${direction.id}&new=1`}>
                  <UserPlus className="mr-2 h-4 w-4" />Ajouter un agent
                </Link>
              </Button>
            )}
            <Button size="sm" variant="outline" asChild>
              <Link to="/employes"><Users className="mr-2 h-4 w-4" />Gérer</Link>
            </Button>
          </div>
        </div>

        {employees.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
            Aucun agent rattaché à cette direction.
            {["D7", "DG", "DGA"].includes(upperCode) && (
              <div className="mt-3">
                <Button size="sm" asChild>
                  <Link to={`/employes?direction=${direction.id}&new=1`}>
                    <UserPlus className="mr-2 h-4 w-4" />Ajouter le premier agent
                  </Link>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {employees.map((e) => (
              <div key={e.id} className="p-3 border rounded-lg bg-card">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{e.first_name} {e.last_name}</p>
                  <Badge variant={e.status === "active" ? "default" : "secondary"} className="text-[10px]">
                    {e.status}
                  </Badge>
                </div>
                {e.position && <p className="text-xs text-muted-foreground truncate">{e.position}</p>}
                {e.matricule && <p className="text-[11px] font-mono text-muted-foreground">{e.matricule}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Dialog department */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier le département" : "Nouveau département"}</DialogTitle>
            <DialogDescription>
              Rattaché à <strong>{direction.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveDept} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder={`${direction.code}-XX`} />
              </div>
              <div className="col-span-2">
                <Label>Nom *</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Responsable</Label>
              <Input value={form.manager_name} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saving}>{saving ? "…" : (editingId ? "Enregistrer" : "Créer")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, colorClass,
}: { icon: any; label: string; value: number; colorClass: string }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={cn("p-2.5 rounded-lg text-primary-foreground", colorClass)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </Card>
  );
}
