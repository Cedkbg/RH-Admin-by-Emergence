import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUsers } from './UsersContext';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isRH: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const usersContext = useUsers();
  const { currentUser } = usersContext;
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(!!currentUser);
  }, [currentUser]);

  const login = (username: string, password: string) => {
    return usersContext.login(username, password);
  };

  const logout = () => {
    usersContext.logout();
  };

  const isRH = currentUser?.role === 'rh';

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, isRH }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

