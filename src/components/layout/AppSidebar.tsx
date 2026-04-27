import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { modules } from "@/data/modules";
import { cn } from "@/lib/utils";
import { Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function AppSidebar() {
  const location = useLocation();
  const { isAdmin } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold tracking-tight">EMERGENCE DRC</h2>
            <p className="truncate text-xs text-sidebar-foreground/60">SIRH</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        <SidebarMenu>
          {modules.map((m) => {
            const Icon = m.icon;
            const active = m.path === "/" ? location.pathname === "/" : location.pathname.startsWith(m.path);
            return (
              <SidebarMenuItem key={m.id}>
                <SidebarMenuButton asChild tooltip={m.label}>
                  <NavLink
                    to={m.path}
                    className={cn(active && "bg-sidebar-accent text-sidebar-accent-foreground font-medium")}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate text-sm">{m.label}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}

          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Administration">
                <NavLink
                  to="/admin"
                  className={cn(location.pathname.startsWith("/admin") && "bg-sidebar-accent text-sidebar-accent-foreground font-medium")}
                >
                  <Shield className="h-[18px] w-[18px] shrink-0" />
                  <span className="truncate text-sm">Administration</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-4 py-3 text-xs text-sidebar-foreground/60">
        © {new Date().getFullYear()} EMERGENCE DRC
      </SidebarFooter>
    </Sidebar>
  );
}
