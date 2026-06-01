import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { modules } from "@/data/modules";
import { useAuth } from "@/contexts/AuthContext";

const isIosWebKit = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iP(ad|hone|od)/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
};

export function AppLayout() {
  const location = useLocation();
  const { signOut } = useAuth();
const current = modules.find((m) =>
  m.path === "/" ? location.pathname === "/" : location.pathname.startsWith(m.path),
);
const title = current?.label ?? "EMERGENCE DRC";

  if (isIosWebKit()) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-30 border-b border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between gap-3">
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
