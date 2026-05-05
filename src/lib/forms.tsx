import { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const FormGrid = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
);

interface FieldBase {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  className?: string;
  span?: number;
}

const spanCls = (span?: number) =>
  span === 2 ? "md:col-span-2" : span === 3 ? "md:col-span-3" : "";

export const TextField = ({
  label,
  value,
  onChange,
  required,
  type = "text",
  className,
  placeholder,
  min,
  step,
}: FieldBase & {
  type?: string;
  placeholder?: string;
  min?: string | number;
  step?: string | number;
}) => (
  <div className={`space-y-1.5 ${className ?? ""}`}>
    <Label>
      {label}
      {required && <span className="text-destructive"> *</span>}
    </Label>
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      placeholder={placeholder}
      min={min}
      step={step}
    />
  </div>
);

export const AreaField = ({
  label,
  value,
  onChange,
  required,
  rows = 3,
  className,
}: FieldBase & { rows?: number }) => (
  <div className={`space-y-1.5 md:col-span-2 ${className ?? ""}`}>
    <Label>
      {label}
      {required && <span className="text-destructive"> *</span>}
    </Label>
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      rows={rows}
    />
  </div>
);

export const SelectField = ({
  label,
  value,
  onChange,
  options,
  required,
  placeholder = "Sélectionner...",
  className,
}: FieldBase & {
  options: { value: string; label: string }[];
  placeholder?: string;
}) => (
  <div className={`space-y-1.5 ${className ?? ""}`}>
    <Label>
      {label}
      {required && <span className="text-destructive"> *</span>}
    </Label>
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

/** Retire les champs vides ('' ou null) avant un upsert/insert Supabase. */
export const cleanForm = (form: Record<string, any>): any => {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(form)) {
    if (v === "" || v === null || v === undefined) continue;
    out[k] = v;
  }
  return out;
};
