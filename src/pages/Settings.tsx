import { useState } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Settings,
  User,
  Building2,
  Bell,
  Shield,
  Palette,
  Globe,
  Database,
  Mail,
  Save,
  CheckCircle2,
  Users,
  KeyRound,
  Smartphone,
  Sun,
  Moon,
  Monitor
} from "lucide-react";

interface AppSettings {
  language: string;
  currency: string;
  timezone: string;
  notifications: Record<string, boolean>;
}

const defaultSettings: AppSettings = {
  language: "Français",
  currency: "CDF (Franc Congolais)",
  timezone: "Africa/Kinshasa (UTC+1)",
  notifications: {
    "email-notif": true,
    "push-notif": true,
    "sms-notif": false,
    "login-alert": true,
    "task-reminder": true,
    "weekly-report": false,
  },
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem("app-settings");
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {}
  return defaultSettings;
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem("app-settings", JSON.stringify(settings));
}

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSettings(next);
  };

  const toggleNotification = (id: string) => {
    const nextNotifications = { ...settings.notifications, [id]: !settings.notifications[id] };
    updateSetting("notifications", nextNotifications);
  };

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const notificationItems = [
    { id: "email-notif", label: "Notifications par email", desc: "Recevoir les alertes par email" },
    { id: "push-notif", label: "Notifications push", desc: "Alertes dans le navigateur" },
    { id: "sms-notif", label: "Notifications SMS", desc: "Alertes urgentes par SMS" },
    { id: "login-alert", label: "Alerte de connexion", desc: "Avertir lors d'une nouvelle connexion" },
    { id: "task-reminder", label: "Rappel de tâches", desc: "Rappeler les tâches à venir" },
    { id: "weekly-report", label: "Rapport hebdomadaire", desc: "Recevoir un résumé hebdomadaire" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-gray-100">
          <Settings className="h-8 w-8 text-gray-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-gray-600">Configuration du système Emergence DRC</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          <TabsTrigger value="general" className="gap-2">
            <Building2 className="h-4 w-4" /> Général
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" /> Profil
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" /> Sécurité
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" /> Apparence
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" /> Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-2">
            <Database className="h-4 w-4" /> Avancé
          </TabsTrigger>
        </TabsList>

        {/* GÉNÉRAL */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations de l'entreprise</CardTitle>
              <CardDescription>Configurez les informations principales de votre organisation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom de l'entreprise</Label>
                  <Input defaultValue="Emergence DRC" />
                </div>
                <div className="space-y-2">
                  <Label>Sigle</Label>
                  <Input defaultValue="EDRC" />
                </div>
                <div className="space-y-2">
                  <Label>Email principal</Label>
                  <Input type="email" defaultValue="contact@emergence-drc.com" />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input defaultValue="+243 999 999 999" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Adresse</Label>
                  <Input defaultValue="Kinshasa, République Démocratique du Congo" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paramètres régionaux</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Langue</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3"
                    value={settings.language}
                    onChange={(e) => updateSetting("language", e.target.value)}
                  >
                    <option>Français</option>
                    <option>English</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Devise</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3"
                    value={settings.currency}
                    onChange={(e) => updateSetting("currency", e.target.value)}
                  >
                    <option>CDF (Franc Congolais)</option>
                    <option>USD (Dollar US)</option>
                    <option>EUR (Euro)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Fuseau horaire</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3"
                    value={settings.timezone}
                    onChange={(e) => updateSetting("timezone", e.target.value)}
                  >
                    <option>Africa/Kinshasa (UTC+1)</option>
                    <option>Africa/Lagos (UTC+1)</option>
                    <option>Europe/Paris (UTC+1/UTC+2)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROFIL */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                  AD
                </div>
                <div>
                  <Button variant="outline" size="sm">Changer la photo</Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input defaultValue="Admin" />
                </div>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input defaultValue="Directeur" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" defaultValue="admin@emergence-drc.com" />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input defaultValue="+243 999 999 999" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Fonction</Label>
                  <Input defaultValue="Directeur Général" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOTIFICATIONS */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Préférences de notification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {notificationItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                  <Switch
                    checked={settings.notifications[item.id] ?? false}
                    onCheckedChange={() => toggleNotification(item.id)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SÉCURITÉ */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mot de passe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Mot de passe actuel</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>Nouveau mot de passe</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>Confirmer le mot de passe</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <Button className="gap-2">
                <KeyRound className="h-4 w-4" /> Mettre à jour le mot de passe
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Authentification à deux facteurs (2FA)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">Authentification par SMS</p>
                    <p className="text-sm text-gray-500">Recevoir un code par SMS</p>
                  </div>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">Authentification par email</p>
                    <p className="text-sm text-gray-500">Recevoir un code par email</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* APPARENCE */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thème</CardTitle>
              <CardDescription>Choisissez le thème qui vous convient</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setTheme("light")}
                  className={cn(
                    "border-2 rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02]",
                    theme === "light" ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-gray-200"
                  )}
                >
                  <div className="h-20 bg-gradient-to-br from-gray-50 to-white border rounded-lg mb-3 flex items-center justify-center">
                    <Sun className="h-8 w-8 text-amber-500" />
                  </div>
                  <p className="text-center font-medium">Clair</p>
                  {theme === "light" && (
                    <Badge className="mt-2 mx-auto block w-fit bg-primary text-primary-foreground">Actif</Badge>
                  )}
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "border-2 rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02]",
                    theme === "dark" ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-gray-700"
                  )}
                >
                  <div className="h-20 bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-lg mb-3 flex items-center justify-center">
                    <Moon className="h-8 w-8 text-indigo-400" />
                  </div>
                  <p className="text-center font-medium">Sombre</p>
                  {theme === "dark" && (
                    <Badge className="mt-2 mx-auto block w-fit bg-primary text-primary-foreground">Actif</Badge>
                  )}
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={cn(
                    "border-2 rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02]",
                    theme === "system" ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-gray-200"
                  )}
                >
                  <div className="h-20 bg-gradient-to-br from-gray-100 to-gray-200 border rounded-lg mb-3 flex items-center justify-center">
                    <Monitor className="h-8 w-8 text-gray-600" />
                  </div>
                  <p className="text-center font-medium">Système</p>
                  {theme === "system" && (
                    <Badge className="mt-2 mx-auto block w-fit bg-primary text-primary-foreground">Actif</Badge>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personnalisation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Menu compact</p>
                  <p className="text-sm text-gray-500">Réduire la taille du menu</p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Animations</p>
                  <p className="text-sm text-gray-500">Activer les animations de transition</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* UTILISATEURS */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gestion des utilisateurs</CardTitle>
                <CardDescription>Gérer les accès et les rôles</CardDescription>
              </div>
              <Button>Ajouter un utilisateur</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: "Admin Directeur", email: "admin@emergence-drc.com", role: "Administrateur", status: "Actif" },
                  { name: "RH Manager", email: "rh@emergence-drc.com", role: "RH", status: "Actif" },
                  { name: "Tech Lead", email: "tech@emergence-drc.com", role: "Technologie", status: "Actif" },
                  { name: "Finance Comptable", email: "finance@emergence-drc.com", role: "Finance", status: "Inactif" },
                ].map((user, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={user.status === "Actif" ? "default" : "secondary"}>{user.status}</Badge>
                      <Badge variant="outline">{user.role}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AVANCÉ */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sauvegarde et restauration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Sauvegarde automatique</p>
                  <p className="text-sm text-gray-500">Tous les jours à 02:00</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="gap-2">
                  <Database className="h-4 w-4" /> Sauvegarder maintenant
                </Button>
                <Button variant="outline" className="gap-2">
                  <Globe className="h-4 w-4" /> Exporter les données
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Zone dangereuse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-red-200 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-red-900">Réinitialiser toutes les données</p>
                  <p className="text-sm text-red-600">Cette action est irréversible</p>
                </div>
                <Button variant="destructive">Réinitialiser</Button>
              </div>
              <div className="flex items-center justify-between p-4 border border-red-200 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-red-900">Supprimer le compte</p>
                  <p className="text-sm text-red-600">Supprimer définitivement ce compte</p>
                </div>
                <Button variant="destructive">Supprimer</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="fixed bottom-6 right-6 flex items-center gap-3">
        {saved && (
          <Badge className="bg-green-100 text-green-800 gap-1 px-3 py-2">
            <CheckCircle2 className="h-4 w-4" /> Enregistré !
          </Badge>
        )}
        <Button size="lg" className="gap-2 shadow-lg" onClick={handleSave}>
          <Save className="h-5 w-5" /> Enregistrer les modifications
        </Button>
      </div>
    </div>
  );
}

