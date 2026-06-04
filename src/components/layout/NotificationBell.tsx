import { useEffect, useMemo, useState } from "react";
import { Bell, Pin, CheckCheck, X } from "lucide-react";
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
interface Notif {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  category: string;
  read_at: string | null;
  created_at: string;
}

const STORAGE_KEY = "announcements:lastSeenAt";

const formatSafeDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleString("fr-FR");
  }
};

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Ann[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; }
  });

  const load = async () => {
    const [{ data: ann }, { data: nt }] = await Promise.all([
      supabase.from("announcements").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(30),
      supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(30),
    ]);
    setItems((ann as Ann[]) || []);
    setNotifs((nt as Notif[]) || []);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("notif-bell")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" }, (payload) => {
        const a = payload.new as Ann;
        setItems((prev) => (prev.find((p) => p.id === a.id) ? prev : [a, ...prev]));
        if (a.author_id !== user?.id) toast.message("🔔 Nouvelle annonce", { description: a.title });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "announcements" }, (payload) => {
        setItems((prev) => prev.filter((p) => p.id !== (payload.old as Ann).id));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user?.id}` }, (payload) => {
        const n = payload.new as Notif;
        setNotifs((prev) => (prev.find((p) => p.id === n.id) ? prev : [n, ...prev]));
        toast.message("🔔 " + n.title, { description: n.message || undefined });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const unreadAnn = items.filter((a) => a.author_id !== user?.id && (!lastSeen || a.created_at > lastSeen)).length;
  const unreadNotif = notifs.filter((n) => !n.read_at).length;
  const unread = unreadAnn + unreadNotif;

  const markAllRead = async () => {
    const now = new Date().toISOString();
    setLastSeen(now);
    try { localStorage.setItem(STORAGE_KEY, now); } catch {}
    if (notifs.some((n) => !n.read_at)) {
      const ids = notifs.filter((n) => !n.read_at).map((n) => n.id);
      await supabase.from("notifications").update({ read_at: now }).in("id", ids);
      setNotifs((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    }
  };

  const deleteNotif = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifs = async () => {
    if (!notifs.length) return;
    if (!confirm("Supprimer toutes les notifications ?")) return;
    const ids = notifs.map((n) => n.id);
    const { error } = await supabase.from("notifications").delete().in("id", ids);
    if (error) { toast.error(error.message); return; }
    setNotifs([]);
    toast.success("Notifications supprimées");
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) markAllRead();
  };

  const merged = useMemo(() => {
    type Row = { kind: "ann" | "notif"; date: string; data: Ann | Notif };
    const rows: Row[] = [
      ...items.map((a) => ({ kind: "ann" as const, date: a.created_at, data: a })),
      ...notifs.map((n) => ({ kind: "notif" as const, date: n.created_at, data: n })),
    ];
    return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [items, notifs]);

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
          {merged.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Aucune notification</div>
          ) : (
            <div className="divide-y">
              {merged.map((row) => {
                if (row.kind === "ann") {
                  const a = row.data as Ann;
                  const isNew = (!lastSeen || a.created_at > lastSeen) && a.author_id !== user?.id;
                  return (
                    <button
                      key={"a-" + a.id}
                      onClick={() => { setOpen(false); navigate("/communication"); }}
                      className="block w-full px-3 py-3 text-left hover:bg-muted/50"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        {a.pinned && <Pin className="h-3 w-3 text-primary" />}
                        <span className="text-sm font-semibold truncate">{a.title}</span>
                        {isNew && <Badge variant="secondary" className="ml-auto text-[9px] px-1 py-0">Nouveau</Badge>}
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{a.content}</p>
                      <div className="mt-1 text-[10px] text-muted-foreground">{formatSafeDateTime(a.created_at)}</div>
                    </button>
                  );
                }
                const n = row.data as Notif;
                return (
                  <div key={"n-" + n.id} className="group relative flex items-start hover:bg-muted/50">
                    <button
                      onClick={() => { setOpen(false); if (n.link) navigate(n.link); }}
                      className="block flex-1 px-3 py-3 text-left"
                    >
                      <div className="mb-1 flex items-center gap-2 pr-6">
                        <span className="text-sm font-semibold truncate">{n.title}</span>
                        {!n.read_at && <Badge variant="secondary" className="ml-auto text-[9px] px-1 py-0">Nouveau</Badge>}
                      </div>
                      {n.message && <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>}
                      <div className="mt-1 text-[10px] text-muted-foreground">{formatSafeDateTime(n.created_at)}</div>
                    </button>
                    <button
                      onClick={(e) => deleteNotif(e, n.id)}
                      className="absolute right-1 top-1 rounded p-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-background hover:text-destructive"
                      title="Supprimer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        {notifs.length > 0 && (
          <div className="border-t p-2 flex gap-2">
            {unreadNotif > 0 && (
              <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={markAllRead}>
                <CheckCheck className="mr-1 h-3.5 w-3.5" /> Tout lu
              </Button>
            )}
            <Button variant="ghost" size="sm" className="flex-1 text-xs text-destructive" onClick={clearAllNotifs}>
              <X className="mr-1 h-3.5 w-3.5" /> Vider
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
