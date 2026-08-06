import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { modules } from "@/data/modules";
import { cn } from "@/lib/utils";
import { Building2, ChevronDown, Shield, Users2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import companyLogo from "@/assets/company-logo.jpeg";

type NavEntry =
  | { type: "module"; id: string }
  | { type: "extra"; id: string; label: string; path: string; icon: typeof Building2 };

const NAV_GROUPS: { label: string; defaultOpen?: boolean; items: NavEntry[] }[] = [
  {
    label: "Pilotage",
    defaultOpen: true,
    items: [
      { type: "module", id: "dashboard" },
      { type: "module", id: "tasks" },
      { type: "module", id: "communication" },
      { type: "module", id: "secretariat" },
      { type: "module", id: "payroll" },
      { type: "module", id: "reports" },
      { type: "extra", id: "cabinets", label: "Cabinets", path: "/admin/cabinets", icon: Users2 },
    ],
  },
  {
    label: "Gestion du Personnel",
    items: [
      { type: "module", id: "org" },
      { type: "module", id: "employees" },
      { type: "module", id: "recruitment" },
      { type: "module", id: "training" },
      { type: "module", id: "talents" },
      { type: "module", id: "performance" },
    ],
  },
  {
    label: "Suivi",
    items: [
      { type: "module", id: "attendance" },
      { type: "module", id: "wellbeing" },
      { type: "module", id: "legal" },
      { type: "module", id: "documents" },
    ],
  },
  {
    label: "Administration Système",
    items: [
      { type: "extra", id: "admin", label: "Administration", path: "/admin", icon: Shield },
      { type: "module", id: "security" },
      { type: "module", id: "settings" },
      { type: "extra", id: "plateforme", label: "Plateforme", path: "/plateforme", icon: Building2 },
    ],
  },
];


const CABINET_ROLES = new Set(["admin", "dg", "dga", "manager"]);
const OPS_ROLES = new Set(["admin", "dg", "dga", "manager", "rh", "assistant_direction"]);
const STAFF_ROLES = new Set(["admin", "dg", "dga", "manager", "rh", "secretaire", "assistant_direction"]);
const RESTRICTED_PATHS = new Set([
  "/recrutement", "/taches", "/performance", "/formation", "/paie",
  "/presence", "/documents", "/juridique", "/communication", "/talents",
  "/bien-etre", "/securite", "/secretariat", "/assistant",
  "/manager", "/parametres",
]);
// Modules terrain masqués au cabinet exécutif (DG/DGA/Secrétaire) — préserve l'autonomie des équipes
const FIELD_ONLY_PATHS = new Set(["/taches", "/presence", "/communication", "/bien-etre"]);
const EXECUTIVE_ROLES = new Set(["dg", "dga", "secretaire"]);
// Pour un agent (employee) sans rôle staff : ne voir que son tableau de bord et la présence
const AGENT_ALLOWED_PATHS = new Set(["/", "/presence", "/bien-etre", "/communication", "/taches", "/rapports"]);

export function AppSidebar() {
  const location = useLocation();
  const { isAdmin, user, roles, rolesLoading } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string>(companyLogo);
  const [companyName, setCompanyName] = useState<string>("EMERGENCE DRC");
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const canManageCabinets = roles.some((r) => CABINET_ROLES.has(r));
  
  const hasStaff = roles.some((r) => STAFF_ROLES.has(r));
  const hasOpsAccess = roles.some((r) => OPS_ROLES.has(r));
  const hasField = roles.some((r) => ["admin", "manager", "rh", "assistant_direction"].includes(r));
  const hasExec = roles.some((r) => EXECUTIVE_ROLES.has(r));
  const isExecutiveOnly = hasExec && !hasField;
  // Par défaut, on considère l'utilisateur comme agent tant qu'on n'a pas la preuve d'un rôle staff.
  // Évite que la sidebar montre brièvement tous les modules pendant le chargement des rôles.
  const isAgentOnly = !!user && !hasStaff;

  useEffect(() => {
    (async () => {
      // 0) Statut super-admin plateforme
      if (user?.id) {
        const { data: pa } = await supabase
          .from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle();
        setIsPlatformAdmin(Boolean(pa));
      }
      // 1) Profil de l'entreprise (tenant) — source de vérité
      const { data: member } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user?.id ?? "")
        .maybeSingle();

      const orgId = (member as any)?.organization_id;
      if (orgId) {
        const { data: org } = await supabase
          .from("organizations")
          .select("name,logo_url")
          .eq("id", orgId)
          .maybeSingle();
        if ((org as any)?.name) setCompanyName((org as any).name);
        if ((org as any)?.logo_url) setLogoUrl((org as any).logo_url);
      }
      // 2) Repli sur les paramètres de l'espace
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
  }, [user?.id]);

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
        {NAV_GROUPS.map((group) => {
          const items = group.items
            .map((entry) => {
              if (entry.type === "extra") {
                const allowed =
                  (entry.id === "cabinets" && canManageCabinets) ||
                  (entry.id === "admin" && isAdmin) ||
                  (entry.id === "plateforme" && isPlatformAdmin);
                if (!allowed) return null;
                return { id: entry.id, label: entry.label!, path: entry.path!, icon: entry.icon!, restricted: false };
              }
              const m = modules.find((mod) => mod.id === entry.id);
              if (!m) return null;
              if (isAgentOnly && !AGENT_ALLOWED_PATHS.has(m.path)) return null;
              if (isExecutiveOnly && FIELD_ONLY_PATHS.has(m.path)) return null;
              const restricted =
                RESTRICTED_PATHS.has(m.path) && !hasOpsAccess && !(isAgentOnly && AGENT_ALLOWED_PATHS.has(m.path));
              return { id: m.id, label: m.label, path: m.path, icon: m.icon, restricted };
            })
            .filter(Boolean) as { id: string; label: string; path: string; icon: typeof Building2; restricted: boolean }[];

          if (items.length === 0) return null;

          const groupActive = items.some((it) =>
            it.path === "/" ? location.pathname === "/" : location.pathname.startsWith(it.path),
          );

          return (
            <Collapsible key={group.label} defaultOpen={groupActive || group.defaultOpen} className="group/collapsible">
              <SidebarGroup>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex w-full items-center justify-between">
                    <span className="truncate">{group.label}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=closed]/collapsible:-rotate-90" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {items.map((it) => {
                        const Icon = it.icon;
                        const active =
                          it.path === "/" ? location.pathname === "/" : location.pathname.startsWith(it.path);
                        return (
                          <SidebarMenuItem key={it.id}>
                            <SidebarMenuButton
                              asChild
                              tooltip={it.restricted ? `${it.label} (accès restreint)` : it.label}
                            >
                              <NavLink
                                to={it.path}
                                onClick={(e) => { if (it.restricted) e.preventDefault(); }}
                                aria-disabled={it.restricted}
                                className={cn(
                                  active && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                                  it.restricted && "opacity-40 cursor-not-allowed pointer-events-none",
                                )}
                              >
                                <Icon className="h-[18px] w-[18px] shrink-0" />
                                <span className="truncate text-sm">{it.label}</span>
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>


      <SidebarFooter className="border-t border-sidebar-border px-4 py-3 text-xs text-sidebar-foreground/60">
        © {new Date().getFullYear()} {companyName}
      </SidebarFooter>
    </Sidebar>
  );
}
