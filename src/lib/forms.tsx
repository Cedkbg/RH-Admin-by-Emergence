import { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function Field({ label, children, span = 1 }: { label: string; children: ReactNode; span?: 1 | 2 }) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <Label className="mb-1 block text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

export function TextField({ label, value, onChange, type = "text", required, span = 1, placeholder }: {
  label: string; value: any; onChange: (v: string) => void; type?: string; required?: boolean; span?: 1 | 2; placeholder?: string;
}) {
  return (
    <Field label={label} span={span}>
      <Input type={type} required={required} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </Field>
  );
}

export function AreaField({ label, value, onChange, span = 2 }: { label: string; value: any; onChange: (v: string) => void; span?: 1 | 2 }) {
  return (
    <Field label={label} span={span}>
      <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={3} />
    </Field>
  );
}

export function SelectField({ label, value, onChange, options, span = 1 }: {
  label: string; value: any; onChange: (v: string) => void; options: { value: string; label: string }[]; span?: 1 | 2;
}) {
  return (
    <Field label={label} span={span}>
      <Select value={value ?? ""} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

/** Strip empty strings -> null for nullable columns */
export function cleanForm<T extends Record<string, any>>(form: T): T {
  const out: any = {};
  for (const k of Object.keys(form)) {
    const v = (form as any)[k];
    out[k] = v === "" ? null : v;
  }
  delete out.id;
  delete out.created_at;
  delete out.updated_at;
  return out;
}
