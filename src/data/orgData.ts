import type { ModuleColor } from "./modules";
import {
  Cpu, Package, Settings2, TrendingUp, ShieldCheck,
  Megaphone, Users, Scale, Briefcase, GraduationCap, Wallet, Calendar, BarChart3,
  Sparkles, HeartHandshake, DollarSign, PieChart, FileText, Calculator,
  Truck, Clock, Activity, Database, Target, FileCheck, AlertOctagon,
  Phone, MapPin, Award, ShoppingBag, Star, AlertTriangle,
  type LucideIcon
} from "lucide-react";

export interface Direction {
  id: string;
  code: string;
  name: string;
  managerTitle: string;
  color: ModuleColor;
  icon: LucideIcon;
  agentCount: number;
  dashboardPath: string;
}

export const directions: Direction[] = [
  { id: "dg", code: "DG", name: "Direction Générale", managerTitle: "DG", color: "purple" as ModuleColor, icon: TrendingUp, agentCount: 0, dashboardPath: "/dg-dashboard" },
  { id: "dga", code: "DGA", name: "Direction Générale Adjointe", managerTitle: "DGA", color: "indigo" as ModuleColor, icon: TrendingUp, agentCount: 0, dashboardPath: "/dga-dashboard" },
  { id: "tech", code: "D1", name: "Direction Technologie", managerTitle: "Gestionnaire", color: "blue", icon: Cpu, agentCount: 0, dashboardPath: "/tech-dashboard" },
  { id: "prod", code: "D2", name: "Direction Produits", managerTitle: "Gestionnaire", color: "green", icon: Package, agentCount: 0, dashboardPath: "/product-dashboard" },
  { id: "ops", code: "D3", name: "Direction Opérations", managerTitle: "Gestionnaire", color: "teal", icon: Settings2, agentCount: 0, dashboardPath: "/operations-dashboard" },
  { id: "fin", code: "D4", name: "Direction Financière", managerTitle: "Gestionnaire", color: "indigo", icon: TrendingUp, agentCount: 0, dashboardPath: "/finance-dashboard" },
  { id: "risk", code: "D5", name: "Direction Risques", managerTitle: "Gestionnaire", color: "orange", icon: ShieldCheck, agentCount: 0, dashboardPath: "/risk-dashboard" },
  { id: "cmo", code: "D6", name: "Direction Commerciale", managerTitle: "Gestionnaire", color: "yellow", icon: Megaphone, agentCount: 0, dashboardPath: "/commercial-dashboard" },
  { id: "rh", code: "D7", name: "Direction RH", managerTitle: "Gestionnaire", color: "blue", icon: Users, agentCount: 0, dashboardPath: "/rh-dashboard" },
  { id: "leg", code: "D8", name: "Direction Juridique", managerTitle: "Gestionnaire", color: "gray", icon: Scale, agentCount: 0, dashboardPath: "/juridique" },
];

export interface Department {
  id: string;
  name: string;
  short: string;
  moduleId: string;
  agentCount: number;
  icon: LucideIcon;
  color: ModuleColor;
  directionId: string;
}

// Départements Technologie
export const techDepartments: Department[] = [
  { id: "software", name: "Développement Logiciel", short: "Dev", moduleId: "tasks", agentCount: 12, icon: Cpu, color: "blue", directionId: "tech" },
  { id: "architecture", name: "Architecture Systèmes", short: "Arch", moduleId: "architecture", agentCount: 3, icon: Settings2, color: "purple", directionId: "tech" },
  { id: "devops", name: "DevOps & Cloud", short: "DevOps", moduleId: "deployments", agentCount: 5, icon: Package, color: "green", directionId: "tech" },
  { id: "security", name: "Sécurité Informatique", short: "Secu", moduleId: "security", agentCount: 4, icon: ShieldCheck, color: "red", directionId: "tech" },
  { id: "data", name: "Data & IA", short: "Data", moduleId: "analytics", agentCount: 6, icon: TrendingUp, color: "orange", directionId: "tech" },
  { id: "qa", name: "QA & Tests", short: "QA", moduleId: "tests", agentCount: 8, icon: TrendingUp, color: "teal", directionId: "tech" },
  { id: "support", name: "Support IT", short: "Support", moduleId: "support", agentCount: 7, icon: Users, color: "indigo", directionId: "tech" },
  { id: "infra", name: "Infrastructure", short: "Infra", moduleId: "infrastructure", agentCount: 5, icon: Settings2, color: "gray", directionId: "tech" },
  { id: "innovation", name: "Innovation R&D", short: "R&D", moduleId: "innovation", agentCount: 3, icon: TrendingUp, color: "pink", directionId: "tech" },
];

