import { useEffect, useState } from "react";
import { Bell, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Ann {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;
  author_id: string | null;
}

const STORAGE_KEY = "announcements:lastSeenAt";

const formatSafeDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleString("fr-FR");
  }
};

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Ann[]>([]);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; }
  });

  const load = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data as Ann[]) || []);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("announcements-bell")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" }, (payload) => {
        const a = payload.new as Ann;
        setItems((prev) => (prev.find((p) => p.id === a.id) ? prev : [a, ...prev]));
        if (a.author_id !== user?.id) {
          toast.message("🔔 Nouvelle annonce", { description: a.title });
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "announcements" }, (payload) => {
        setItems((prev) => prev.filter((p) => p.id !== (payload.old as Ann).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const unread = items.filter((a) => a.author_id !== user?.id && (!lastSeen || a.created_at > lastSeen)).length;

  const markAllRead = () => {
    const now = new Date().toISOString();
    setLastSeen(now);
    try { localStorage.setItem(STORAGE_KEY, now); } catch {}
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) markAllRead();
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b p-3">
          <div className="font-semibold text-sm">Notifications</div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setOpen(false); navigate("/communication"); }}>
            Voir tout
          </Button>
        </div>
        <ScrollArea className="h-80">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Aucune annonce</div>
          ) : (
            <div className="divide-y">
              {items.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { setOpen(false); navigate("/communication"); }}
                  className="block w-full px-3 py-3 text-left hover:bg-muted/50"
                >
                  <div className="mb-1 flex items-center gap-2">
                    {a.pinned && <Pin className="h-3 w-3 text-primary" />}
                    <span className="text-sm font-semibold truncate">{a.title}</span>
                    {(!lastSeen || a.created_at > lastSeen) && a.author_id !== user?.id && (
                      <Badge variant="secondary" className="ml-auto text-[9px] px-1 py-0">Nouveau</Badge>
                    )}
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{a.content}</p>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {formatSafeDateTime(a.created_at)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
