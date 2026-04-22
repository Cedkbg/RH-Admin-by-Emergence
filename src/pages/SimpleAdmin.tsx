import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAgent } from '@/contexts/AgentContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { directions } from '@/data/orgData';

import { useState } from 'react';

const SimpleAdmin = () => {
  const { agents, addAgent } = useAgent();
  const { toast } = useToast();
  const { isRH } = useAuth();
  const [formData, setFormData] = useState({ name: '', role: '', directionId: 'tech', email: '' });

  if (!isRH) return <div>Login RH</div>;

  const handleAdd = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.role || !formData.email) return toast({ title: 'Erreur champs', variant: 'destructive' });
    addAgent(formData);
    toast({ title: 'Agent ajouté!' });
    setFormData({ name: '', role: '', directionId: 'tech', email: '' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajout Agent Simple</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <Label>Nom</Label>
            <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          </div>
          <div>
            <Label>Poste</Label>
            <Input value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>
          <div>
            <Label>Direction (tech par défaut)</Label>
            <Input value="tech" readOnly className="bg-muted" />
          </div>
          <Button type="submit" className="w-full">Ajouter Agent</Button>
        </form>
        <div className="mt-8">
          <h3>Agents ({agents.length})</h3>
          {agents.map(a => (
            <Badge key={a.id}>{a.name} - {a.role}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleAdmin;
