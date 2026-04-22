import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const [formData, setFormData] = useState({ username: '', pw: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(formData.username, formData.pw);
    setLoading(false);
    if (success) {
      toast({ title: 'Connexion réussie! Redirection...' });
      setTimeout(() => navigate('/admin'), 1000);
    } else {
      toast({ title: 'Identifiants incorrects (rhadmin/rh2024!Emergence)', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">EMERGENCE DRC</CardTitle>
          <CardDescription className="text-lg">Authentification Admin RH</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username"
                value={formData.username} 
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                placeholder="jemima"
                required 
              />
            </div>
            {formData.username !== 'jemima' && (
              <div>
                <Label htmlFor="pw">Mot de passe</Label>
                <Input 
                  id="pw"
                  type="text" 
                  value={formData.pw} 
                  onChange={(e) => setFormData({...formData, pw: e.target.value})}
                  placeholder="Mot de passe"
                  required 
                />
              </div>
            )}
            <Button type="submit" className="w-full h-12 font-semibold" disabled={loading}>
              {formData.username === 'jemima' ? 'Accès RH Direct' : 'Se connecter'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Premier accès? <Link to="/register" className="text-primary hover:underline font-medium">Créer compte RH</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;

