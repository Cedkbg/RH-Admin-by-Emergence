import { Link } from "react-router-dom";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface DepartmentItem {
  id: string;
  name: string;
  short: string;
  moduleId: string;
  agentCount: number;
  icon: LucideIcon;
}

interface DirectionDepartmentsProps {
  title: string;
  departments: DepartmentItem[];
  icon: LucideIcon;
  colorClass?: string;
}

function getBgClass(colorClass: string): string {
  const colorMap: Record<string, string> = {
    "text-blue-600": "bg-blue-100",
    "text-pink-600": "bg-pink-100",
    "text-indigo-600": "bg-indigo-100",
    "text-amber-600": "bg-amber-100",
    "text-green-600": "bg-green-100",
    "text-teal-600": "bg-teal-100",
    "text-orange-600": "bg-orange-100",
    "text-red-600": "bg-red-100",
    "text-purple-600": "bg-purple-100",
    "text-gray-600": "bg-gray-100",
  };
  return colorMap[colorClass] || "bg-gray-100";
}

export function DirectionDepartments({
  title,
  departments,
  icon: Icon,
  colorClass = "text-blue-600",
}: DirectionDepartmentsProps) {
  const bgClass = getBgClass(colorClass);

  return (
    <Collapsible defaultOpen={false} className="mb-8">
      <CollapsibleTrigger asChild>
        <button className="flex w-full items-center justify-between rounded-xl bg-white p-4 shadow-sm border hover:shadow-md transition-all">
          <span className="flex items-center gap-3 font-semibold text-gray-900 truncate">
            <Icon className={`h-5 w-5 shrink-0 ${colorClass}`} />
            <span className="truncate">{title}</span>
          </span>
          <ChevronDown className="h-5 w-5 shrink-0 text-gray-500 ml-2" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {departments.map((dept) => (
            <Link key={dept.id} to={`/${dept.moduleId}`} className="block">
              <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm border hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bgClass}`}>
                  <dept.icon className={`h-5 w-5 shrink-0 ${colorClass}`} />
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate text-sm font-semibold text-gray-900">{dept.name}</p>
                  <p className="truncate text-xs text-gray-500">{dept.short} — {dept.agentCount} agents</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

