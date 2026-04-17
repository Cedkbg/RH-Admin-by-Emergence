import { useMemo, useState } from "react";
import { Search, UserPlus, Mail, Filter } from "lucide-react";
import { directions, employees, type Employee } from "@/data/orgData";
import { colorClasses } from "@/data/modules";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const statusBadge: Record<Employee["status"], string> = {
  actif:     "bg-success/10 text-success",
  suspendu:  "bg-warning/10 text-warning",
  depart:    "bg-destructive/10 text-destructive",
};
const statusLabel: Record<Employee["status"], string> = {
  actif: "Actif", suspendu: "Suspendu", depart: "Départ",
};

const Employes = () => {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [activeDir, setActiveDir] = useState<string | "all">("all");

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const matchDir = activeDir === "all" || e.directionId === activeDir;
      const matchQ = query === "" ||
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.role.toLowerCase().includes(query.toLowerCase()) ||
        e.email.toLowerCase().includes(query.toLowerCase());
      return matchDir && matchQ;
    });
  }, [query, activeDir]);

  const handleAdd = (label: string) => {
    toast({ title: "Ajouter un agent", description: `Création d'un nouvel agent (${label}).` });
  };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Employés</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} sur {employees.length} employés · gérez les profils par direction
          </p>
        </div>
        <button
          onClick={() => handleAdd("global")}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-primary/90"
        >
          <UserPlus className="h-4 w-4" />
          Ajouter un agent
        </button>
      </div>

      {/* Filtres par direction avec bouton ajout par direction */}
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Filtrer par direction
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveDir("all")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition",
              activeDir === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-secondary",
            )}
          >
            Toutes ({employees.length})
          </button>
          {directions.map((d) => {
            const c = colorClasses[d.color];
            const count = employees.filter((e) => e.directionId === d.id).length;
            const active = activeDir === d.id;
            return (
              <div key={d.id} className="flex items-center overflow-hidden rounded-full border border-border">
                <button
                  onClick={() => setActiveDir(d.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition",
                    active ? cn(c.bg, "text-primary-foreground") : "bg-card text-foreground hover:bg-secondary",
                  )}
                >
                  <d.icon className="h-3.5 w-3.5" />
                  {d.code} ({count})
                </button>
                <button
                  onClick={() => handleAdd(d.name)}
                  title={`Ajouter un agent à ${d.name}`}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center border-l border-border transition",
                    active ? "bg-white/20 text-primary-foreground hover:bg-white/30" : cn(c.iconBg, c.text, "hover:opacity-80"),
                  )}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Search + table */}
      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par nom, poste ou email…"
              className="h-10 border-border bg-secondary pl-10 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Employé</th>
                <th className="px-4 py-3">Poste</th>
                <th className="px-4 py-3">Direction</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Embauche</th>
                <th className="px-4 py-3">Contact</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const dir = directions.find((d) => d.id === e.directionId)!;
                const c = colorClasses[dir.color];
                return (
                  <tr key={e.id} className="border-b border-border last:border-0 transition hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-primary-foreground", c.bg)}>
                          {e.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{e.name}</p>
                          <p className="text-xs text-muted-foreground">{e.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground">{e.role}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", c.iconBg, c.text)}>
                        <dir.icon className="h-3 w-3" />
                        {dir.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", statusBadge[e.status])}>
                        {statusLabel[e.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{e.hiredAt}</td>
                    <td className="px-4 py-3">
                      <a href={`mailto:${e.email}`} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                        <Mail className="h-3.5 w-3.5" />
                        Email
                      </a>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Aucun employé trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Employes;
