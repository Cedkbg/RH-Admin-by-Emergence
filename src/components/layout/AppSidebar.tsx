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
const OPS_ROLES = new Set(["admin", "dg", "dga", "manager", "rh", "assistant_direction"]);
const STAFF_ROLES = new Set(["admin", "dg", "dga", "manager", "rh", "secretaire", "assistant_direction"]);
const RESTRICTED_PATHS = new Set([
  "/recrutement", "/taches", "/performance", "/formation", "/paie",
  "/presence", "/documents", "/juridique", "/communication", "/talents",
  "/bien-etre", "/rapports", "/securite", "/secretariat", "/assistant",
  "/manager", "/parametres",
]);
// Modules terrain masqués au cabinet exécutif (DG/DGA/Secrétaire) — préserve l'autonomie des équipes
const FIELD_ONLY_PATHS = new Set(["/taches", "/presence", "/communication", "/bien-etre"]);
const EXECUTIVE_ROLES = new Set(["dg", "dga", "secretaire"]);
// Pour un agent (employee) sans rôle staff : ne voir que son tableau de bord et la présence
const AGENT_ALLOWED_PATHS = new Set(["/", "/presence"]);

export function AppSidebar() {
  const location = useLocation();
  const { isAdmin, user, roles, rolesLoading } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string>(companyLogo);
  const [companyName, setCompanyName] = useState<string>("EMERGENCE DRC");
  const canManageCabinets = roles.some((r) => CABINET_ROLES.has(r));
  const hasOpsAccess = roles.some((r) => OPS_ROLES.has(r));
  const hasField = roles.some((r) => ["admin", "manager", "rh", "assistant_direction"].includes(r));
  const hasExec = roles.some((r) => EXECUTIVE_ROLES.has(r));
  const isExecutiveOnly = hasExec && !hasField;
  const isAgentOnly = !!user && !rolesLoading && !roles.some((r) => STAFF_ROLES.has(r));

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
            // Agent : seulement le tableau de bord et la page présence
            if (isAgentOnly && !AGENT_ALLOWED_PATHS.has(m.path)) return null;
            // Cacher complètement les modules terrain pour le cabinet exécutif (DG/DGA/Secrétaire)
            if (isExecutiveOnly && FIELD_ONLY_PATHS.has(m.path)) return null;
            const active = m.path === "/" ? location.pathname === "/" : location.pathname.startsWith(m.path);
            const restricted = RESTRICTED_PATHS.has(m.path) && !hasOpsAccess && !(isAgentOnly && AGENT_ALLOWED_PATHS.has(m.path));
            return (
              <SidebarMenuItem key={m.id}>
                <SidebarMenuButton asChild tooltip={restricted ? `${m.label} (accès restreint)` : m.label}>
                  <NavLink
                    to={m.path}
                    onClick={(e) => { if (restricted) e.preventDefault(); }}
                    aria-disabled={restricted}
                    className={cn(
                      active && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                      restricted && "opacity-40 cursor-not-allowed pointer-events-none",
                    )}
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
