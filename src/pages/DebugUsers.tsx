import { useUsers } from '@/contexts/UsersContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function DebugUsers() {
  const { users, login, currentUser } = useUsers();

  const handleForceRH = async () => {
    const success = await login('rhadmin', 'rh2024!Emergence');
    console.log('Force RH login:', success);
    alert(success ? 'RH connecté!' : 'Échec - vérifiez console');
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto mt-8">
      <h1 className="text-2xl font-bold mb-4">🔧 DEBUG Users ({users.length})</h1>
      <pre className="bg-gray-100 p-4 rounded mb-4 overflow-auto text-xs">
{JSON.stringify(users, null, 2)}
      </pre>
      <div className="space-y-2">
        <Button onClick={handleForceRH} className="w-full mb-2">
          🚀 Force Login RH (rhadmin)
        </Button>
        <Button onClick={() => localStorage.clear()} variant="destructive" className="w-full">
          🗑️ Vider localStorage & Retry
        </Button>
        <Button onClick={() => location.reload()} className="w-full">
          🔄 Hard Refresh
        </Button>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Current: {currentUser ? `${currentUser.username} (${currentUser.role})` : 'Non connecté'}
      </p>
    </Card>
  );
}
