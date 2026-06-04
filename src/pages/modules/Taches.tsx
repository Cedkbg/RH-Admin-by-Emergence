import { useEffect, useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Plus, Calendar, User, Trash2, Pencil, Loader2, MessageSquare, Send, MessagesSquare, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  created_at: string;
}
interface Employee { id: string; first_name: string; last_name: string; email?: string | null }
interface Comment {
  id: string;
  task_id: string;
  author_id: string;
  author_name: string | null;
  content: string;
  created_at: string;
}
interface ChatMessage {
  id: string;
  author_id: string;
  author_name: string | null;
  content: string;
  created_at: string;
}

const COLUMNS: { id: string; label: string; tone: string }[] = [
  { id: "todo", label: "À faire", tone: "bg-slate-500" },
  { id: "in_progress", label: "En cours", tone: "bg-blue-500" },
  { id: "blocked", label: "Bloqué", tone: "bg-red-500" },
  { id: "done", label: "Terminé", tone: "bg-emerald-500" },
];

const priorityVariant: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  low: { variant: "secondary", label: "Basse" },
  medium: { variant: "outline", label: "Moyenne" },
  high: { variant: "default", label: "Haute" },
  urgent: { variant: "destructive", label: "Urgente" },
};

const STAFF = ["admin", "dg", "dga", "manager", "rh", "assistant_direction", "secretaire"];
const emptyForm = { title: "", description: "", assignee_id: "", priority: "medium", status: "todo", due_date: "" };

