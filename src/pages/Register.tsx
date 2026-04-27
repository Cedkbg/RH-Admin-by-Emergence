import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUsers } from '@/contexts/UsersContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    role: 'rh' as 'rh' | 'agent',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { createUser, users } = useUsers();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation mot de passe
    if (formData.password.length < 8) {
      toast({
        title: 'Mot de passe trop court',
        description: 'Le mot de passe doit contenir au moins 8 caractères.',
        variant: 'destructive'
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Les mots de passe ne correspondent pas',
        description: 'Veuillez confirmer votre mot de passe correctement.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const userId = await createUser({
        username: formData.username,
        fullName: formData.fullName,
        role: formData.role,
        password: formData.password
      });
      if (userId) {
        toast({
          title: `Compte ${formData.role.toUpperCase()} créé avec succès`,
          description: 'Connectez-vous avec vos identifiants'
        });
        setTimeout(() => navigate('/login'), 1000);
      } else {
        toast({
          title: 'Impossible de créer le compte',
          description: 'Un compte RH existe déjà ou vous n\'avez pas les droits',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({ title: 'Erreur création', variant: 'destructive' });
    }
    setLoading(false);
  };

  const toggleRole = () => {
    setFormData(prev => ({ ...prev, role: prev.role === 'rh' ? 'agent' : 'rh' }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Créer Admin RH</CardTitle>
          <CardDescription>Accès création agents Emergence DRC</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nom d'utilisateur</Label>
              <Input value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required autoComplete="username" />
            </div>
            <div>
              <Label>Nom complet</Label>
              <Input value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} required />
            </div>
            <div>
              <Label>Rôle</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.role === 'rh' ? "default" : "outline"}
                  className="flex-1"
                  onClick={toggleRole}
                >
                  RH Admin
                </Button>
                <Button
                  type="button"
                  variant={formData.role === 'agent' ? "default" : "outline"}
                  className="flex-1"
                  onClick={toggleRole}
                >
                  Agent
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Minimum 8 caractères</p>
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Création...' : 'Créer & Connecter'}
            </Button>
            <div className="text-xs text-muted-foreground mt-4 p-3 bg-green-50 rounded border border-green-200">
              🔒 Choisissez un mot de passe sécurisé. Il sera hashé et stocké de manière sécurisée.
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;

