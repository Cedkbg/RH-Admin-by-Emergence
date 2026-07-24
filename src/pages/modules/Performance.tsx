import { CrudPage } from "@/components/dashboard/CrudPage";
import { TextField, AreaField, SelectField, FormGrid, cleanForm } from "@/lib/forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AgentSalarySummary } from "@/components/dashboard/AgentSalarySummary";
import { PerformanceTimeChart } from "@/components/dashboard/PerformanceTimeChart";
import { AgentSalaryDetail } from "@/components/dashboard/AgentSalaryDetail";

import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Review {
  id: string;
  employee_id: string;
  period: string;
  score: number | null;
  comments: string | null;
  reviewed_at: string | null;
}

interface PerfComment {
  id: string;
  review_id: string;
  author_id: string;
  author_name: string | null;
  content: string;
  created_at: string;
}

const Performance = () => {
  const { isAdmin, user } = useAuth();
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string; email: string | null }[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // Discussion par évaluation
  const [discussReview, setDiscussReview] = useState<Review | null>(null);
  const [messages, setMessages] = useState<PerfComment[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.from("employees").select("id,first_name,last_name,email").order("last_name").then(({ data }) => setEmployees((data as any) || []));
  }, []);

  // Charger les messages + realtime de l'évaluation ouverte
  useEffect(() => {
    if (!discussReview) { setMessages([]); return; }
    const rid = discussReview.id;
    supabase.from("performance_review_comments").select("*").eq("review_id", rid).order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data as PerfComment[]) || []));
    const ch = supabase
      .channel(`perf-comments-${rid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "performance_review_comments", filter: `review_id=eq.${rid}` }, (payload) => {
        if (payload.eventType === "INSERT") {
          setMessages((cur) => cur.some((m) => m.id === (payload.new as PerfComment).id) ? cur : [...cur, payload.new as PerfComment]);
        } else if (payload.eventType === "DELETE") {
          setMessages((cur) => cur.filter((m) => m.id !== (payload.old as PerfComment).id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [discussReview?.id]);

  const myEmployee = useMemo(() => {
    const email = user?.email?.toLowerCase();
    return employees.find((e) => e.email && e.email.toLowerCase() === email) || null;
  }, [employees, user?.email]);

  const sendMessage = async () => {
    if (!draft.trim() || !discussReview || !user) return;
    setSending(true);
    const authorName = myEmployee ? `${myEmployee.first_name} ${myEmployee.last_name}` : (user.email || "Moi");
    const { error } = await supabase.from("performance_review_comments").insert({
      review_id: discussReview.id,
      author_id: user.id,
      author_name: authorName,
      content: draft.trim(),
    });
    setSending(false);
    if (error) { toast.error("Envoi impossible", { description: error.message }); return; }
    setDraft("");
  };

  const deleteMessage = async (id: string) => {
    const { error } = await supabase.from("performance_review_comments").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  const reviewEmployee = discussReview ? employees.find((e) => e.id === discussReview.employee_id) : null;

  return (
    <div className="space-y-4">
      
      {isAdmin && (
        <>
          <AgentSalarySummary selectedAgentId={selectedAgentId} onSelectAgent={setSelectedAgentId} />
          <PerformanceTimeChart selectedAgentId={selectedAgentId} />
        </>
      )}
      <CrudPage<Review>
        title="Performance"
        subtitle="évaluation(s)"
        table="performance_reviews"
        orderBy={{ column: "reviewed_at", ascending: false }}
        searchFields={["period"]}
        defaultForm={{ employee_id: "", period: "", score: undefined, comments: "", reviewed_at: new Date().toISOString().slice(0, 10) }}
        validate={(f) => (!f.employee_id || !f.period ? "Agent et période requis" : null)}
        prepare={(f) => {
          const c = cleanForm(f as any);
          if (c.score === "") c.score = null;
          else if (c.score != null) c.score = Number(c.score);
          return c;
        }}
        columns={[
          { key: "employee_id", label: "Agent", render: (r) => {
            const e = employees.find((x) => x.id === r.employee_id);
            return e ? <span className="font-semibold">{e.first_name} {e.last_name}</span> : "—";
          }},
          { key: "period", label: "Période" },
          { key: "score", label: "Note /10", render: (r) =>
            r.score == null ? "—" :
            <Badge variant={r.score >= 7 ? "default" : r.score >= 5 ? "outline" : "destructive"}>{r.score}/10</Badge>
          },
          { key: "reviewed_at", label: "Date", render: (r) => r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString("fr-FR") : "—" },
          { key: "id", label: "Discussion", render: (r) => (
            <Button size="sm" variant="outline" onClick={() => setDiscussReview(r)}>
              <MessageSquare className="mr-2 h-3.5 w-3.5" /> Discuter
            </Button>
          )},
        ]}
        renderForm={(form, setForm) => (
          <FormGrid>
            <SelectField label="Agent *" value={form.employee_id} onChange={(v) => setForm({ ...form, employee_id: v })}
              options={employees.map((e) => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))} span={2} />
            <TextField label="Période *" value={form.period} onChange={(v) => setForm({ ...form, period: v })} required placeholder="2026 T1" />
            <TextField label="Note /10" value={form.score as any} onChange={(v) => setForm({ ...form, score: v as any })} type="number" placeholder="0-10" />
            <TextField label="Date d'évaluation" value={form.reviewed_at} onChange={(v) => setForm({ ...form, reviewed_at: v })} type="date" span={2} />
            <AreaField label="Commentaires" value={form.comments} onChange={(v) => setForm({ ...form, comments: v })} />
          </FormGrid>
        )}
      />

      <Dialog open={!!discussReview} onOpenChange={(o) => !o && setDiscussReview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Discussion — {reviewEmployee ? `${reviewEmployee.first_name} ${reviewEmployee.last_name}` : "Évaluation"}
            </DialogTitle>
            <DialogDescription>
              {discussReview?.period}{discussReview?.score != null ? ` · Note ${discussReview.score}/10` : ""}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] rounded-md border bg-muted/20 p-3">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun message. Lancez la discussion.</p>
            ) : (
              <div className="space-y-3">
                {messages.map((m) => {
                  const mine = m.author_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-background border"}`}>
                        <div className="flex items-baseline justify-between gap-3 mb-1">
                          <span className="text-xs font-semibold opacity-80">{m.author_name || "—"}</span>
                          <span className="text-[10px] opacity-60">{new Date(m.created_at).toLocaleString("fr-FR")}</span>
                        </div>
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        {(mine || isAdmin) && (
                          <button onClick={() => deleteMessage(m.id)} className="mt-1 text-[10px] opacity-60 hover:opacity-100 inline-flex items-center gap-1">
                            <Trash2 className="h-3 w-3" /> Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Écrire un message…"
              disabled={sending}
            />
            <Button onClick={sendMessage} disabled={sending || !draft.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Performance;
