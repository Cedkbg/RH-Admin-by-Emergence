import { NavLink, useLocation } from "react-router-dom";
import { LifeBuoy, Users as UsersIcon } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { modules } from "@/data/modules";
import { cn } from "@/lib/utils";

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
