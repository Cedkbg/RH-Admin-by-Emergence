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
  { id: "tech", code: "CTO",     name: "Direction Technologie",                  managerTitle: "Manager Technologie",         color: "blue",   icon: Cpu,         agentCount: 42 },
  { id: "prod", code: "CPO",     name: "Direction Produits",                     managerTitle: "Manager Produits",            color: "green",  icon: Package,     agentCount: 28 },
  { id: "ops",  code: "COO",     name: "Direction Opérations",                   managerTitle: "Manager Opérations",          color: "teal",   icon: Settings2,   agentCount: 35 },
  { id: "fin",  code: "CFO",     name: "Direction Financière",                   managerTitle: "Manager Financier",           color: "indigo", icon: TrendingUp,  agentCount: 18 },
  { id: "risk", code: "CRO/CCO", name: "Direction Risques & Conformité",         managerTitle: "Manager Risques & Conformité", color: "orange", icon: ShieldCheck, agentCount: 22 },
  { id: "cmo",  code: "CMO",     name: "Direction Commerciale & Marketing",      managerTitle: "Manager Commercial & Marketing", color: "yellow", icon: Megaphone,   agentCount: 31 },
  { id: "rh",   code: "CHRO",    name: "Direction Ressources Humaines",          managerTitle: "Manager RH",                  color: "blue",   icon: Users,       agentCount: 14 },
  { id: "leg",  code: "CLO",     name: "Direction Juridique & Affaires",         managerTitle: "Manager Juridique",           color: "gray",   icon: Scale,       agentCount: 9 },
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
}

const firstNames = ["Marie", "Jean", "Sophie", "Pierre", "Aïcha", "Karim", "Léa", "Thomas", "Fatou", "Antoine", "Yasmine", "Hugo", "Camille", "Mehdi", "Inès", "Lucas", "Sarah", "Nicolas", "Amina", "Julien"];
const lastNames = ["Martin", "Dupont", "Bernard", "Diallo", "Leroy", "Moreau", "Durand", "Traore", "Petit", "Lefevre", "Roux", "Ndiaye", "Garcia", "Faye", "Lambert", "Sylla", "Robert", "Camara", "Mercier", "Sow"];
const roles = ["Développeur Senior", "Product Manager", "Analyste Financier", "Chargé de Conformité", "Commercial", "Chargé RH", "Juriste", "Designer UX", "Data Scientist", "Chef de Projet"];

function makeId(i: number) { return `emp-${String(i).padStart(4, "0")}`; }

export const employees: Employee[] = Array.from({ length: 60 }, (_, i) => {
  const fn = firstNames[i % firstNames.length];
  const ln = lastNames[(i * 3) % lastNames.length];
  const dir = directions[i % directions.length];
  const statuses: Employee["status"][] = ["actif", "actif", "actif", "actif", "actif", "suspendu", "depart"];
  return {
    id: makeId(i + 1),
    name: `${fn} ${ln}`,
    role: roles[i % roles.length],
    directionId: dir.id,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}@fintechrh.com`,
    status: statuses[i % statuses.length],
    hiredAt: `202${(i % 5) + 0}-${String((i % 12) + 1).padStart(2, "0")}-15`,
    initials: `${fn[0]}${ln[0]}`,
  };
});
