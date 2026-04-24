import { NavLink, useLocation } from "react-router-dom";
import { LifeBuoy, Users as UsersIcon } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { modules } from "@/data/modules";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  directions,
  techDepartments,
  rhDepartments,
  financeDepartments,
  commercialDepartments,
  productDepartments,
  opsDepartments,
  riskDepartments,
  legalDepartments,
  type Department,
} from "@/data/orgData";

interface DirectionGroupConfig {
  directionId: string;
  label: string;
  path: string;
  icon: React.ElementType;
  departments: Department[];
}

const directionGroups: DirectionGroupConfig[] = [
  {
    directionId: "tech",
    label: "Direction Technologie",
    path: "/tech-dashboard",
    icon: directions.find((d) => d.id === "tech")?.icon || UsersIcon,
    departments: techDepartments,
  },
  {
    directionId: "prod",
    label: "Direction Produits",
    path: "/product-dashboard",
    icon: directions.find((d) => d.id === "prod")?.icon || UsersIcon,
    departments: productDepartments,
  },
  {
    directionId: "ops",
    label: "Direction Opérations",
    path: "/operations-dashboard",
    icon: directions.find((d) => d.id === "ops")?.icon || UsersIcon,
    departments: opsDepartments,
  },
  {
    directionId: "fin",
    label: "Direction Financière",
    path: "/finance-dashboard",
    icon: directions.find((d) => d.id === "fin")?.icon || UsersIcon,
    departments: financeDepartments,
  },
  {
    directionId: "risk",
    label: "Direction Risques",
    path: "/risk-dashboard",
    icon: directions.find((d) => d.id === "risk")?.icon || UsersIcon,
    departments: riskDepartments,
  },
  {
    directionId: "cmo",
    label: "Direction Commerciale",
    path: "/commercial-dashboard",
    icon: directions.find((d) => d.id === "cmo")?.icon || UsersIcon,
    departments: commercialDepartments,
  },
  {
    directionId: "rh",
    label: "Direction RH",
    path: "/rh-dashboard",
    icon: directions.find((d) => d.id === "rh")?.icon || UsersIcon,
    departments: rhDepartments,
  },
  {
    directionId: "leg",
    label: "Direction Juridique",
    path: "/juridique",
    icon: directions.find((d) => d.id === "leg")?.icon || UsersIcon,
    departments: legalDepartments,
  },
];

function DirectionMenuGroup({
  config,
  location,
}: {
  config: DirectionGroupConfig;
  location: ReturnType<typeof useLocation>;
}) {
  const Icon = config.icon;
  const isDirectionActive = location.pathname.startsWith(config.path);

  return (
    <SidebarMenuItem>
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            asChild
            tooltip={config.label}
          >
            <NavLink
              to={config.path}
              className={({ isActive }) =>
                cn(
                  isActive || isDirectionActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : ""
                )
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate text-sm font-medium">{config.label}</span>
            </NavLink>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-6 space-y-1 py-1">
          {config.departments.map((dept) => {
            const active = location.pathname === `/${dept.moduleId}`;
            return (
              <SidebarMenuItem key={dept.id}>
                <SidebarMenuButton
                  asChild
                  tooltip={dept.name}
                  className={cn(
                    "h-8 gap-2 rounded-md px-2 text-xs transition-all",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    active && "bg-primary/80 text-primary-foreground hover:bg-primary"
                  )}
                >
                  <NavLink
                    to={`/${dept.moduleId}`}
                    end
                    className={({ isActive }) =>
                      cn(
                        isActive ? "bg-primary text-primary-foreground" : ""
                      )
                    }
                  >
                    <dept.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate font-medium">{dept.short}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="bg-sidebar p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-glow">
            <UsersIcon className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              EMERGENCE DRC
              Gestion Agents DRC
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar scrollbar-thin">
        <SidebarMenu className="px-2 py-2">
          {/* Direction Groups with Dropdowns - D1 à D8 */}
          {directionGroups.map((group) => (
            <DirectionMenuGroup
              key={group.directionId}
              config={group}
              location={location}
            />
          ))}
          {/* Modules */}
          {modules.map((m) => {
            const active =
              m.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(m.path);
            return (
              <SidebarMenuItem key={m.id}>
                <SidebarMenuButton
                  asChild
                  tooltip={m.label}
                  className={cn(
                    "h-10 gap-3 rounded-lg px-3 text-sidebar-foreground transition-colors",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    active &&
                      "bg-primary text-primary-foreground shadow-md hover:bg-primary hover:text-primary-foreground",
                  )}
                >
                  <NavLink to={m.path} end={m.path === "/"}>
                    <m.icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate text-sm font-medium">{m.label}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="bg-sidebar p-3">
        <button className="flex h-10 w-full items-center gap-3 rounded-lg bg-sidebar-accent px-3 text-sm font-medium text-sidebar-accent-foreground transition hover:bg-sidebar-accent/80">
          <LifeBuoy className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Aide & Support</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}