const Taches = () => {
  const { user } = useAuth();
  const { hasAny } = useUserRoles();
  const canManage = hasAny(STAFF);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"mine" | "all">(canManage ? "all" : "mine");
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => { setViewMode(canManage ? "all" : "mine"); }, [canManage]);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: t }, { data: e }] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("employees").select("id,first_name,last_name,email").order("last_name"),
    ]);
    setTasks((t as Task[]) || []);
    setEmployees((e as Employee[]) || []);
    // Récupération de l'employee_id du compte connecté via l'email (le RPC n'est
    // pas exécutable côté client — on retombe donc sur une simple jointure email).
    const myEmail = user?.email?.toLowerCase();
    const me = (e as { id: string; email: string | null }[] | null)?.find(
      (row) => row.email && row.email.toLowerCase() === myEmail,
    );
    setMyEmployeeId(me?.id ?? null);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    const ch = supabase
      .channel("tasks-kanban")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  // Charger commentaires + realtime de la tâche ouverte
  useEffect(() => {
    if (!editing) { setComments([]); return; }
    const taskId = editing.id;
    supabase.from("task_comments").select("*").eq("task_id", taskId).order("created_at", { ascending: true })
      .then(({ data }) => setComments((data as Comment[]) || []));
    const ch = supabase
      .channel(`task-comments-${taskId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_comments", filter: `task_id=eq.${taskId}` }, (payload) => {
        if (payload.eventType === "INSERT") setComments((cur) => [...cur, payload.new as Comment]);
        else if (payload.eventType === "DELETE") setComments((cur) => cur.filter((c) => c.id !== (payload.old as Comment).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [editing?.id]);

  // Chat d'équipe global (module)
  useEffect(() => {
    supabase.from("task_chat_messages").select("*").order("created_at", { ascending: true }).limit(200)
      .then(({ data }) => setChatMessages((data as ChatMessage[]) || []));
    const ch = supabase
      .channel("task-chat-global")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "task_chat_messages" }, (payload) => {
        const msg = payload.new as ChatMessage;
        setChatMessages((cur) => [...cur, msg]);
        setChatUnread((u) => (msg.author_id === user?.id ? u : u + 1));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "task_chat_messages" }, (payload) => {
        setChatMessages((cur) => cur.filter((m) => m.id !== (payload.old as ChatMessage).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  useEffect(() => { if (chatOpen) setChatUnread(0); }, [chatOpen, chatMessages.length]);

  const handleSendChat = async () => {
    if (!chatInput.trim() || !user) return;
    setChatSending(true);
    const me = employees.find((e) => e.id === myEmployeeId);
    const authorName = me ? `${me.first_name} ${me.last_name}` : (user.email || "Moi");
    const { error } = await supabase.from("task_chat_messages").insert({
      author_id: user.id, author_name: authorName, content: chatInput.trim(),
    });
    setChatSending(false);
    if (error) { toast.error("Envoi impossible", { description: error.message }); return; }
    setChatInput("");
  };

  const handleDeleteChat = async (id: string) => {
    const { error } = await supabase.from("task_chat_messages").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  const visibleTasks = useMemo(() => {
    let arr = tasks;
    if (viewMode === "mine" && myEmployeeId) arr = arr.filter((t) => t.assignee_id === myEmployeeId);
    else if (viewMode === "mine" && !myEmployeeId) arr = [];
    const q = search.trim().toLowerCase();
    if (q) arr = arr.filter((t) => t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q));
    return arr;
  }, [tasks, search, viewMode, myEmployeeId]);

  const grouped = useMemo(() => {
    const map: Record<string, Task[]> = { todo: [], in_progress: [], blocked: [], done: [] };
    for (const t of visibleTasks) {
      const key = map[t.status] ? t.status : "todo";
      map[key].push(t);
    }
    return map;
  }, [visibleTasks]);

  const canEditTask = (t: Task) => canManage || t.assignee_id === myEmployeeId;

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    const task = tasks.find((t) => t.id === draggableId);
    if (!task || !canEditTask(task)) { toast.error("Vous ne pouvez modifier que vos tâches"); return; }
    const newStatus = destination.droppableId;
    const prev = tasks;
    setTasks((cur) => cur.map((t) => (t.id === draggableId ? { ...t, status: newStatus } : t)));
    const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", draggableId);
    if (error) { setTasks(prev); toast.error("Impossible de déplacer la tâche", { description: error.message }); }
    else toast.success("Statut mis à jour");
  };

  const openCreate = (status?: string) => {
    if (!canManage) return;
    setEditing(null);
    setForm({ ...emptyForm, status: status || "todo" });
    setDialogOpen(true);
  };

  const openEdit = (t: Task) => {
    setEditing(t);
    setForm({
      title: t.title,
      description: t.description || "",
      assignee_id: t.assignee_id || "",
      priority: t.priority,
      status: t.status,
      due_date: t.due_date || "",
    });
    setNewComment("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!canManage) { toast.error("Action réservée à l'encadrement"); return; }
    if (!form.title.trim()) { toast.error("Titre requis"); return; }
    const payload = {
      title: form.title.trim(),
      description: form.description || null,
      assignee_id: form.assignee_id || null,
      priority: form.priority,
      status: form.status,
      due_date: form.due_date || null,
    };
    const { error } = editing
      ? await supabase.from("tasks").update(payload).eq("id", editing.id)
      : await supabase.from("tasks").insert(payload);
    if (error) { toast.error("Échec", { description: error.message }); return; }
    toast.success(editing ? "Tâche mise à jour" : "Tâche créée");
    setDialogOpen(false);
    loadAll();
  };

  const handleDelete = async (id: string) => {
    if (!canManage) return;
    if (!confirm("Supprimer cette tâche ?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Tâche supprimée");
    loadAll();
  };

  const handleAddComment = async () => {
    if (!editing || !newComment.trim() || !user) return;
    setCommentLoading(true);
    const me = employees.find((e) => e.id === myEmployeeId);
    const authorName = me ? `${me.first_name} ${me.last_name}` : (user.email || "Moi");
    const { error } = await supabase.from("task_comments").insert({
      task_id: editing.id,
      author_id: user.id,
      author_name: authorName,
      content: newComment.trim(),
    });
    setCommentLoading(false);
    if (error) { toast.error("Commentaire refusé", { description: error.message }); return; }
    setNewComment("");
  };

  const handleDeleteComment = async (id: string) => {
    const { error } = await supabase.from("task_comments").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  const employeeName = (id: string | null) => {
    if (!id) return null;
    const e = employees.find((x) => x.id === id);
    return e ? `${e.first_name} ${e.last_name}` : null;
  };

  const isOverdue = (t: Task) => t.due_date && t.status !== "done" && new Date(t.due_date) < new Date(new Date().toDateString());

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tâches & Projets</h1>
          <p className="text-sm text-muted-foreground">
            {canManage ? "Glissez les cartes entre les colonnes pour suivre l'avancement" : "Vos tâches assignées — glissez pour mettre à jour le statut"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {canManage && (
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "mine" | "all")}>
              <TabsList>
                <TabsTrigger value="all">Toutes</TabsTrigger>
                <TabsTrigger value="mine">Mes tâches</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="md:w-64" />
          {canManage && (
            <Button onClick={() => openCreate()}>
              <Plus className="h-4 w-4" /> Nouvelle tâche
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement…
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {COLUMNS.map((col) => (
              <Droppable droppableId={col.id} key={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`rounded-lg border bg-muted/40 flex flex-col min-h-[400px] transition-colors ${snapshot.isDraggingOver ? "bg-muted" : ""}`}
                  >
                    <div className="flex items-center justify-between p-3 border-b">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${col.tone}`} />
                        <h3 className="font-semibold text-sm">{col.label}</h3>
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">{grouped[col.id].length}</Badge>
                      </div>
                      {canManage && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openCreate(col.id)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="p-2 space-y-2 flex-1">
                      {grouped[col.id].map((t, idx) => {
                        const draggable = canEditTask(t);
                        return (
                          <Draggable draggableId={t.id} index={idx} key={t.id} isDragDisabled={!draggable}>
                            {(prov, snap) => (
                              <Card
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                className={`transition-shadow ${draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${snap.isDragging ? "shadow-lg ring-2 ring-primary" : "hover:shadow-md"}`}
                                onClick={() => openEdit(t)}
                              >
                                <CardHeader className="p-3 pb-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-sm font-semibold leading-snug">{t.title}</CardTitle>
                                    <Badge variant={priorityVariant[t.priority]?.variant || "outline"} className="shrink-0 text-[10px] h-5">
                                      {priorityVariant[t.priority]?.label || t.priority}
                                    </Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="p-3 pt-1 space-y-2">
                                  {t.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                                  )}
                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {employeeName(t.assignee_id) && (
                                        <span className="inline-flex items-center gap-1">
                                          <User className="h-3 w-3" /> {employeeName(t.assignee_id)}
                                        </span>
                                      )}
                                      {t.due_date && (
                                        <span className={`inline-flex items-center gap-1 ${isOverdue(t) ? "text-destructive font-medium" : ""}`}>
                                          <Calendar className="h-3 w-3" />
                                          {format(new Date(t.due_date), "d MMM", { locale: fr })}
                                        </span>
                                      )}
                                    </div>
                                    {canManage && (
                                      <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); openEdit(t); }}>
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}>
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                      {grouped[col.id].length === 0 && (
                        <div className="text-center text-xs text-muted-foreground py-8 border-2 border-dashed rounded-md">
                          Aucune tâche
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? (canManage ? "Modifier la tâche" : "Détail de la tâche") : "Nouvelle tâche"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Titre *</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Que faut-il faire ?" disabled={!canManage} />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} disabled={!canManage} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Statut</label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })} disabled={!editing ? !canManage : !canEditTask(editing)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Priorité</label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })} disabled={!canManage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Basse</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Assigné à</label>
                <Select value={form.assignee_id || "none"} onValueChange={(v) => setForm({ ...form, assignee_id: v === "none" ? "" : v })} disabled={!canManage}>
                  <SelectTrigger><SelectValue placeholder="Personne" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Aucun —</SelectItem>
                    {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Échéance</label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} disabled={!canManage} />
              </div>
            </div>
          </div>

          {editing && (
            <>
              <Separator className="my-2" />
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <MessageSquare className="h-4 w-4" /> Commentaires ({comments.length})
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {comments.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Aucun commentaire pour l'instant.</p>
                  )}
                  {comments.map((c) => (
                    <div key={c.id} className="rounded-md border bg-muted/30 p-2 text-sm">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span className="font-medium text-foreground">{c.author_name || "Utilisateur"}</span>
                        <div className="flex items-center gap-2">
                          <span>{format(new Date(c.created_at), "d MMM HH:mm", { locale: fr })}</span>
                          {c.author_id === user?.id && (
                            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleDeleteComment(c.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Écrire un commentaire…"
                    rows={2}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddComment(); }}
                  />
                  <Button onClick={handleAddComment} disabled={!newComment.trim() || commentLoading} size="icon" className="self-end">
                    {commentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Fermer</Button>
            {canManage && (
              <Button onClick={handleSave}>{editing ? "Enregistrer" : "Créer"}</Button>
            )}
            {!canManage && editing && canEditTask(editing) && (
              <Button onClick={async () => {
                const { error } = await supabase.from("tasks").update({ status: form.status }).eq("id", editing.id);
                if (error) toast.error(error.message); else { toast.success("Statut mis à jour"); setDialogOpen(false); loadAll(); }
              }}>Mettre à jour le statut</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Espace de discussion d'équipe — flottant */}
      <div className="fixed bottom-4 right-4 z-50 w-[min(380px,calc(100vw-2rem))]">
        {chatOpen ? (
          <Card className="shadow-2xl border-primary/20 flex flex-col h-[70vh] max-h-[560px]">
            <CardHeader className="p-3 border-b flex-row items-center justify-between space-y-0 bg-primary text-primary-foreground rounded-t-lg">
              <div className="flex items-center gap-2">
                <MessagesSquare className="h-4 w-4" />
                <CardTitle className="text-sm">Discussion d'équipe</CardTitle>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20" onClick={() => setChatOpen(false)}>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.length === 0 && (
                <p className="text-xs text-muted-foreground italic text-center py-8">
                  Aucun message. Lancez la discussion avec votre équipe 👋
                </p>
              )}
              {chatMessages.map((m) => {
                const mine = m.author_id === user?.id;
                return (
                  <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {!mine && <div className="text-[10px] font-medium opacity-80 mb-0.5">{m.author_name || "Utilisateur"}</div>}
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 px-1">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(m.created_at), "d MMM HH:mm", { locale: fr })}
                      </span>
                      {mine && (
                        <button onClick={() => handleDeleteChat(m.id)} className="text-[10px] text-muted-foreground hover:text-destructive">
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
            <div className="p-2 border-t flex gap-2">
              <Textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Écrire un message…"
                rows={1}
                className="resize-none min-h-[40px]"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
              />
              <Button size="icon" onClick={handleSendChat} disabled={!chatInput.trim() || chatSending}>
                {chatSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </Card>
        ) : (
          <Button onClick={() => setChatOpen(true)} className="rounded-full shadow-2xl h-14 w-14 p-0 relative ml-auto flex" size="icon">
            <MessagesSquare className="h-6 w-6" />
            {chatUnread > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
                {chatUnread > 9 ? "9+" : chatUnread}
              </span>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default Taches;