// Départements RH
export const rhDepartments: Department[] = [
  { id: "recruitment", name: "Recrutement", short: "Recrut", moduleId: "recrutement", agentCount: 5, icon: Briefcase, color: "pink", directionId: "rh" },
  { id: "training", name: "Formation", short: "Form", moduleId: "formation", agentCount: 3, icon: GraduationCap, color: "teal", directionId: "rh" },
  { id: "payroll", name: "Paie & Rémunération", short: "Paie", moduleId: "paie", agentCount: 4, icon: Wallet, color: "orange", directionId: "rh" },
  { id: "attendance", name: "Présence & Congés", short: "Prés", moduleId: "presence", agentCount: 2, icon: Calendar, color: "green", directionId: "rh" },
  { id: "performance", name: "Performance", short: "Perf", moduleId: "performance", agentCount: 3, icon: BarChart3, color: "green", directionId: "rh" },
  { id: "talents", name: "Gestion des talents", short: "Talents", moduleId: "talents", agentCount: 2, icon: Sparkles, color: "pink", directionId: "rh" },
  { id: "wellbeing", name: "Bien-être (QVT)", short: "QVT", moduleId: "bien-etre", agentCount: 2, icon: HeartHandshake, color: "red", directionId: "rh" },
];

// Départements Financière
export const financeDepartments: Department[] = [
  { id: "accounting", name: "Comptabilité", short: "Compta", moduleId: "comptabilite", agentCount: 6, icon: DollarSign, color: "indigo", directionId: "fin" },
  { id: "treasury", name: "Trésorerie", short: "Trésor", moduleId: "tresorerie", agentCount: 3, icon: Wallet, color: "blue", directionId: "fin" },
  { id: "reporting", name: "Reporting & Analyses", short: "Report", moduleId: "rapports", agentCount: 4, icon: PieChart, color: "purple", directionId: "fin" },
  { id: "management", name: "Contrôle de Gestion", short: "CtrlGest", moduleId: "controle-gestion", agentCount: 3, icon: Calculator, color: "orange", directionId: "fin" },
];

// Départements Commerciale
export const commercialDepartments: Department[] = [
  { id: "sales", name: "Ventes", short: "Ventes", moduleId: "ventes", agentCount: 15, icon: DollarSign, color: "orange", directionId: "cmo" },
  { id: "marketing", name: "Marketing", short: "Marketing", moduleId: "marketing", agentCount: 8, icon: Megaphone, color: "yellow", directionId: "cmo" },
  { id: "crm", name: "Relation Client", short: "CRM", moduleId: "crm", agentCount: 6, icon: Users, color: "blue", directionId: "cmo" },
  { id: "business", name: "Business Development", short: "BizDev", moduleId: "business-dev", agentCount: 4, icon: TrendingUp, color: "green", directionId: "cmo" },
];

// Départements Produits
export const productDepartments: Department[] = [
  { id: "product-mgmt", name: "Gestion Produit", short: "Prod", moduleId: "gestion-produit", agentCount: 7, icon: Package, color: "green", directionId: "prod" },
  { id: "ux", name: "UX/UI Design", short: "UX/UI", moduleId: "ux-ui", agentCount: 5, icon: Star, color: "purple", directionId: "prod" },
  { id: "product-marketing", name: "Marketing Produit", short: "MktProd", moduleId: "marketing-produit", agentCount: 4, icon: Megaphone, color: "pink", directionId: "prod" },
];

// Départements Opérations
export const opsDepartments: Department[] = [
  { id: "logistics", name: "Logistique", short: "Logist", moduleId: "logistique", agentCount: 8, icon: Truck, color: "teal", directionId: "ops" },
  { id: "supply", name: "Supply Chain", short: "Supply", moduleId: "supply-chain", agentCount: 6, icon: Database, color: "blue", directionId: "ops" },
  { id: "quality", name: "Qualité", short: "Qualité", moduleId: "qualite", agentCount: 5, icon: FileCheck, color: "green", directionId: "ops" },
  { id: "production", name: "Production", short: "Prod", moduleId: "production", agentCount: 12, icon: Settings2, color: "indigo", directionId: "ops" },
];

// Départements Risques
export const riskDepartments: Department[] = [
  { id: "compliance", name: "Conformité", short: "Conform", moduleId: "conformite", agentCount: 4, icon: FileCheck, color: "orange", directionId: "risk" },
  { id: "audit", name: "Audit Interne", short: "Audit", moduleId: "audit", agentCount: 3, icon: Target, color: "red", directionId: "risk" },
  { id: "risk-mgmt", name: "Gestion des Risques", short: "Risk", moduleId: "gestion-risques", agentCount: 5, icon: ShieldCheck, color: "red", directionId: "risk" },
];

// Départements Juridique
export const legalDepartments: Department[] = [
  { id: "legal", name: "Juridique", short: "Jurid", moduleId: "juridique", agentCount: 4, icon: Scale, color: "gray", directionId: "leg" },
  { id: "regulatory", name: "Conformité Réglementaire", short: "Réglem", moduleId: "conformite-reglementaire", agentCount: 2, icon: FileCheck, color: "yellow", directionId: "leg" },
  { id: "litigation", name: "Contentieux", short: "Content", moduleId: "contentieux", agentCount: 2, icon: AlertTriangle, color: "orange", directionId: "leg" },
];

// Regroupement de tous les départements
export const allDepartments: Department[] = [
  ...techDepartments,
  ...rhDepartments,
  ...financeDepartments,
  ...commercialDepartments,
  ...productDepartments,
  ...opsDepartments,
  ...riskDepartments,
  ...legalDepartments,
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
  manager_id?: string;
  comment?: string; // RH notes
}

export const employees: Employee[] = [];

