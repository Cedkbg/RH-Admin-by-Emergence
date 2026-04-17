import { OrgChart } from "@/components/dashboard/OrgChart";
import { directions } from "@/data/orgData";
import { colorClasses } from "@/data/modules";
import { cn } from "@/lib/utils";
import { UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Organigramme = () => {
  const { toast } = useToast();

  const handleAdd = (dirName: string) => {
    toast({
      title: "Ajouter un agent",
      description: `Formulaire d'ajout d'agent à « ${dirName} » (à connecter avec Lovable Cloud).`,
    });
  };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Organigramme dynamique</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Structure complète de l'entreprise — ajoutez des agents directement par direction.
        </p>
      </div>

      <OrgChart />

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-foreground">Directions & ajout d'agents</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {directions.map((d) => {
            const c = colorClasses[d.color];
            return (
              <div key={d.id} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm transition hover:shadow-md">
                <div className="flex items-start gap-3">
                  <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-primary-foreground", c.bg)}>
                    <d.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.code} · {d.agentCount} agents</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{d.managerTitle}</p>
                <button
                  onClick={() => handleAdd(d.name)}
                  className={cn(
                    "mt-auto inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90",
                    c.bg,
                  )}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Ajouter un agent
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Organigramme;
