import { useEffect } from 'react';
import { useUsers } from '@/contexts/UsersContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const AutoRHLogin = () => {
  const { users } = useUsers();
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (users.length > 0 && !isAuthenticated) {
      const rhUser = users.find(u => u.role === 'rh');
      if (rhUser) {
        login(rhUser.username, rhUser.pw);
      }
    } else if (isAuthenticated) {
      navigate('/admin');
    }
  }, [users, isAuthenticated, login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center space-y-6">
        <div className="w-24 h-24 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl mx-auto animate-spin">
          <Loader2 className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
          ÉMERGENCE RH
        </h1>
        <p className="text-xl text-muted-foreground">
          Connexion automatique RH...
        </p>
      </div>
    </div>
  );
};

export default AutoRHLogin;
