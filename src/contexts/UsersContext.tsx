import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService, type SupabaseUser } from '@/services/supabase/users';
import { checkRateLimit, resetRateLimit } from '@/lib/rateLimit';

type User = SupabaseUser;

interface UsersContextType {
  users: User[];
  currentUser: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  createUser: (userData: { username: string; fullName: string; role: 'rh' | 'agent'; password: string }) => Promise<string | null>;
  toggleUserDisabled: (userId: string) => void;
  changeUserPw: (userId: string, newPw: string) => void;
}

const UsersContext = createContext<UsersContextType | null>(null);

export const UsersProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: usersService.list,
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUserId = localStorage.getItem('current_user_id');
    if (savedUserId && users.length > 0) {
      const user = users.find((u) => u.id === savedUserId);
      if (user) {
        setCurrentUser(user);
      }
    }
  }, [users]);

  const login = async (username: string, password: string): Promise<boolean> => {
    const rate = checkRateLimit(username);
    if (!rate.allowed) {
      console.warn(`[RateLimit] Compte ${username} bloqué — réessayez dans ${rate.lockoutSeconds}s`);
      return false;
    }

    try {
      const user = await usersService.login(username, password);
      if (user) {
        resetRateLimit(username);
        setCurrentUser(user);
        localStorage.setItem('current_user_id', user.id);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('current_user_id');
  };

  const createMutation = useMutation<string, Error, { username: string; fullName: string; role: 'rh' | 'agent'; password: string }>({
    mutationFn: (userData) => usersService.create(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const toggleMutation = useMutation<void, Error, string>({
    mutationFn: (id) => usersService.toggleDisabled(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const createUser = async (userData: { username: string; fullName: string; role: 'rh' | 'agent'; password: string }): Promise<string | null> => {
    const hasRH = users.some(u => u.role === 'rh');
    if ((users.length === 0 || !hasRH) && userData.role === 'rh' || (currentUser?.role === 'rh')) {
      try {
        const id = await createMutation.mutateAsync(userData);
        return id;
      } catch {
        return null;
      }
    } else {
      return null;
    }
  };

  const toggleUserDisabled = (userId: string) => {
    toggleMutation.mutate(userId);
    if (currentUser?.id === userId) logout();
  };

  const changeUserPw = () => {
    // Stub - implémenter plus tard
  };

  return (
    <UsersContext.Provider value={{ users, currentUser, login, logout, createUser, toggleUserDisabled, changeUserPw }}>
      {children}
    </UsersContext.Provider>
  );
};

export const useUsers = () => {
  const context = useContext(UsersContext);
  if (!context) throw new Error('useUsers must be used within UsersProvider');
  return context;
};

