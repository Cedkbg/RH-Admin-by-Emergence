import { useEffect } from 'react';
import { useUsers } from '@/contexts/UsersContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Users, Shield } from 'lucide-react';

const NoPasswordLogin = () => {
  const { users } = useUsers();
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (users.length > 0 && !isAuthenticated) {
      const rhUser = users.find(u => u.role === 'rh');
      if (rhUser) {
        login(rhUser.username, rhUser.pw);
      }
    }
  }, [users, isAuthenticated, login]);

  if (isAuthenticated) {
    navigate('/admin');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center max-w-md space-y-6">
        <div className="w-24 h-24 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl mx-auto">
          <Users className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
          ÉMERGENCE RH
        </h1>
        <p className="text-xl text-muted-foreground">
          Auto-login RH détecté...
        </p>
        <Button size="lg" className="w-full max-w-sm h-14 text-lg shadow-lg">
          <Shield className="w-5 h-5 mr-2" />
          Accès Direct RH
        </Button>
      </div>
    </div>
  );
};

export default NoPasswordLogin;
