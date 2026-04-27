import {
  LayoutDashboard, Network, Users, Briefcase, ClipboardCheck,
  GraduationCap, Wallet, Calendar, FileText, Scale,
  MessageSquare, Sparkles, HeartHandshake, BarChart3, Shield,
  Settings, NotebookPen, type LucideIcon
} from "lucide-react";

export type ModuleColor =
  | "blue" | "purple" | "green" | "orange" | "red"
  | "yellow" | "pink" | "teal" | "indigo" | "gray";

export interface AppModule {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  color: ModuleColor;
  shortDescription: string;
}

export const modules: AppModule[] = [
  { id: "dashboard", label: "Tableau de bord", path: "/", icon: LayoutDashboard, color: "blue", shortDescription: "Vue d'ensemble" },
  { id: "org", label: "Organigramme", path: "/organigramme", icon: Network, color: "indigo", shortDescription: "Structure de l'entreprise" },
  { id: "employees", label: "Agents", path: "/employes", icon: Users, color: "blue", shortDescription: "Gérez les profils des agents" },
  { id: "recruitment", label: "Recrutement", path: "/recrutement", icon: Briefcase, color: "pink", shortDescription: "Gérez les candidatures et recrutements" },
  { id: "tasks", label: "Tâches & Projets", path: "/taches", icon: ClipboardCheck, color: "purple", shortDescription: "Assignez et suivez les tâches" },
  { id: "performance", label: "Performance", path: "/performance", icon: BarChart3, color: "green", shortDescription: "Évaluez et suivez les performances" },
  { id: "training", label: "Formation", path: "/formation", icon: GraduationCap, color: "teal", shortDescription: "Planifiez et suivez les formations" },
  { id: "payroll", label: "Paie & Rémunération", path: "/paie", icon: Wallet, color: "orange", shortDescription: "Gérez les salaires, primes et avantages" },
  { id: "attendance", label: "Présence & Congés", path: "/presence", icon: Calendar, color: "green", shortDescription: "Suivez les présences, absences et congés" },
  { id: "documents", label: "Documents", path: "/documents", icon: FileText, color: "purple", shortDescription: "Stockez et gérez les documents" },
  { id: "legal", label: "Juridique & Conformité", path: "/juridique", icon: Scale, color: "yellow", shortDescription: "Suivez la conformité et les obligations légales" },
  { id: "communication", label: "Communication", path: "/communication", icon: MessageSquare, color: "indigo", shortDescription: "Annonces et messagerie interne" },
  { id: "talents", label: "Gestion des talents", path: "/talents", icon: Sparkles, color: "pink", shortDescription: "Identifiez et développez les talents" },
  { id: "wellbeing", label: "Bien-être (QVT)", path: "/bien-etre", icon: HeartHandshake, color: "red", shortDescription: "Engagement et qualité de vie au travail" },
  { id: "reports", label: "Rapports & Analyses", path: "/rapports", icon: BarChart3, color: "blue", shortDescription: "Tableaux de bord et Analytics" },
  { id: "secretariat", label: "Secrétariat", path: "/secretariat", icon: NotebookPen, color: "teal", shortDescription: "Agenda, courrier, PV et contacts" },
  { id: "security", label: "Sécurité & Accès", path: "/securite", icon: Shield, color: "gray", shortDescription: "Rôles, accès et logs" },
  { id: "settings", label: "Paramètres", path: "/parametres", icon: Settings, color: "gray", shortDescription: "Configuration du système" },
];

export const colorClasses: Record<ModuleColor, { bg: string; text: string; iconBg: string }> = {
  blue:   { bg: "bg-module-blue",   text: "text-module-blue",   iconBg: "bg-module-blue/10" },
  purple: { bg: "bg-module-purple", text: "text-module-purple", iconBg: "bg-module-purple/10" },
  green:  { bg: "bg-module-green",  text: "text-module-green",  iconBg: "bg-module-green/10" },
  orange: { bg: "bg-module-orange", text: "text-module-orange", iconBg: "bg-module-orange/10" },
  red:    { bg: "bg-module-red",    text: "text-module-red",    iconBg: "bg-module-red/10" },
  yellow: { bg: "bg-module-yellow", text: "text-module-yellow", iconBg: "bg-module-yellow/10" },
  pink:   { bg: "bg-module-pink",   text: "text-module-pink",   iconBg: "bg-module-pink/10" },
  teal:   { bg: "bg-module-teal",   text: "text-module-teal",   iconBg: "bg-module-teal/10" },
  indigo: { bg: "bg-module-indigo", text: "text-module-indigo", iconBg: "bg-module-indigo/10" },
  gray:   { bg: "bg-module-gray",   text: "text-module-gray",   iconBg: "bg-module-gray/10" },
};

