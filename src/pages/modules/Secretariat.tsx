import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, NotebookPen, CalendarClock, Mail, FileSignature, Contact,
  Plus, Pencil, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Appointment {
  id: string; title: string; description: string | null; scheduled_at: string;
  duration_minutes: number | null; location: string | null; attendees: string | null;
  for_who: string; status: string;
}
interface Mail {
  id: string; direction: string; reference: string | null; subject: string;
  sender: string | null; recipient: string | null; mail_date: string; status: string; notes: string | null;
}
interface Minutes {
  id: string; title: string; meeting_date: string; attendees: string | null;
  agenda: string | null; decisions: string | null; next_steps: string | null;
}
interface ContactRow {
  id: string; full_name: string; organization: string | null; position: string | null;
  email: string | null; phone: string | null; category: string | null; notes: string | null;
}

const Secretariat = () => {
  const navigate = useNavigate();
  const { isSecretary } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [mails, setMails] = useState<Mail[]>([]);
  const [minutes, setMinutes] = useState<Minutes[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);

  // dialogs
  const [apptOpen, setApptOpen] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const [minOpen, setMinOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  // editing ids
  const [apptId, setApptId] = useState<string | null>(null);
  const [mailId, setMailId] = useState<string | null>(null);
  const [minId, setMinId] = useState<string | null>(null);
  const [contactId, setContactId] = useState<string | null>(null);

  // forms
  const blankAppt = { title: "", description: "", scheduled_at: "", duration_minutes: 30, location: "", attendees: "", for_who: "manager", status: "scheduled" };
  const blankMail = { direction: "incoming", reference: "", subject: "", sender: "", recipient: "", mail_date: new Date().toISOString().slice(0, 10), status: "received", notes: "" };
  const blankMin = { title: "", meeting_date: new Date().toISOString().slice(0, 10), attendees: "", agenda: "", decisions: "", next_steps: "" };
  const blankContact = { full_name: "", organization: "", position: "", email: "", phone: "", category: "external", notes: "" };

  const [appt, setAppt] = useState<any>(blankAppt);
  const [mail, setMail] = useState<any>(blankMail);
  const [minutesForm, setMinutesForm] = useState<any>(blankMin);
  const [contact, setContact] = useState<any>(blankContact);

  const refresh = async () => {
    const [a, m, mi, c] = await Promise.all([
      supabase.from("appointments").select("*").order("scheduled_at", { ascending: false }),
      supabase.from("mail_register").select("*").order("mail_date", { ascending: false }),
      supabase.from("meeting_minutes").select("*").order("meeting_date", { ascending: false }),
      supabase.from("contacts").select("*").order("full_name"),
    ]);
    setAppointments((a.data as Appointment[]) || []);
    setMails((m.data as Mail[]) || []);
    setMinutes((mi.data as Minutes[]) || []);
    setContacts((c.data as ContactRow[]) || []);
  };
  useEffect(() => { refresh(); }, []);

  // Generic save/delete helpers
  const saveAppt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appt.title || !appt.scheduled_at) { toast.error("Titre et date requis"); return; }
    const payload = { ...appt, duration_minutes: Number(appt.duration_minutes) || null };
    const { error } = apptId
      ? await supabase.from("appointments").update(payload).eq("id", apptId)
      : await supabase.from("appointments").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(apptId ? "Rendez-vous mis à jour" : "Rendez-vous créé");
    setApptOpen(false); setApptId(null); setAppt(blankAppt); refresh();
  };
  const saveMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mail.subject) { toast.error("Objet requis"); return; }
    const { error } = mailId
      ? await supabase.from("mail_register").update(mail).eq("id", mailId)
      : await supabase.from("mail_register").insert(mail);
    if (error) { toast.error(error.message); return; }
    toast.success(mailId ? "Courrier mis à jour" : "Courrier enregistré");
    setMailOpen(false); setMailId(null); setMail(blankMail); refresh();
  };
  const saveMinutes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!minutesForm.title) { toast.error("Titre requis"); return; }
    const { error } = minId
      ? await supabase.from("meeting_minutes").update(minutesForm).eq("id", minId)
      : await supabase.from("meeting_minutes").insert(minutesForm);
    if (error) { toast.error(error.message); return; }
    toast.success(minId ? "Compte-rendu mis à jour" : "Compte-rendu enregistré");
    setMinOpen(false); setMinId(null); setMinutesForm(blankMin); refresh();
  };
  const saveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.full_name) { toast.error("Nom requis"); return; }
    const { error } = contactId
      ? await supabase.from("contacts").update(contact).eq("id", contactId)
      : await supabase.from("contacts").insert(contact);
    if (error) { toast.error(error.message); return; }
    toast.success(contactId ? "Contact mis à jour" : "Contact ajouté");
    setContactOpen(false); setContactId(null); setContact(blankContact); refresh();
  };
  const removeRow = async (table: "appointments" | "mail_register" | "meeting_minutes" | "contacts", id: string) => {
    if (!confirm("Supprimer cet élément ?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Supprimé"); refresh();
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate(-1)} className="w-fit -ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-module-teal text-primary-foreground">
            <NotebookPen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Secrétariat</h1>
            <p className="text-sm text-muted-foreground">Assistance du DGA et du Manager Général.</p>
          </div>
        </div>
        {!isSecretary && <Badge variant="secondary">Lecture seule — rôle Secrétaire requis</Badge>}
      </div>

      <Tabs defaultValue="agenda">
        <TabsList className="flex-wrap">
          <TabsTrigger value="agenda"><CalendarClock className="mr-2 h-4 w-4" /> Agenda ({appointments.length})</TabsTrigger>
          <TabsTrigger value="mail"><Mail className="mr-2 h-4 w-4" /> Courrier ({mails.length})</TabsTrigger>
          <TabsTrigger value="minutes"><FileSignature className="mr-2 h-4 w-4" /> PV ({minutes.length})</TabsTrigger>
          <TabsTrigger value="contacts"><Contact className="mr-2 h-4 w-4" /> Contacts ({contacts.length})</TabsTrigger>
        </TabsList>

        {/* AGENDA */}
        <TabsContent value="agenda" className="mt-4 space-y-3">
          {isSecretary && (
            <Button onClick={() => { setApptId(null); setAppt(blankAppt); setApptOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Nouveau rendez-vous
            </Button>
          )}
          <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
                <th className="p-4">Date</th><th className="p-4">Titre</th><th className="p-4">Pour</th><th className="p-4">Lieu</th><th className="p-4">Statut</th>
                {isSecretary && <th className="p-4 text-right">Actions</th>}
              </tr></thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr><td colSpan={isSecretary ? 6 : 5} className="p-12 text-center text-muted-foreground">Aucun rendez-vous.</td></tr>
                ) : appointments.map((a) => (
                  <tr key={a.id} className="border-b hover:bg-muted/50 text-sm">
                    <td className="p-4">{new Date(a.scheduled_at).toLocaleString("fr-FR")}</td>
                    <td className="p-4 font-semibold">{a.title}</td>
                    <td className="p-4"><Badge variant="outline">{a.for_who === "dga" ? "DGA" : a.for_who === "both" ? "DGA + Manager" : "Manager"}</Badge></td>
                    <td className="p-4">{a.location || "—"}</td>
                    <td className="p-4"><Badge variant={a.status === "done" ? "secondary" : a.status === "cancelled" ? "destructive" : "default"}>{a.status}</Badge></td>
                    {isSecretary && (
                      <td className="p-4 text-right">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setApptId(a.id); setAppt({ ...a, scheduled_at: a.scheduled_at?.slice(0, 16) }); setApptOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeRow("appointments", a.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </TabsContent>

        {/* MAIL */}
        <TabsContent value="mail" className="mt-4 space-y-3">
          {isSecretary && (
            <Button onClick={() => { setMailId(null); setMail(blankMail); setMailOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Nouveau courrier
            </Button>
          )}
          <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
                <th className="p-4">Date</th><th className="p-4">Sens</th><th className="p-4">Réf.</th><th className="p-4">Objet</th><th className="p-4">Expéditeur</th><th className="p-4">Destinataire</th><th className="p-4">Statut</th>
                {isSecretary && <th className="p-4 text-right">Actions</th>}
              </tr></thead>
              <tbody>
                {mails.length === 0 ? (
                  <tr><td colSpan={isSecretary ? 8 : 7} className="p-12 text-center text-muted-foreground">Aucun courrier.</td></tr>
                ) : mails.map((m) => (
                  <tr key={m.id} className="border-b hover:bg-muted/50 text-sm">
                    <td className="p-4">{new Date(m.mail_date).toLocaleDateString("fr-FR")}</td>
                    <td className="p-4"><Badge variant={m.direction === "incoming" ? "default" : "secondary"}>{m.direction === "incoming" ? "Entrant" : "Sortant"}</Badge></td>
                    <td className="p-4 font-mono text-xs">{m.reference || "—"}</td>
                    <td className="p-4 font-semibold">{m.subject}</td>
                    <td className="p-4">{m.sender || "—"}</td>
                    <td className="p-4">{m.recipient || "—"}</td>
                    <td className="p-4"><Badge variant="outline">{m.status}</Badge></td>
                    {isSecretary && (
                      <td className="p-4 text-right">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setMailId(m.id); setMail(m); setMailOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeRow("mail_register", m.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </TabsContent>

        {/* MINUTES */}
        <TabsContent value="minutes" className="mt-4 space-y-3">
          {isSecretary && (
            <Button onClick={() => { setMinId(null); setMinutesForm(blankMin); setMinOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Nouveau compte-rendu
            </Button>
          )}
          <section className="grid gap-3 md:grid-cols-2">
            {minutes.length === 0 ? (
              <div className="md:col-span-2 p-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">Aucun compte-rendu.</div>
            ) : minutes.map((m) => (
              <article key={m.id} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold">{m.title}</h3>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(m.meeting_date).toLocaleDateString("fr-FR")}</span>
                </div>
                {m.attendees && <p className="text-xs"><span className="font-semibold">Participants :</span> {m.attendees}</p>}
                {m.agenda && <p className="text-xs mt-2"><span className="font-semibold">Ordre du jour :</span> {m.agenda}</p>}
                {m.decisions && <p className="text-xs mt-2"><span className="font-semibold">Décisions :</span> {m.decisions}</p>}
                {m.next_steps && <p className="text-xs mt-2"><span className="font-semibold">Suites :</span> {m.next_steps}</p>}
                {isSecretary && (
                  <div className="mt-3 flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setMinId(m.id); setMinutesForm(m); setMinOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeRow("meeting_minutes", m.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </article>
            ))}
          </section>
        </TabsContent>

        {/* CONTACTS */}
        <TabsContent value="contacts" className="mt-4 space-y-3">
          {isSecretary && (
            <Button onClick={() => { setContactId(null); setContact(blankContact); setContactOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Nouveau contact
            </Button>
          )}
          <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
                <th className="p-4">Nom</th><th className="p-4">Organisation</th><th className="p-4">Fonction</th><th className="p-4">Email</th><th className="p-4">Téléphone</th><th className="p-4">Catégorie</th>
                {isSecretary && <th className="p-4 text-right">Actions</th>}
              </tr></thead>
              <tbody>
                {contacts.length === 0 ? (
                  <tr><td colSpan={isSecretary ? 7 : 6} className="p-12 text-center text-muted-foreground">Aucun contact.</td></tr>
                ) : contacts.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-muted/50 text-sm">
                    <td className="p-4 font-semibold">{c.full_name}</td>
                    <td className="p-4">{c.organization || "—"}</td>
                    <td className="p-4">{c.position || "—"}</td>
                    <td className="p-4">{c.email || "—"}</td>
                    <td className="p-4">{c.phone || "—"}</td>
                    <td className="p-4"><Badge variant="outline">{c.category}</Badge></td>
                    {isSecretary && (
                      <td className="p-4 text-right">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setContactId(c.id); setContact(c); setContactOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeRow("contacts", c.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </TabsContent>
      </Tabs>

      {/* === DIALOGS === */}
      <Dialog open={apptOpen} onOpenChange={setApptOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{apptId ? "Modifier" : "Nouveau"} rendez-vous</DialogTitle><DialogDescription>Planifier un rendez-vous pour le DGA ou le Manager.</DialogDescription></DialogHeader>
          <form onSubmit={saveAppt} className="space-y-3">
            <div><Label>Titre *</Label><Input required value={appt.title} onChange={(e) => setAppt({ ...appt, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date & heure *</Label><Input type="datetime-local" required value={appt.scheduled_at} onChange={(e) => setAppt({ ...appt, scheduled_at: e.target.value })} /></div>
              <div><Label>Durée (min)</Label><Input type="number" value={appt.duration_minutes} onChange={(e) => setAppt({ ...appt, duration_minutes: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Pour</Label>
                <Select value={appt.for_who} onValueChange={(v) => setAppt({ ...appt, for_who: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager Général</SelectItem>
                    <SelectItem value="dga">DGA</SelectItem>
                    <SelectItem value="both">DGA + Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={appt.status} onValueChange={(v) => setAppt({ ...appt, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Planifié</SelectItem>
                    <SelectItem value="done">Terminé</SelectItem>
                    <SelectItem value="cancelled">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Lieu</Label><Input value={appt.location || ""} onChange={(e) => setAppt({ ...appt, location: e.target.value })} /></div>
            <div><Label>Participants</Label><Input value={appt.attendees || ""} onChange={(e) => setAppt({ ...appt, attendees: e.target.value })} placeholder="Noms séparés par des virgules" /></div>
            <div><Label>Description</Label><Textarea value={appt.description || ""} onChange={(e) => setAppt({ ...appt, description: e.target.value })} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setApptOpen(false)}>Annuler</Button><Button type="submit">{apptId ? "Enregistrer" : "Créer"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={mailOpen} onOpenChange={setMailOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{mailId ? "Modifier" : "Nouveau"} courrier</DialogTitle><DialogDescription>Inscrire un courrier au registre.</DialogDescription></DialogHeader>
          <form onSubmit={saveMail} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sens</Label>
                <Select value={mail.direction} onValueChange={(v) => setMail({ ...mail, direction: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incoming">Entrant</SelectItem>
                    <SelectItem value="outgoing">Sortant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Référence</Label><Input value={mail.reference || ""} onChange={(e) => setMail({ ...mail, reference: e.target.value })} /></div>
            </div>
            <div><Label>Objet *</Label><Input required value={mail.subject} onChange={(e) => setMail({ ...mail, subject: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Expéditeur</Label><Input value={mail.sender || ""} onChange={(e) => setMail({ ...mail, sender: e.target.value })} /></div>
              <div><Label>Destinataire</Label><Input value={mail.recipient || ""} onChange={(e) => setMail({ ...mail, recipient: e.target.value })} /></div>
              <div><Label>Date</Label><Input type="date" value={mail.mail_date} onChange={(e) => setMail({ ...mail, mail_date: e.target.value })} /></div>
              <div>
                <Label>Statut</Label>
                <Select value={mail.status} onValueChange={(v) => setMail({ ...mail, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="received">Reçu</SelectItem>
                    <SelectItem value="processed">Traité</SelectItem>
                    <SelectItem value="archived">Archivé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea value={mail.notes || ""} onChange={(e) => setMail({ ...mail, notes: e.target.value })} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setMailOpen(false)}>Annuler</Button><Button type="submit">{mailId ? "Enregistrer" : "Créer"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={minOpen} onOpenChange={setMinOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{minId ? "Modifier" : "Nouveau"} compte-rendu</DialogTitle><DialogDescription>Procès-verbal de réunion.</DialogDescription></DialogHeader>
          <form onSubmit={saveMinutes} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><Label>Titre *</Label><Input required value={minutesForm.title} onChange={(e) => setMinutesForm({ ...minutesForm, title: e.target.value })} /></div>
              <div><Label>Date</Label><Input type="date" value={minutesForm.meeting_date} onChange={(e) => setMinutesForm({ ...minutesForm, meeting_date: e.target.value })} /></div>
            </div>
            <div><Label>Participants</Label><Input value={minutesForm.attendees || ""} onChange={(e) => setMinutesForm({ ...minutesForm, attendees: e.target.value })} /></div>
            <div><Label>Ordre du jour</Label><Textarea value={minutesForm.agenda || ""} onChange={(e) => setMinutesForm({ ...minutesForm, agenda: e.target.value })} /></div>
            <div><Label>Décisions</Label><Textarea value={minutesForm.decisions || ""} onChange={(e) => setMinutesForm({ ...minutesForm, decisions: e.target.value })} /></div>
            <div><Label>Suites à donner</Label><Textarea value={minutesForm.next_steps || ""} onChange={(e) => setMinutesForm({ ...minutesForm, next_steps: e.target.value })} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setMinOpen(false)}>Annuler</Button><Button type="submit">{minId ? "Enregistrer" : "Créer"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{contactId ? "Modifier" : "Nouveau"} contact</DialogTitle><DialogDescription>Annuaire interne et externe.</DialogDescription></DialogHeader>
          <form onSubmit={saveContact} className="space-y-3">
            <div><Label>Nom complet *</Label><Input required value={contact.full_name} onChange={(e) => setContact({ ...contact, full_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Organisation</Label><Input value={contact.organization || ""} onChange={(e) => setContact({ ...contact, organization: e.target.value })} /></div>
              <div><Label>Fonction</Label><Input value={contact.position || ""} onChange={(e) => setContact({ ...contact, position: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={contact.email || ""} onChange={(e) => setContact({ ...contact, email: e.target.value })} /></div>
              <div><Label>Téléphone</Label><Input value={contact.phone || ""} onChange={(e) => setContact({ ...contact, phone: e.target.value })} /></div>
              <div className="col-span-2">
                <Label>Catégorie</Label>
                <Select value={contact.category || "external"} onValueChange={(v) => setContact({ ...contact, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Interne</SelectItem>
                    <SelectItem value="external">Externe</SelectItem>
                    <SelectItem value="partner">Partenaire</SelectItem>
                    <SelectItem value="supplier">Fournisseur</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea value={contact.notes || ""} onChange={(e) => setContact({ ...contact, notes: e.target.value })} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setContactOpen(false)}>Annuler</Button><Button type="submit">{contactId ? "Enregistrer" : "Créer"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Secretariat;
