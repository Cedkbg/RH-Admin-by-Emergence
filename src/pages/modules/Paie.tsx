import { CrudPage } from "@/components/dashboard/CrudPage";
import { TextField, SelectField, FormGrid, cleanForm } from "@/lib/forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Printer, Plus, Trash2, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  matricule: string | null;
  gender: string | null;
  position: string | null;
  contract_type: string | null;
  hourly_rate: number | null;
  base_salary: number | null;
  direction_id: string | null;
  department_id: string | null;
  email: string | null;
  hire_date: string | null;
}
interface Direction { id: string; name: string; }
interface Department { id: string; name: string; }

interface BonusItem { type: string; label?: string; amount: number; }

interface Pay {
  id: string;
  employee_id: string;
  period: string;
  contract_type: string | null;
  hours_worked: number;
  hourly_rate: number;
  days_worked: number;
  daily_rate: number;
  base_salary: number;
  assiette_ipr: number;
  bonus: number;
  bonus_type: string | null;
  bonus_details: BonusItem[] | null;
  ipr: number;
  inpp: number;
  cnss: number;
  cnss_patronal: number;
  onem: number;
  other_deductions: number;
  deductions: number;
  transport: number;
  communication: number;
  loyer: number;
  allocation_familiale: number;
  total_avantages: number;
  net_pay: number;
  status: string;
  paid_at: string | null;
}

const fmt = (n: any) => Number(n || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
const num = (v: any) => Number(v || 0);
const currentPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const CONTRACT_OPTIONS = [
  { value: "CDI", label: "CDI — Contrat à Durée Indéterminée" },
  { value: "CDD", label: "CDD — Contrat à Durée Déterminée" },
  { value: "Stage", label: "Stage" },
  { value: "Consultant", label: "Consultant" },
  { value: "Journalier", label: "Journalier" },
  { value: "Prestation", label: "Prestation de service" },
];

const BONUS_TYPES = [
  { value: "mensuelle", label: "Prime mensuelle" },
  { value: "journaliere", label: "Prime journalière" },
  { value: "performance", label: "Prime de performance" },
  { value: "rendement", label: "Prime de rendement" },
  { value: "anciennete", label: "Prime d'ancienneté" },
  { value: "transport", label: "Prime de transport" },
  { value: "fin_annee", label: "Prime de fin d'année (13e mois)" },
  { value: "exceptionnelle", label: "Prime exceptionnelle" },
  { value: "mission", label: "Prime de mission" },
  { value: "responsabilite", label: "Prime de responsabilité" },
  { value: "logement", label: "Prime de logement" },
  { value: "risque", label: "Prime de risque" },
];

const STATUS_OPTIONS = [
  { value: "en_attente", label: "En attente de validation" },
  { value: "valide", label: "Validé" },
  { value: "paye", label: "Payé" },
  { value: "annule", label: "Annulé" },
];

// === Barème IPR RDC (mensuel, USD - simplifié, tranches officielles converties) ===
// Annuel CDF -> on travaille en USD ; les tranches ci-dessous sont mensuelles indicatives.
const IPR_BRACKETS = [
  { upTo: 162, rate: 0.03 },
  { upTo: 1800, rate: 0.15 },
  { upTo: 3600, rate: 0.30 },
  { upTo: Infinity, rate: 0.40 },
];

const computeIPR = (assiette: number) => {
  let remaining = Math.max(0, assiette);
  let prev = 0;
  let tax = 0;
  for (const b of IPR_BRACKETS) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, b.upTo - prev);
    if (slice > 0) {
      tax += slice * b.rate;
      remaining -= slice;
    }
    prev = b.upTo;
  }
  return +tax.toFixed(2);
};

