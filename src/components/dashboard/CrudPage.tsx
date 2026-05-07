import { ReactNode, useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, Pencil, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export interface ColumnDef<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface CrudPageProps<T extends { id: string }> {
  title: string;
  subtitle?: string;
  table: string;
  columns: ColumnDef<T>[];
  searchFields: (keyof T)[];
  orderBy?: { column: string; ascending?: boolean };
  emptyText?: string;
  renderForm: (form: Partial<T>, setForm: (f: Partial<T>) => void, isEdit: boolean) => ReactNode;
  defaultForm: Partial<T>;
  validate?: (form: Partial<T>) => string | null;
  /** Optional preprocessor before insert/update (cleanup empty strings -> null, etc.) */
  prepare?: (form: Partial<T>) => Record<string, any>;
}

export function CrudPage<T extends { id: string }>({
  title, subtitle, table, columns, searchFields, orderBy, emptyText,
  renderForm, defaultForm, validate, prepare,
}: CrudPageProps<T>) {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<T>>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const q = (supabase as any).from(table).select("*");
    if (orderBy) q.order(orderBy.column, { ascending: orderBy.ascending ?? false });
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data as T[]) || []);
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [table]);

  const filtered = useMemo(() => {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) =>
      searchFields.some((f) => String((r as any)[f] ?? "").toLowerCase().includes(q))
    );
  }, [rows, query, searchFields]);

  const openCreate = () => { setEditingId(null); setForm(defaultForm); setOpen(true); };
  const openEdit = (row: T) => { setEditingId(row.id); setForm(row); setOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate) {
      const err = validate(form);
      if (err) { toast.error(err); return; }
    }
    setSaving(true);
    const payload = prepare ? prepare(form) : form;
    let error;
    if (editingId) {
      ({ error } = await (supabase as any).from(table).update(payload).eq("id", editingId));
    } else {
      ({ error } = await (supabase as any).from(table).insert(payload));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? "Modifié" : "Créé");
    setOpen(false);
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet élément ?")) return;
    const { error } = await (supabase as any).from(table).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Supprimé");
    refresh();
  };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate(-1)} className="w-fit -ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} / {rows.length} {subtitle ?? "élément(s)"}
          </p>
        </div>
        {isAdmin ? (
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Ajouter</Button>
        ) : (
          <Badge variant="secondary">Lecture seule — Admin RH requis</Badge>
        )}
      </div>

      <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 border-b p-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher…"
            className="flex-1 h-10 bg-secondary pl-0"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-secondary/40">
                {columns.map((c) => (
                  <th key={c.key as string} className={`p-4 text-left text-xs uppercase font-semibold text-muted-foreground ${c.className ?? ""}`}>
                    {c.label}
                  </th>
                ))}
                {isAdmin && <th className="p-4 w-24" />}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length + (isAdmin ? 1 : 0)} className="p-12 text-center text-muted-foreground">Chargement…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={columns.length + (isAdmin ? 1 : 0)} className="p-12 text-center text-muted-foreground">
                  {emptyText ?? "Aucune donnée."}
                </td></tr>
              ) : filtered.map((row) => (
                <tr key={row.id} className="border-b hover:bg-muted/50">
                  {columns.map((c) => (
                    <td key={c.key as string} className={`p-4 text-sm ${c.className ?? ""}`}>
                      {c.render ? c.render(row) : String((row as any)[c.key] ?? "—")}
                    </td>
                  ))}
                  {isAdmin && (
                    <td className="p-4">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(row)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDelete(row.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier" : "Nouveau"} — {title}</DialogTitle>
            <DialogDescription>{editingId ? "Mettez à jour les informations." : "Renseignez les informations."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            {renderForm(form, setForm, !!editingId)}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saving}>{saving ? "…" : (editingId ? "Enregistrer" : "Créer")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
