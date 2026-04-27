import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { OrgChart } from "@/components/dashboard/OrgChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { iconForCode, colorForCode } from "@/data/orgData";
import { colorClasses, modules } from "@/data/modules";
import { useSearchParams } from "react-router-dom";

// Map each direction (by code) to its operational modules
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
};

const colorTextMap: Record<string, string> = {
  blue: "text-blue-600", purple: "text-purple-600", green: "text-green-600",
  orange: "text-orange-600", red: "text-red-600", yellow: "text-amber-600",
  pink: "text-pink-600", teal: "text-teal-600", indigo: "text-indigo-600", gray: "text-gray-600",
};

interface DirectionRow {
  id: string;
  code: string | null;
  name: string;
  manager_name: string | null;
  description: string | null;
}

const Organigramme = () => {
  const { isAdmin } = useAuth();
  const [params] = useSearchParams();
  const queryFilter = (params.get("q") || "").toLowerCase();
  const [directions, setDirections] = useState<DirectionRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", manager_name: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = async () => {
    const { data } = await supabase.from("directions").select("*").order("code");
    setDirections(data || []);
  };

  useEffect(() => { refresh(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ code: "", name: "", manager_name: "", description: "" });
    setOpen(true);
  };

  const openEdit = (d: DirectionRow) => {
    setEditingId(d.id);
    setForm({
      code: d.code ?? "",
      name: d.name,
      manager_name: d.manager_name ?? "",
      description: d.description ?? "",
    });
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast.error("Le nom est obligatoire"); return; }
    setLoading(true);
    const payload = {
      code: form.code || null,
      name: form.name,
      manager_name: form.manager_name || null,
      description: form.description || null,
    };
    const { error } = editingId
      ? await supabase.from("directions").update(payload).eq("id", editingId)
      : await supabase.from("directions").insert(payload);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? "Direction modifiée" : "Direction créée");
    setOpen(false);
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette direction ?")) return;
    const { error } = await supabase.from("directions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Direction supprimée");
    refresh();
  };

  const visible = queryFilter
    ? directions.filter((d) =>
        [d.name, d.code, d.manager_name, d.description].some((v) => (v || "").toLowerCase().includes(queryFilter))
      )
    : directions;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organigramme EMERGENCE DRC</h1>
          <p className="text-sm text-muted-foreground">
            {visible.length} / {directions.length} direction{directions.length > 1 ? "s" : ""}
            {queryFilter && <span className="ml-2 italic">— filtre : « {queryFilter} »</span>}
          </p>
        </div>
        {isAdmin ? (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Ajouter une direction
          </Button>
        ) : (
          <Badge variant="secondary">Lecture seule</Badge>
        )}
      </div>

      <OrgChart />

      {/* Opérationnel : modules par direction (dépliable) */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Opérationnel par direction</h2>
        {visible.map((d) => {
          const code = d.code || "";
          const Icon = iconForCode(code);
          const color = colorForCode(code);
          const moduleIds = DIRECTION_MODULES[code] || [];
          const departments: DepartmentItem[] = moduleIds
            .map((mid) => modules.find((m) => m.id === mid))
            .filter((m): m is NonNullable<typeof m> => !!m)
            .map((m) => ({
              id: m.id,
              name: m.label,
              short: m.shortDescription,
              moduleId: m.path.replace(/^\//, ""),
              agentCount: 0,
              icon: m.icon,
            }));
          if (departments.length === 0) return null;
          return (
            <DirectionDepartments
              key={d.id}
              title={`${d.name}${d.code ? ` (${d.code})` : ""}`}
              departments={departments}
              icon={Icon}
              colorClass={colorTextMap[color] || "text-blue-600"}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {visible.map((d) => {
          const code = d.code || "";
          const Icon = iconForCode(code);
          const c = colorClasses[colorForCode(code)];
          return (
            <div key={d.id} className="relative p-5 bg-card rounded-xl border shadow-sm hover:shadow-md transition group">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("p-3 rounded-xl text-primary-foreground", c.bg)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{d.name}</h3>
                  {d.code && <p className="text-xs font-mono text-muted-foreground">{d.code}</p>}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{d.manager_name || "—"}</p>
              {d.description && <p className="text-xs text-muted-foreground line-clamp-2">{d.description}</p>}
              {isAdmin && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(d)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(d.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
        {visible.length === 0 && (
          <div className="col-span-full p-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
            {directions.length === 0
              ? (isAdmin ? 'Aucune direction. Cliquez sur "Ajouter une direction".' : "L'admin RH peut en créer.")
              : "Aucun résultat pour ce filtre."}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier la direction" : "Nouvelle direction"}</DialogTitle>
            <DialogDescription>{editingId ? "Mettez à jour les informations." : "Ajoutez un département à l'organisation."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <Label>Code</Label>
                <Input placeholder="D1" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={loading}>{loading ? "…" : (editingId ? "Enregistrer" : "Créer")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Organigramme;
