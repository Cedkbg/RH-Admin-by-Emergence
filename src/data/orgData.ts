// Default directions template (used only as defaults when seeding the DB).
// All "agentCount" fields are computed from the DB at runtime.
import type { ModuleColor } from "./modules";
import { Cpu, Package, Settings2, TrendingUp, ShieldCheck, Megaphone, Users, Scale, type LucideIcon } from "lucide-react";

export interface DirectionTemplate {
  code: string;
  name: string;
  color: ModuleColor;
  icon: LucideIcon;
}

export const directionTemplates: DirectionTemplate[] = [
  { code: "DG",  name: "Direction Générale",          color: "purple", icon: TrendingUp },
  { code: "DGA", name: "Direction Générale Adjointe", color: "indigo", icon: TrendingUp },
  { code: "D1",  name: "Direction Technologie",       color: "blue",   icon: Cpu },
  { code: "D2",  name: "Direction Produits",          color: "green",  icon: Package },
  { code: "D3",  name: "Direction Opérations",        color: "teal",   icon: Settings2 },
  { code: "D4",  name: "Direction Financière",        color: "indigo", icon: TrendingUp },
  { code: "D5",  name: "Direction Risques",           color: "orange", icon: ShieldCheck },
  { code: "D6",  name: "Direction Commerciale",       color: "yellow", icon: Megaphone },
  { code: "D7",  name: "Direction RH",                color: "blue",   icon: Users },
  { code: "D8",  name: "Direction Juridique",         color: "gray",   icon: Scale },
];

export function iconForCode(code: string): LucideIcon {
  return directionTemplates.find((d) => d.code === code)?.icon ?? Users;
}

export function colorForCode(code: string): ModuleColor {
  return directionTemplates.find((d) => d.code === code)?.color ?? "blue";
}
