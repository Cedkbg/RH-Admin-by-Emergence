import { Outlet, useLocation, NavLink } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { modules } from "@/data/modules";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const isIosWebKit = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iP(ad|hone|od)/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
};

const STAFF_ROLES = new Set(["admin", "dg", "dga", "manager", "rh", "secretaire", "assistant_direction"]);
const OPS_ROLES = new Set(["admin", "dg", "dga", "manager", "rh", "assistant_direction"]);
const FIELD_ONLY_PATHS = new Set(["/taches", "/presence", "/communication", "/bien-etre"]);
const EXECUTIVE_ROLES = new Set(["dg", "dga", "secretaire"]);
const AGENT_ALLOWED_PATHS = new Set(["/", "/presence", "/bien-etre", "/communication", "/taches"]);
const RESTRICTED_PATHS = new Set([
  "/recrutement", "/taches", "/performance", "/formation", "/paie",
  "/presence", "/documents", "/juridique", "/communication", "/talents",
  "/bien-etre", "/rapports", "/securite", "/secretariat", "/assistant",
  "/manager", "/parametres",
]);

export function AppLayout() {
  const location = useLocation();
  const { signOut, user, roles } = useAuth();
  const current = modules.find((m) =>
    m.path === "/" ? location.pathname === "/" : location.pathname.startsWith(m.path),
  );
  const title = current?.label ?? "EMERGENCE DRC";

  if (isIosWebKit()) {
    const hasStaff = roles.some((r) => STAFF_ROLES.has(r));
    const hasOps = roles.some((r) => OPS_ROLES.has(r));
    const hasField = roles.some((r) => ["admin", "manager", "rh", "assistant_direction"].includes(r));
    const hasExec = roles.some((r) => EXECUTIVE_ROLES.has(r));
    const isExecutiveOnly = hasExec && !hasField;
    const isAgentOnly = !!user && !hasStaff;

    const visibleModules = modules.filter((m) => {
      if (isAgentOnly) return AGENT_ALLOWED_PATHS.has(m.path);
      if (isExecutiveOnly && FIELD_ONLY_PATHS.has(m.path)) return false;
      if (RESTRICTED_PATHS.has(m.path) && !hasOps) return false;
      return true;
    });

    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-30 border-b border-border bg-card">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">EMERGENCE DRC</p>
              <p className="truncate text-xs text-muted-foreground">{title}</p>
            </div>
            <button
              type="button"
              onClick={async () => { await signOut(); window.location.replace("/agent/login"); }}
              className="shrink-0 rounded-md border border-border px-3 py-2 text-xs font-medium"
            >
              Déconnexion
            </button>
          </div>
          {visibleModules.length > 1 && (
            <nav className="flex gap-2 overflow-x-auto border-t border-border px-3 py-2 [-webkit-overflow-scrolling:touch]">
              {visibleModules.map((m) => {
                const Icon = m.icon;
                const active = m.path === "/" ? location.pathname === "/" : location.pathname.startsWith(m.path);
                return (
                  <NavLink
                    key={m.id}
                    to={m.path}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground/80",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="whitespace-nowrap">{m.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          )}
        </header>
        <main className="px-4 py-5">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader title={title} />
          <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
            <Outlet />
          </main>
          <footer className="border-t border-border bg-card px-6 py-3 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center justify-between gap-2">
EMERGENCE DRC
              <span>Version 1.0.0</span>

            </div>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
