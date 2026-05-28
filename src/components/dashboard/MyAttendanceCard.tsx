import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Award, Minus, AlertTriangle, AlertOctagon, Clock, FileText, Activity } from "lucide-react";
import { toast } from "sonner";

type Mention = "excellent" | "moyenne" | "faible" | "tres_faible";

const mentionFor = (att: number): Mention => {
  if (att >= 100) return "excellent";
  if (att > 60) return "moyenne";
  if (att >= 50) return "faible";
  return "tres_faible";
};

const MentionBadge = ({ m }: { m: Mention }) => {
  if (m === "excellent")
    return <Badge className="bg-emerald-600 hover:bg-emerald-700 gap-1"><Award className="h-3 w-3" />Excellent(e)</Badge>;
  if (m === "moyenne")
    return <Badge variant="secondary" className="gap-1"><Minus className="h-3 w-3" />Moyenne</Badge>;
  if (m === "faible")
    return <Badge className="bg-orange-500 hover:bg-orange-600 gap-1"><AlertTriangle className="h-3 w-3" />Faible</Badge>;
  return <Badge variant="destructive" className="gap-1"><AlertOctagon className="h-3 w-3" />Très faible</Badge>;
};

const hoursBetween = (ci: string | null, co: string | null) => {
  if (!ci || !co) return 0;
  const [h1, m1] = ci.split(":").map(Number);
  const [h2, m2] = co.split(":").map(Number);
  return Math.max(0, ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60);
};

interface Justification { id: string; period: string; reason: string; status: string; created_at: string; }

export function MyAttendanceCard({ employeeId }: { employeeId: string }) {
  const [attendance, setAttendance] = useState(0);
  const [hours, setHours] = useState(0);
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const period = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const load = async () => {
    setLoading(true);
    const [y, m] = period.split("-").map(Number);
    const monthStart = `${period}-01`;
    const monthEnd = new Date(y, m, 0).toISOString().slice(0, 10);

    const [{ data: att }, { data: justs }] = await Promise.all([
      supabase.from("attendance")
        .select("date,status,check_in,check_out")
        .eq("employee_id", employeeId)
        .gte("date", monthStart).lte("date", monthEnd),
      supabase.from("absence_justifications")
        .select("id,period,reason,status,created_at")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false }),
    ]);

    let workingDays = 0;
    for (let d = new Date(y, m - 1, 1); d.getMonth() === m - 1; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) workingDays++;
    }
    const present = (att || []).filter((a: any) => ["present", "mission", "deplacement"].includes(a.status)).length;
    const totalH = (att || []).reduce((s: number, a: any) => s + hoursBetween(a.check_in, a.check_out), 0);
    setAttendance(workingDays > 0 ? Math.round((present / workingDays) * 100) : 0);
    setHours(+totalH.toFixed(1));
    setJustifications((justs as Justification[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (employeeId) load(); /* eslint-disable-next-line */ }, [employeeId]);

  const submit = async () => {
    if (!reason.trim()) { toast.error("Veuillez expliquer le motif."); return; }
    setSaving(true);
    const { error } = await supabase.from("absence_justifications").insert({
      employee_id: employeeId, period, reason: reason.trim(),
    });
    setSaving(false);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success("Justification envoyée ✅");
    setReason(""); setOpen(false); load();
  };

  const mention = mentionFor(attendance);
  const canJustify = mention !== "excellent";

  return (
    <Card className="p-5 ring-1 ring-primary/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="inline-flex p-1.5 rounded-md bg-gradient-to-br from-primary to-primary/70 text-white">
              <Activity className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-base">Mon assiduité — {period}</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Suivi mensuel de votre présence et de vos heures travaillées.
          </p>
        </div>
        <MentionBadge m={mention} />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="rounded-lg border p-3 bg-card">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Présence</p>
          <p className="text-2xl font-bold mt-0.5">{loading ? "…" : `${attendance}%`}</p>
        </div>
        <div className="rounded-lg border p-3 bg-card">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
            <Clock className="h-3 w-3" />Heures travaillées
          </p>
          <p className="text-2xl font-bold mt-0.5">{loading ? "…" : `${hours} h`}</p>
        </div>
      </div>

      {canJustify && (
        <Button className="mt-4 w-full gap-2" variant="outline" onClick={() => setOpen(true)}>
          <FileText className="h-4 w-4" />
          Justifier mes absences
        </Button>
      )}

      {justifications.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Mes justifications</p>
          {justifications.slice(0, 5).map((j) => (
            <div key={j.id} className="rounded-lg border p-2 text-xs space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="text-[10px] font-mono">{j.period}</Badge>
                <Badge variant={j.status === "approved" ? "default" : j.status === "rejected" ? "destructive" : "secondary"} className="text-[10px]">
                  {j.status}
                </Badge>
              </div>
              <p className="line-clamp-2">{j.reason}</p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Justifier mes absences — {period}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Expliquez le motif de vos absences (maladie, mission, autre…)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={5}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={submit} disabled={saving}>{saving ? "Envoi…" : "Envoyer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
