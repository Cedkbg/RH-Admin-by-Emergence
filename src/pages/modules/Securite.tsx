import { useEffect, useMemo, useState } from "react";
import { Shield, AlertTriangle, ArrowLeft, Trash2, Eraser, Search, Download, FileText, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { RolesManager } from "@/components/securite/RolesManager";

interface Log {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  created_at: string;
}

const ENTITY_LINKS: Record<string, string> = {
  employees: "/employes",
  payroll: "/paie",
  leave_requests: "/validation-conges",
  tasks: "/taches",
  attendance: "/presence",
  documents: "/documents",
  candidates: "/recrutement",
  performance_reviews: "/performance",
  trainings: "/formation",
};

const Securite = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<Log[]>([]);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Filtres
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const refresh = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    const list = (data as Log[]) || [];
    setLogs(list);

    const actorIds = Array.from(new Set(list.map((l) => l.actor_id).filter(Boolean) as string[]));
    if (actorIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", actorIds);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => {
        map[p.id] = p.full_name || p.email || p.id.slice(0, 8);
      });
      setActorNames(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) refresh();
  }, [isAdmin]);

  const actions = useMemo(() => Array.from(new Set(logs.map((l) => l.action))).sort(), [logs]);
  const entities = useMemo(
    () => Array.from(new Set(logs.map((l) => l.entity).filter(Boolean) as string[])).sort(),
    [logs],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toTs = dateTo ? new Date(dateTo).getTime() + 24 * 3600 * 1000 : null;
    return logs.filter((l) => {
      if (actionFilter !== "all" && l.action !== actionFilter) return false;
      if (entityFilter !== "all" && (l.entity || "") !== entityFilter) return false;
      const ts = new Date(l.created_at).getTime();
      if (fromTs && ts < fromTs) return false;
      if (toTs && ts > toTs) return false;
      if (q) {
        const actor = actorNames[l.actor_id || ""] || "";
        const haystack = `${l.action} ${l.entity || ""} ${l.entity_id || ""} ${actor} ${l.actor_id || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [logs, actorNames, search, actionFilter, entityFilter, dateFrom, dateTo]);

  const removeOne = async (id: string) => {
    if (!confirm("Supprimer cette entrée ?")) return;
    const { error } = await supabase.from("audit_logs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Supprimé");
    refresh();
  };

  const purgeOld = async () => {
    if (!confirm("Supprimer toutes les entrées de plus de 30 jours ?")) return;
    const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { error } = await supabase.from("audit_logs").delete().lt("created_at", cutoff);
    if (error) return toast.error(error.message);
    toast.success("Anciennes entrées supprimées");
    refresh();
  };

  const exportCSV = () => {
    const rows = [
      ["Date", "Action", "Entité", "ID Entité", "Acteur", "ID Acteur"],
      ...filtered.map((l) => [
        format(new Date(l.created_at), "yyyy-MM-dd HH:mm:ss"),
        l.action,
        l.entity || "",
        l.entity_id || "",
        actorNames[l.actor_id || ""] || "",
        l.actor_id || "",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `journal-audit-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} lignes exportées`);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Journal d'audit — EMERGENCE DRC", 14, 14);
    doc.setFontSize(9);
    doc.text(`Généré le ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })} — ${filtered.length} entrées`, 14, 20);
    autoTable(doc, {
      startY: 24,
      head: [["Date", "Action", "Entité", "Acteur"]],
      body: filtered.map((l) => [
        format(new Date(l.created_at), "dd/MM/yy HH:mm"),
        l.action,
        l.entity ? `${l.entity}${l.entity_id ? ` (${l.entity_id.slice(0, 8)})` : ""}` : "—",
        actorNames[l.actor_id || ""] || (l.actor_id ? l.actor_id.slice(0, 8) : "—"),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 41, 59] },
    });
    doc.save(`journal-audit-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
    toast.success(`${filtered.length} lignes exportées`);
  };

  const resetFilters = () => {
    setSearch("");
    setActionFilter("all");
    setEntityFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
        <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold">Sécurité & Accès</h1>
        <p className="mt-2 text-sm text-muted-foreground">Réservé à l'Admin RH.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate(-1)} className="w-fit -ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
      </Button>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sécurité & Accès</h1>
        <p className="text-sm text-muted-foreground">Journal d'audit et gestion des rôles.</p>
      </div>

      <Tabs defaultValue="journal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="journal">
            <Shield className="mr-2 h-4 w-4" /> Journal d'audit
          </TabsTrigger>
          <TabsTrigger value="roles">
            <Users className="mr-2 h-4 w-4" /> Rôles & accès
          </TabsTrigger>
        </TabsList>

        <TabsContent value="journal" className="space-y-4">
          {/* Filters */}
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
              <div className="lg:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher (action, entité, acteur…)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes actions</SelectItem>
                  {actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger><SelectValue placeholder="Entité" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes entités</SelectItem>
                  {entities.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="Du" />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="Au" />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {filtered.length} / {logs.length} entrées
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={resetFilters}>Réinitialiser</Button>
                <Button size="sm" variant="outline" onClick={exportCSV} disabled={!filtered.length}>
                  <Download className="mr-2 h-4 w-4" /> CSV
                </Button>
                <Button size="sm" variant="outline" onClick={exportPDF} disabled={!filtered.length}>
                  <FileText className="mr-2 h-4 w-4" /> PDF
                </Button>
                {logs.length > 0 && (
                  <Button size="sm" variant="outline" onClick={purgeOld}>
                    <Eraser className="mr-2 h-4 w-4" /> Purger &gt; 30j
                  </Button>
                )}
              </div>
            </div>
          </section>

          {/* Table */}
          <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
                    <th className="p-4">Date</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Entité</th>
                    <th className="p-4">Acteur</th>
                    <th className="p-4 w-16" />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">Chargement…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">
                      <AlertTriangle className="mx-auto mb-2 h-6 w-6 opacity-50" />
                      {logs.length === 0 ? "Aucune action enregistrée." : "Aucune entrée ne correspond aux filtres."}
                    </td></tr>
                  ) : filtered.map((l) => {
                    const link = l.entity ? ENTITY_LINKS[l.entity] : null;
                    const actorLabel = actorNames[l.actor_id || ""] || (l.actor_id ? l.actor_id.slice(0, 8) : "—");
                    return (
                      <tr key={l.id} className="border-b hover:bg-muted/50 text-sm">
                        <td className="p-4 whitespace-nowrap">{format(new Date(l.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}</td>
                        <td className="p-4"><Badge variant="outline">{l.action}</Badge></td>
                        <td className="p-4">
                          {l.entity ? (
                            link ? (
                              <button
                                onClick={() => navigate(link)}
                                className="text-primary hover:underline"
                              >
                                {l.entity}
                                {l.entity_id && <span className="ml-1 text-xs text-muted-foreground">({l.entity_id.slice(0, 8)})</span>}
                              </button>
                            ) : (
                              <span>{l.entity}{l.entity_id && <span className="ml-1 text-xs text-muted-foreground">({l.entity_id.slice(0, 8)})</span>}</span>
                            )
                          ) : "—"}
                        </td>
                        <td className="p-4">
                          <span className="font-medium">{actorLabel}</span>
                        </td>
                        <td className="p-4 text-right">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeOne(l.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="roles">
          <RolesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Securite;
