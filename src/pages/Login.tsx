import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast({ title: 'Veuillez entrer votre nom d\'utilisateur', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const success = await login(username.trim(), '');
    setLoading(false);
    if (success) {
      toast({ title: 'Connexion réussie! Redirection...' });
      setTimeout(() => navigate('/admin'), 1000);
    } else {
      toast({ title: 'Utilisateur non trouvé ou désactivé', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">EMERGENCE DRC</CardTitle>
          <CardDescription className="text-lg">Authentification sécurisée</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Nom d'utilisateur</Label>
              <Input 
                id="username"
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Votre identifiant"
                required 
                autoComplete="username"
              />
            </div>
            <Button type="submit" className="w-full h-12 font-semibold" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;

