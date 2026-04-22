import { Bell, Search, ChevronDown, LogOut, Settings } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUsers } from "@/contexts/UsersContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  title: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  const { isRH, logout } = useAuth();
  const { currentUser } = useUsers();
  const { notifications, markRead } = useNotifications();

  const unreadCount = notifications.filter(n => !n.read).length;

  const notificationItems = notifications.slice(0,5).map(notif => (
    <DropdownMenuItem 
      key={notif.id}
      onClick={() => markRead(notif.id)}
      className={cn("flex gap-3 p-2 w-full border-b last:border-0", !notif.read && "bg-accent font-medium")}
    >
      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 font-medium">
        {notif.from.substring(0,1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-medium leading-tight">{notif.message}</p>
        <p className="text-xs text-muted-foreground truncate">{notif.from}</p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
        {new Date(notif.time).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </DropdownMenuItem>
  ));

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card/80 px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

      <h1 className="hidden text-lg font-semibold text-foreground md:block">{title}</h1>

      <div className="relative ml-auto hidden max-w-sm flex-1 md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          className="h-10 rounded-full border-border bg-secondary pl-10 text-sm"
        />
      </div>

      {/* Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
            <Bell className="h-5 w-5" />

          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 max-h-96 p-0">
          <div className="p-3 border-b">
            <h3 className="font-semibold">Notifications ({notifications.length})</h3>
            <p className="text-xs text-muted-foreground"></p>
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {notificationItems.length ? notificationItems : (
              <p className="p-8 text-center text-sm text-muted-foreground">Aucune notification</p>
            )}
          </div>
          {notifications.length > 5 && (
            <DropdownMenuItem className="border-t justify-center">
              Voir tout
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* JEMIMA NYEMBWE - Admin RH */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-3 rounded-full p-1 pr-3 transition hover:bg-secondary">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {currentUser ? currentUser.fullName.substring(0,1).toUpperCase() + (currentUser.fullName.split(' ')[1]?.substring(0,1) || currentUser.fullName.substring(1,2)).toUpperCase() : '??'}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold leading-tight text-foreground">{currentUser?.fullName || 'Utilisateur'}</p>
              <p className="text-xs leading-tight text-muted-foreground">{currentUser?.role === 'rh' ? 'Gestionnaire RH' : 'Agent'}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem asChild>
            <NavLink to="/admin" className="flex w-full items-center">
              <Settings className="mr-2 h-4 w-4" />
              Administration
            </NavLink>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={logout} className="focus:bg-destructive focus:text-destructive-foreground">
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

