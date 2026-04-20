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
  const [formData, setFormData] = useState({ username: '', fullName: '', pw: '', role: 'rh' as const });
  const [loading, setLoading] = useState(false);
  const { createUser } = useUsers();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const userId = createUser({
      username: formData.username,
      fullName: formData.fullName,
      role: formData.role,
      pw: formData.pw
    });
    if (userId) {
      toast({ title: 'Compte RH créé!' });
      // Auto login
      if (login(formData.username, formData.pw)) {
        navigate('/admin');
      }
    } else {
      toast({ title: 'Erreur création', variant: 'destructive' });
    }
    setLoading(false);
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
              <Input value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} />
            </div>
            <div>
              <Label>Nom complet</Label>
              <Input value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} />
            </div>
            <div>
              <Label>Mot de passe</Label>
              <Input type="password" value={formData.pw} onChange={(e) => setFormData({...formData, pw: e.target.value})} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              Créer & Connecter
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;

