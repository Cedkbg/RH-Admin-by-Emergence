import { Bell, Search, ChevronDown } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";

interface AppHeaderProps {
  title: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card/80 px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

      <h1 className="hidden text-lg font-semibold text-foreground md:block">{title}</h1>

      <div className="relative ml-auto hidden max-w-sm flex-1 md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher…"
          className="h-10 rounded-full border-border bg-secondary pl-10 text-sm"
        />
      </div>

      <button className="relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground">
        <Bell className="h-5 w-5" />
        <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
          3
        </span>
      </button>

      <button className="flex items-center gap-3 rounded-full p-1 pr-3 transition hover:bg-secondary">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground">
          JD
        </div>
        <div className="hidden text-left sm:block">
          <p className="text-sm font-semibold leading-tight text-foreground">Jean Dupont</p>
          <p className="text-xs leading-tight text-muted-foreground">Admin RH</p>
        </div>
        <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
      </button>
    </header>
  );
}
