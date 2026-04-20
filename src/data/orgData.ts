import type { ModuleColor } from "./modules";
import {
  Cpu, Package, Settings2, TrendingUp, ShieldCheck,
  Megaphone, Users, Scale, type LucideIcon
} from "lucide-react";

export interface Direction {
  id: string;
  code: string;
  name: string;
  managerTitle: string;
  color: ModuleColor;
  icon: LucideIcon;
  agentCount: number;
}

export const directions: Direction[] = [
  { id: "tech", code: "D1", name: "Direction Technologie", managerTitle: "Gestionnaire", color: "blue", icon: Cpu, agentCount: 0 },
  { id: "prod", code: "D2", name: "Direction Produits", managerTitle: "Gestionnaire", color: "green", icon: Package, agentCount: 0 },
  { id: "ops", code: "D3", name: "Direction Opérations", managerTitle: "Gestionnaire", color: "teal", icon: Settings2, agentCount: 0 },
  { id: "fin", code: "D4", name: "Direction Financière", managerTitle: "Gestionnaire", color: "indigo", icon: TrendingUp, agentCount: 0 },
  { id: "risk", code: "D5", name: "Direction Risques", managerTitle: "Gestionnaire", color: "orange", icon: ShieldCheck, agentCount: 0 },
  { id: "cmo", code: "D6", name: "Direction Commerciale", managerTitle: "Gestionnaire", color: "yellow", icon: Megaphone, agentCount: 0 },
  { id: "rh", code: "D7", name: "Direction RH", managerTitle: "Gestionnaire", color: "blue", icon: Users, agentCount: 0 },
  { id: "leg", code: "D8", name: "Direction Juridique", managerTitle: "Gestionnaire", color: "gray", icon: Scale, agentCount: 0 },
];

export interface Employee {
  id: string;
  name: string;
  role: string;
  directionId: string;
  email: string;
  status: "actif" | "suspendu" | "depart";
  hiredAt: string;
  initials: string;
  comment?: string; // RH notes
}

export const employees: Employee[] = [];

