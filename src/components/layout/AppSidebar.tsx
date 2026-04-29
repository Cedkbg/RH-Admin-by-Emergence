import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { modules } from "@/data/modules";
import { cn } from "@/lib/utils";
import { Shield, Users2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import companyLogo from "@/assets/company-logo.jpeg";

const CABINET_ROLES = new Set(["admin", "dg", "dga", "manager"]);

export function AppSidebar() {
  const location = useLocation();
  const { isAdmin, user } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string>(companyLogo);
  const [companyName, setCompanyName] = useState<string>("EMERGENCE DRC");
  const [canManageCabinets, setCanManageCabinets] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key,value")
        .in("key", ["company_logo", "company_name"]);
      (data || []).forEach((r: any) => {
        const v = typeof r.value === "string" ? r.value : r.value?.value;
        if (r.key === "company_logo" && v) setLogoUrl(v);
        if (r.key === "company_name" && v) setCompanyName(v);
      });
    })();
  }, []);

  useEffect(() => {
    if (!user) { setCanManageCabinets(false); return; }
    (async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      setCanManageCabinets((data || []).some((r: any) => CABINET_ROLES.has(r.role)));
    })();
  }, [user]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white overflow-hidden ring-1 ring-sidebar-border">
            <img src={logoUrl} alt={companyName} className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold tracking-tight">{companyName}</h2>
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

          {canManageCabinets && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Cabinets (DG/DGA/Manager)">
                <NavLink
                  to="/admin/cabinets"
                  className={cn(location.pathname.startsWith("/admin/cabinets") && "bg-sidebar-accent text-sidebar-accent-foreground font-medium")}
                >
                  <Users2 className="h-[18px] w-[18px] shrink-0" />
                  <span className="truncate text-sm">Cabinets</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Administration">
                <NavLink
                  to="/admin"
                  className={cn(location.pathname === "/admin" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium")}
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
