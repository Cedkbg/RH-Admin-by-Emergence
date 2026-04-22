import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { modules } from "@/data/modules";

export function AppLayout() {
  const location = useLocation();
const current = modules.find((m) =>
  m.path === "/" ? location.pathname === "/" : location.pathname.startsWith(m.path),
);
const title = current?.label ?? "EMERGENCE DRC";

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
