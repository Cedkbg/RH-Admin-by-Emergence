import { OrgChart } from "@/components/dashboard/OrgChart";
import { directions } from "@/data/orgData";
import { colorClasses } from "@/data/modules";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const Organigramme = () => {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Organigramme Emergence DRC</h1>
        <p className="text-gray-600 text-sm">Gestionnaire ajoute agents Admin RH</p>
      </div>

      <OrgChart />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {directions.map((d) => {
          const c = colorClasses[d.color ?? "gray"];
          return (
            <div key={d.id} className="p-6 bg-white rounded-xl border shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn("p-3 rounded-xl flex-shrink-0", c.bg)}>
                  <d.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{d.name}</h3>
                  <p className="text-sm font-mono text-gray-500">{d.code}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">{d.managerTitle}</p>
              <p className="text-sm font-medium text-gray-700">0 agents</p>
              <Badge variant="outline" className="mt-3">
                Ajouter → Admin RH
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Organigramme;

