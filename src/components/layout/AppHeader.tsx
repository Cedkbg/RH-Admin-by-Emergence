import { LogOut, Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useUserRoles } from "@/hooks/useUserRoles";

interface AppHeaderProps {
  title: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  dg: "Directeur Général",
  dga: "Directeur Général Adjoint",
  manager: "Manager",
  rh: "Ressources Humaines",
  secretaire: "Secrétaire",
  assistant_direction: "Assistant de Direction",
  employee: "Agent",
};

const ROLE_PRIORITY = ["admin", "dg", "dga", "rh", "manager", "assistant_direction", "secretaire", "employee"];

export function AppHeader({ title }: AppHeaderProps) {
  const { user, isAdmin, signOut } = useAuth();
  const { roles } = useUserRoles();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const primaryRole = ROLE_PRIORITY.find((r) => roles.includes(r));
  const roleLabel = primaryRole ? ROLE_LABELS[primaryRole] : null;
  const lastUpdated = user?.updated_at || user?.last_sign_in_at || user?.created_at;
  const formattedLastUpdated = lastUpdated
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(lastUpdated))
    : "Non disponible";

  const initials = (user?.user_metadata?.full_name || user?.email || "?")
    .split(" ")
    .map((s: string) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    navigate(`/employes?q=${encodeURIComponent(term)}`);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card/80 px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      <h1 className="hidden text-lg font-semibold text-foreground md:block">{title}</h1>

      <form onSubmit={submitSearch} className="relative ml-auto hidden max-w-sm flex-1 md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un agent…"
          className="h-10 rounded-full border-border bg-secondary pl-10 text-sm"
        />
      </form>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-3 rounded-full p-1 pr-3 hover:bg-secondary">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {initials}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold leading-tight text-foreground flex items-center gap-2">
                {user?.user_metadata?.full_name || user?.email}
                {roleLabel && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {roleLabel}
                  </Badge>
                )}
              </p>
              <p className="text-xs leading-tight text-muted-foreground truncate max-w-[220px]">
                {user?.email}
              </p>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              Mon compte
              {isAdmin && <Badge variant="secondary">Admin</Badge>}
            </div>
            {roleLabel && (
              <span className="text-xs font-normal text-muted-foreground">
                Statut : {roleLabel}
              </span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="px-2 py-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Diagnostic profil</p>
            <p>Rôle : {roleLabel || "Agent"}</p>
            <p>Dernière mise à jour : {formattedLastUpdated}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={async () => { await signOut(); navigate("/auth"); }}>
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