const yearsBetween = (from: string | null | undefined, to: Date) => {
  if (!from) return 0;
  const d = new Date(from);
  if (isNaN(d.getTime())) return 0;
  return Math.max(0, (to.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
};

// === Régime horaire légal RDC : 8h/jour × 5 jours/semaine = 40h/semaine ===
const STD_HOURS_PER_DAY = 8;
const STD_DAYS_PER_WEEK = 5;
const STD_MONTHLY_HOURS = (STD_HOURS_PER_DAY * STD_DAYS_PER_WEEK * 52) / 12; // ≈ 173.33
const OVERTIME_HOUR_RATE = 1.3;  // majoration heures sup (jour ouvré)
const OVERTIME_DAY_RATE = 1.5;   // majoration jours sup (samedi / dimanche / au-delà des 5j)

const PaieForm = ({
  form, setForm, employees, directions, departments,
}: {
  form: Partial<Pay> & { children_count?: number; overtime_hours?: number; overtime_days?: number; regular_hours?: number; advance?: number };
  setForm: (f: any) => void;
  employees: Employee[];
  directions: Map<string, Direction>;
  departments: Map<string, Department>;
}) => {
  const [loadingHours, setLoadingHours] = useState(false);
  const bonuses: BonusItem[] = (form.bonus_details as any) || [];

  const setBonuses = (next: BonusItem[]) =>
    setForm({ ...form, bonus_details: next, bonus: next.reduce((s, b) => s + num(b.amount), 0) });

  const addBonus = () =>
    setBonuses([...bonuses, { type: "mensuelle", amount: 0 }]);
  const updateBonus = (i: number, patch: Partial<BonusItem>) =>
    setBonuses(bonuses.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const removeBonus = (i: number) =>
    setBonuses(bonuses.filter((_, idx) => idx !== i));

  const fillFromAttendance = useCallback(async (empId: string, period: string) => {
    if (!empId || !period || !/^\d{4}-\d{2}$/.test(period)) return null;
    setLoadingHours(true);
    try {
      const start = `${period}-01`;
      const [y, m] = period.split("-").map(Number);
      const endDate = new Date(y, m, 0).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("attendance")
        .select("check_in,check_out,date")
        .eq("employee_id", empId)
        .gte("date", start)
        .lte("date", endDate);
      if (error) {
        console.warn("[Paie] attendance fetch:", error.message);
        return { hours_worked: 0, days_worked: 0, overtime_hours: 0 };
      }
      let totalMinutes = 0;
      const days = new Set<string>();
      for (const r of (data as any[]) || []) {
        if (!r.check_in || !r.check_out) continue;
        const [h1, m1] = r.check_in.split(":").map(Number);
        const [h2, m2] = r.check_out.split(":").map(Number);
        const diff = h2 * 60 + m2 - (h1 * 60 + m1);
        if (diff > 0) {
          totalMinutes += diff;
          days.add(r.date);
        }
      }
      const hours = +(totalMinutes / 60).toFixed(2);
      const overtime = +Math.max(0, hours - STD_MONTHLY_HOURS).toFixed(2);
      return { hours_worked: hours, days_worked: days.size, overtime_hours: overtime };
    } catch (e: any) {
      console.error("[Paie] fillFromAttendance error:", e);
      return { hours_worked: 0, days_worked: 0, overtime_hours: 0 };
    } finally {
      setLoadingHours(false);
    }
  }, []);

  const recomputeAttendance = async () => {
    if (!form.employee_id || !form.period) {
      toast.error("Sélectionnez l'agent et la période");
      return;
    }
    const att = await fillFromAttendance(form.employee_id, form.period);
    if (!att) return;
    setForm({ ...form, ...att });
    toast.success(`Présence recalculée : ${att.days_worked} jours, ${att.hours_worked} h`);
  };

  const handleSelectEmployee = async (empId: string) => {
    if (!empId) return;
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;
    const period = form.period || currentPeriod();

    // 1) Mise à jour immédiate (ne BLOQUE PAS pendant l'await réseau)
    const years = yearsBetween(emp.hire_date, new Date());
    const ancienneteRate = Math.min(0.25, Math.floor(years) * 0.02);
    const base = Number(emp.base_salary ?? 0);
    const ancienneteAmount = +(base * ancienneteRate).toFixed(2);
    const newBonuses: BonusItem[] = ancienneteAmount > 0
      ? [{ type: "anciennete", label: `${Math.floor(years)} an(s) — ${(ancienneteRate * 100).toFixed(0)}%`, amount: ancienneteAmount }]
      : [];

    setForm({
      ...form,
      employee_id: empId,
      period,
      contract_type: emp.contract_type || "CDI",
      hourly_rate: Number(emp.hourly_rate ?? 0),
      base_salary: base,
      bonus_details: newBonuses,
      bonus: newBonuses.reduce((s, b) => s + b.amount, 0),
    });

    // 2) Récupération présence en arrière-plan (non bloquant)
    try {
      const att = await fillFromAttendance(empId, period);
      if (att) setForm((prev: any) => ({ ...prev, ...att }));
    } catch (e) {
      console.error("[Paie] handleSelectEmployee:", e);
    }
  };

  // === Calculs auto en temps réel ===
  const baseFromHours = num(form.hours_worked) > 0 && num(form.hourly_rate) > 0
    ? num(form.hours_worked) * num(form.hourly_rate)
    : null;
  const baseFromDays = num(form.days_worked) > 0 && num(form.daily_rate) > 0
    ? num(form.days_worked) * num(form.daily_rate)
    : null;
  const computedBrut = baseFromHours ?? baseFromDays ?? num(form.base_salary);

  const overtimePay = num(form.overtime_hours) * num(form.hourly_rate) * OVERTIME_RATE;

  const childrenCount = num(form.children_count);
  const allocFamPerChild = 5; // USD/enfant indicatif
  const allocFam = num(form.allocation_familiale) || childrenCount * allocFamPerChild;

  const totalPrimes = bonuses.reduce((s, b) => s + num(b.amount), 0);
  const totalAvantages =
    num(form.transport) + num(form.communication) + num(form.loyer) +
    allocFam + totalPrimes + overtimePay;

  // Assiette (= salaire imposable) : brut + primes imposables (hors familial / transport plafonné)
  const assiette = num(form.assiette_ipr) || (computedBrut + totalPrimes + overtimePay);

  const ipr = num(form.ipr) || computeIPR(assiette);
  const cnss = num(form.cnss) || +(computedBrut * 0.05).toFixed(2);
  const cnssPatronal = num(form.cnss_patronal) || +(computedBrut * 0.13).toFixed(2);
  const inpp = num(form.inpp) || +(computedBrut * 0.03).toFixed(2);
  const onem = num(form.onem) || +(computedBrut * 0.002).toFixed(2);
  const advance = num(form.advance);

  const totalRetenues = ipr + inpp + cnss + onem + num(form.other_deductions) + advance;
  const net = computedBrut + totalAvantages - totalRetenues;

  // Auto-remplissage cotisations à chaque changement du brut
  useEffect(() => {
    setForm((f: any) => ({
      ...f,
      cnss: +(computedBrut * 0.05).toFixed(2),
      cnss_patronal: +(computedBrut * 0.13).toFixed(2),
      inpp: +(computedBrut * 0.03).toFixed(2),
      onem: +(computedBrut * 0.002).toFixed(2),
      assiette_ipr: +(computedBrut + totalPrimes + overtimePay).toFixed(2),
      ipr: computeIPR(computedBrut + totalPrimes + overtimePay),
      allocation_familiale: childrenCount > 0 ? childrenCount * allocFamPerChild : f.allocation_familiale,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedBrut, totalPrimes, overtimePay, childrenCount]);

  const emp = employees.find((e) => e.id === form.employee_id);
  const dir = emp?.direction_id ? directions.get(emp.direction_id)?.name : null;
  const dep = emp?.department_id ? departments.get(emp.department_id)?.name : null;

  return (
    <FormGrid>
      <SelectField
        label="Agent *"
        value={form.employee_id || ""}
        onChange={handleSelectEmployee}
        options={employees.map((e) => ({ value: e.id, label: `${e.first_name} ${e.last_name}${e.matricule ? ` — ${e.matricule}` : ""}` }))}
      />
      <TextField label="Matricule" value={emp?.matricule || ""} onChange={() => {}} placeholder="Auto" />

      {emp && (
        <div className="md:col-span-2 grid grid-cols-2 gap-2 rounded-lg border bg-secondary/30 p-3 text-xs">
          <div><span className="text-muted-foreground">Direction:</span> <strong>{dir || "—"}</strong></div>
          <div><span className="text-muted-foreground">Département:</span> <strong>{dep || "—"}</strong></div>
          <div><span className="text-muted-foreground">Fonction:</span> <strong>{emp.position || "—"}</strong></div>
          <div><span className="text-muted-foreground">Embauche:</span> <strong>{emp.hire_date || "—"}</strong></div>
        </div>
      )}

      <TextField label="Période (AAAA-MM)" value={form.period || ""} onChange={(v) => setForm({ ...form, period: v })} placeholder={currentPeriod()} />
      <SelectField
        label="Type de contrat *"
        value={form.contract_type || ""}
        onChange={(v) => setForm({ ...form, contract_type: v })}
        options={CONTRACT_OPTIONS}
      />

      {/* === PRÉSENCE === */}
      <div className="md:col-span-2 mt-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-muted-foreground">Présence (auto depuis pointage)</span>
        <Button type="button" size="sm" variant="outline" onClick={recomputeAttendance} disabled={loadingHours}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loadingHours ? "animate-spin" : ""}`} />
          Recalculer
        </Button>
      </div>
      <TextField label="Jours prestés" value={String(form.days_worked ?? 0)} onChange={() => {}} type="number" disabled hint="Calculé depuis le pointage de présence" />
      <TextField label="Heures travaillées" value={String(form.hours_worked ?? 0)} onChange={() => {}} type="number" disabled hint="Calculé depuis le pointage de présence" />
      <TextField label="Heures supplémentaires" value={String(form.overtime_hours ?? 0)} onChange={() => {}} type="number" disabled hint="Calculé depuis le pointage de présence" />
      <TextField label="Taux horaire (USD/h)" value={String(form.hourly_rate ?? 0)} onChange={(v) => setForm({ ...form, hourly_rate: Number(v) })} type="number" />
      <TextField label="Taux journalier (USD/j)" value={String(form.daily_rate ?? 0)} onChange={(v) => setForm({ ...form, daily_rate: Number(v) })} type="number" />
      <TextField label="Salaire de base mensuel" value={String(form.base_salary ?? 0)} onChange={(v) => setForm({ ...form, base_salary: Number(v) })} type="number" span={2} />
      <TextField label="Assiette" value={String(form.assiette_ipr ?? 0)} onChange={(v) => setForm({ ...form, assiette_ipr: Number(v) })} type="number" span={2} />

      {/* === MULTI-PRIMES === */}
      <div className="md:col-span-2 mt-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-muted-foreground">Primes (multiples)</span>
        <Button type="button" size="sm" variant="outline" onClick={addBonus}>
          <Plus className="h-3.5 w-3.5 mr-1" />Ajouter une prime
        </Button>
      </div>
      <div className="md:col-span-2 space-y-2">
        {bonuses.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Aucune prime. Cliquez sur « Ajouter une prime ».</p>
        )}
        {bonuses.map((b, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-end rounded-lg border bg-secondary/20 p-2">
            <div className="col-span-5">
              <Label className="text-xs">Type</Label>
              <select
                className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                value={b.type}
                onChange={(e) => updateBonus(i, { type: e.target.value })}
              >
                {BONUS_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="col-span-4">
              <Label className="text-xs">Libellé</Label>
              <Input value={b.label || ""} onChange={(e) => updateBonus(i, { label: e.target.value })} placeholder="optionnel" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Montant</Label>
              <Input type="number" value={b.amount} onChange={(e) => updateBonus(i, { amount: Number(e.target.value) })} />
            </div>
            <div className="col-span-1">
              <Button type="button" size="icon" variant="ghost" onClick={() => removeBonus(i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        <div className="text-right text-xs text-muted-foreground">Total primes : <strong>{fmt(totalPrimes)} USD</strong></div>
      </div>

      {/* === RETENUES (auto) === */}
      <div className="md:col-span-2 mt-1 text-xs font-semibold uppercase text-muted-foreground">Retenues (calcul auto, modifiable)</div>
      <TextField label="CNSS Ouvrier (5%)" value={String(form.cnss ?? 0)} onChange={(v) => setForm({ ...form, cnss: Number(v) })} type="number" />
      <TextField label="CNSS Patronal (13%)" value={String(form.cnss_patronal ?? 0)} onChange={(v) => setForm({ ...form, cnss_patronal: Number(v) })} type="number" />
      <TextField label="IPR (barème RDC)" value={String(form.ipr ?? 0)} onChange={(v) => setForm({ ...form, ipr: Number(v) })} type="number" />
      <TextField label="INPP (3%)" value={String(form.inpp ?? 0)} onChange={(v) => setForm({ ...form, inpp: Number(v) })} type="number" />
      <TextField label="ONEM (0.2%)" value={String(form.onem ?? 0)} onChange={(v) => setForm({ ...form, onem: Number(v) })} type="number" />
      <TextField label="Avance / Acompte" value={String(form.advance ?? 0)} onChange={(v) => setForm({ ...form, advance: Number(v) })} type="number" />
      <TextField label="Autres retenues" value={String(form.other_deductions ?? 0)} onChange={(v) => setForm({ ...form, other_deductions: Number(v) })} type="number" span={2} />

      {/* === AVANTAGES === */}
      <div className="md:col-span-2 mt-1 text-xs font-semibold uppercase text-muted-foreground">Avantages</div>
      <TextField label="Transport" value={String(form.transport ?? 0)} onChange={(v) => setForm({ ...form, transport: Number(v) })} type="number" />
      <TextField label="Communication" value={String(form.communication ?? 0)} onChange={(v) => setForm({ ...form, communication: Number(v) })} type="number" />
      <TextField label="Loyer" value={String(form.loyer ?? 0)} onChange={(v) => setForm({ ...form, loyer: Number(v) })} type="number" />
      <TextField label="Nombre d'enfants" value={String(form.children_count ?? 0)} onChange={(v) => setForm({ ...form, children_count: Number(v) })} type="number" />
      <TextField label="Allocation familiale" value={String(form.allocation_familiale ?? 0)} onChange={(v) => setForm({ ...form, allocation_familiale: Number(v) })} type="number" span={2} />

      {/* === RÉCAP === */}
      <div className="md:col-span-2 rounded-lg border-2 border-primary/40 bg-primary/5 p-3 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-muted-foreground">Salaire brut</span><span className="font-semibold">{fmt(computedBrut)} USD</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Heures sup. ({fmt(form.overtime_hours)} h × {OVERTIME_RATE})</span><span>+ {fmt(overtimePay)} USD</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Total primes ({bonuses.length})</span><span>+ {fmt(totalPrimes)} USD</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Total avantages</span><span className="font-semibold">+ {fmt(totalAvantages)} USD</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Total retenues</span><span className="font-semibold">- {fmt(totalRetenues)} USD</span></div>
        <div className="flex justify-between text-base border-t pt-1 mt-1"><span className="font-semibold">Salaire net à payer</span><span className="font-bold text-primary">{fmt(net)} USD</span></div>
      </div>

      <SelectField
        label="Statut"
        value={form.status || "en_attente"}
        onChange={(v) => setForm({ ...form, status: v })}
        options={STATUS_OPTIONS}
      />
      <TextField label="Date de paiement" value={form.paid_at || ""} onChange={(v) => setForm({ ...form, paid_at: v })} type="date" />
    </FormGrid>
  );
};

// === Bulletin imprimable ===
const esc = (s: any) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const printBulletin = (pay: Pay, emp: Employee | undefined, dir: string | null, dep: string | null) => {
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) return;
  const bonuses: BonusItem[] = (pay.bonus_details as any) || [];
  const bonusRows = bonuses.length
    ? bonuses.map((b) => `<tr><td>Prime — ${esc(BONUS_TYPES.find((x) => x.value === b.type)?.label || b.type)}${b.label ? ` (${esc(b.label)})` : ""}</td><td class="r">${fmt(b.amount)}</td></tr>`).join("")
    : `<tr><td>Prime</td><td class="r">${fmt(pay.bonus)}</td></tr>`;

  const html = `
<!doctype html><html><head><meta charset="utf-8"><title>Bulletin ${esc(pay.period)} — ${esc(emp?.first_name)} ${esc(emp?.last_name)}</title>
<style>
body{font-family:Arial,sans-serif;padding:32px;color:#222;max-width:780px;margin:auto}
h1{margin:0 0 4px;font-size:20px}h2{font-size:13px;margin:16px 0 4px;border-bottom:2px solid #333;padding-bottom:2px;text-transform:uppercase}
table{width:100%;border-collapse:collapse;margin:4px 0}td{padding:4px 6px;border-bottom:1px solid #eee;font-size:12px}
.r{text-align:right}.tot{font-weight:bold;background:#f0f4ff}
.head{display:flex;justify-content:space-between;border-bottom:3px solid #1e40af;padding-bottom:8px;margin-bottom:12px}
.box{border:1px solid #ddd;padding:10px;border-radius:6px;font-size:12px;margin-bottom:10px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:14px}
</style></head><body>
<div class="head"><div><h1>BULLETIN DE PAIE</h1><div>Période : <b>${esc(pay.period)}</b></div></div>
<div style="text-align:right;font-size:12px"><div><b>Statut :</b> ${esc(pay.status)}</div>${pay.paid_at ? `<div>Payé le ${esc(pay.paid_at)}</div>` : ""}</div></div>

<div class="box">
<b>${esc(emp?.first_name)} ${esc(emp?.last_name)}</b><br/>
Matricule : ${esc(emp?.matricule || "—")} &nbsp;|&nbsp; Fonction : ${esc(emp?.position || "—")}<br/>
Direction : ${esc(dir || "—")} &nbsp;|&nbsp; Département : ${esc(dep || "—")}<br/>
Contrat : ${esc(pay.contract_type || "—")}
</div>

<div class="cols">
<div>
<h2>Présence & Base</h2>
<table>
<tr><td>Jours prestés</td><td class="r">${fmt(pay.days_worked)}</td></tr>
<tr><td>Heures travaillées</td><td class="r">${fmt(pay.hours_worked)} h</td></tr>
<tr><td>Taux horaire</td><td class="r">${fmt(pay.hourly_rate)} USD</td></tr>
<tr class="tot"><td>Salaire brut</td><td class="r">${fmt(pay.base_salary)}</td></tr>
<tr><td>Assiette imposable</td><td class="r">${fmt(pay.assiette_ipr)}</td></tr>
</table>

<h2>Avantages & Primes</h2>
<table>
<tr><td>Transport</td><td class="r">${fmt(pay.transport)}</td></tr>
<tr><td>Communication</td><td class="r">${fmt(pay.communication)}</td></tr>
<tr><td>Loyer</td><td class="r">${fmt(pay.loyer)}</td></tr>
<tr><td>Allocation familiale</td><td class="r">${fmt(pay.allocation_familiale)}</td></tr>
${bonusRows}
<tr class="tot"><td>Total avantages</td><td class="r">+ ${fmt(pay.total_avantages)}</td></tr>
</table>
</div>

<div>
<h2>Retenues</h2>
<table>
<tr><td>CNSS Ouvrier (5%)</td><td class="r">${fmt(pay.cnss)}</td></tr>
<tr><td>IPR</td><td class="r">${fmt(pay.ipr)}</td></tr>
<tr><td>INPP (3%)</td><td class="r">${fmt(pay.inpp)}</td></tr>
<tr><td>ONEM (0.2%)</td><td class="r">${fmt(pay.onem)}</td></tr>
<tr><td>Autres</td><td class="r">${fmt(pay.other_deductions)}</td></tr>
<tr class="tot"><td>Total retenues</td><td class="r">- ${fmt(pay.deductions)}</td></tr>
</table>

<h2>Charges patronales</h2>
<table>
<tr><td>CNSS Patronal (13%)</td><td class="r">${fmt(pay.cnss_patronal)}</td></tr>
</table>
</div>
</div>

<h2>Net à payer</h2>
<table><tr class="tot" style="background:#dbeafe;font-size:16px"><td>SALAIRE NET</td><td class="r">${fmt(pay.net_pay)} USD</td></tr></table>

<div style="margin-top:30px;display:flex;justify-content:space-between;font-size:12px">
<div>Signature employé<br/><br/>____________________</div>
<div>Signature employeur<br/><br/>____________________</div>
</div>
<script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
</body></html>`;
  w.document.write(html);
  w.document.close();
};

const Paie = () => {
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [directions, setDirections] = useState<Map<string, Direction>>(new Map());
  const [departments, setDepartments] = useState<Map<string, Department>>(new Map());

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const [{ data: emp }, { data: dir }, { data: dep }] = await Promise.all([
        supabase.from("employees").select("id,first_name,last_name,matricule,gender,position,contract_type,hourly_rate,base_salary,direction_id,department_id,email,hire_date").order("last_name"),
        supabase.from("directions").select("id,name"),
        supabase.from("departments").select("id,name"),
      ]);
      setEmployees((emp as Employee[]) || []);
      const dm = new Map<string, Direction>();
      (dir as Direction[] || []).forEach((d) => dm.set(d.id, d));
      setDirections(dm);
      const pm = new Map<string, Department>();
      (dep as Department[] || []).forEach((d) => pm.set(d.id, d));
      setDepartments(pm);
    })();
  }, [isAdmin]);

  const empMap = useMemo(() => {
    const m = new Map<string, Employee>();
    employees.forEach((e) => m.set(e.id, e));
    return m;
  }, [employees]);

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <Lock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold">Paie & Rémunération</h1>
        <p className="mt-2 text-sm text-muted-foreground">L'accès aux données de paie est réservé à l'Admin RH.</p>
      </div>
    );
  }

  return (
    <CrudPage<Pay>
      title="Paie & Rémunération"
      subtitle="bulletin(s)"
      table="payroll"
      orderBy={{ column: "created_at", ascending: false }}
      searchFields={["period", "status", "contract_type"] as any}
      defaultForm={{
        employee_id: "", period: currentPeriod(), contract_type: "CDI",
        hours_worked: 0, hourly_rate: 0, days_worked: 0, daily_rate: 0,
        base_salary: 0, assiette_ipr: 0, bonus: 0, bonus_type: null, bonus_details: [],
        ipr: 0, inpp: 0, cnss: 0, cnss_patronal: 0, onem: 0, other_deductions: 0,
        transport: 0, communication: 0, loyer: 0, allocation_familiale: 0,
        status: "en_attente", paid_at: "",
        // extras non persistés
        children_count: 0, overtime_hours: 0, advance: 0,
      } as any}
      validate={(f) => (!f.employee_id || !f.period ? "Agent et période requis" : null)}
      prepare={(f: any) => {
        const c = cleanForm(f);
        delete c.net_pay; delete c.deductions; delete c.total_avantages;
        delete c.children_count; delete c.overtime_hours; delete c.advance;
        ["hours_worked","hourly_rate","days_worked","daily_rate","base_salary","assiette_ipr","bonus","ipr","inpp","cnss","cnss_patronal","onem","other_deductions","transport","communication","loyer","allocation_familiale"].forEach((k) => { c[k] = Number(c[k] || 0); });
        if (!Array.isArray(c.bonus_details)) c.bonus_details = [];
        return c;
      }}
      columns={[
        { key: "employee_id", label: "Agent", render: (r) => {
          const e = empMap.get(r.employee_id);
          return e ? <div><div className="font-semibold">{e.first_name} {e.last_name}</div><div className="text-xs text-muted-foreground">{e.matricule}</div></div> : "—";
        }},
        { key: "contract_type", label: "Contrat", render: (r) => r.contract_type || "—" },
        { key: "period", label: "Période" },
        { key: "base_salary", label: "Brut", render: (r) => fmt(r.base_salary) },
        { key: "bonus", label: "Primes", render: (r) => {
          const n = Array.isArray(r.bonus_details) ? r.bonus_details.length : 0;
          return <span>{fmt(r.bonus)}{n > 0 && <span className="text-xs text-muted-foreground"> ({n})</span>}</span>;
        }},
        { key: "deductions", label: "Retenues", render: (r) => fmt(r.deductions) },
        { key: "net_pay", label: "Net", render: (r) => <span className="font-bold text-primary">{fmt(r.net_pay)}</span> },
        { key: "status", label: "Statut", render: (r) => {
          const variant = r.status === "paye" ? "default" : r.status === "valide" ? "secondary" : r.status === "annule" ? "destructive" : "outline";
          return <Badge variant={variant as any}>{STATUS_OPTIONS.find((s) => s.value === r.status)?.label || r.status}</Badge>;
        }},
        { key: "id", label: "Bulletin", render: (r) => {
          const e = empMap.get(r.employee_id);
          const dir = e?.direction_id ? directions.get(e.direction_id)?.name ?? null : null;
          const dep = e?.department_id ? departments.get(e.department_id)?.name ?? null : null;
          return <Button size="sm" variant="outline" onClick={() => { printBulletin(r, e, dir, dep); toast.success("Bulletin généré"); }}><Printer className="h-3.5 w-3.5 mr-1" /> Imprimer</Button>;
        }},
      ]}
      renderForm={(form, setForm) => (
        <PaieForm form={form as any} setForm={setForm as any} employees={employees} directions={directions} departments={departments} />
      )}
    />
  );
};

export default Paie;
