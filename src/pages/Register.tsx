import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUsers } from '@/contexts/UsersContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({ username: '', fullName: '', role: 'rh' as 'rh' | 'agent' });
  const [loading, setLoading] = useState(false);
  const { createUser, users } = useUsers();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userId = await createUser({
        username: formData.username,
        fullName: formData.fullName,
        role: formData.role,
        pw: 'emergence123!'
      });
      if (userId) {
        toast({ title: `Compte ${formData.role.toUpperCase()} créé! Mot de passe: emergence123!` });
        const success = await login(formData.username, 'emergence123!');
        if (success) {
          setTimeout(() => navigate('/admin'), 500);
        }
      } else {
        toast({ 
          title: 'RH existe! Login rhadmin / rh2024!Emergence ou allez /debug', 
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
              <Label>Username</Label>
              <Input value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required />
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
            <Button type="submit" className="w-full" disabled={loading}>
              Créer & Connecter
            </Button>
            <div className="text-xs text-muted-foreground mt-4 p-3 bg-blue-50 rounded">
              💡 RH auto: rhadmin / rh2024!Emergence (http://localhost:8080/login)
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
