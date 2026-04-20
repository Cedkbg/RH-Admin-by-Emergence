import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  username: string;
  fullName: string;
  role: 'rh' | 'agent';
  pw: string;
}

interface UsersContextType {
  users: User[];
  currentUser: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  createUser: (user: Omit<User, 'id'>) => string | null;
}

const UsersContext = createContext<UsersContextType | null>(null);

export const UsersProvider = ({ children }: { children: ReactNode }) => {
const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      username: 'jemima',
      fullName: 'JEMIMA NYEMBWE',
      role: 'rh',
      pw: ''
    }
  ]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  if (users.length > 0 && !currentUser) setCurrentUser(users[0]);

  useEffect(() => {
    const savedUsers = localStorage.getItem('emergence_users');
    const savedUserId = localStorage.getItem('current_user_id');
    if (savedUsers) {
      const parsedUsers = JSON.parse(savedUsers);
      setUsers(parsedUsers);
      if (savedUserId) {
        const user = parsedUsers.find((u: User) => u.id === savedUserId);
        if (user) setCurrentUser(user);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('emergence_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('current_user_id', currentUser.id);
    } else {
      localStorage.removeItem('current_user_id');
    }
  }, [currentUser]);

  const generateId = () => `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const login = (username: string, password: string): boolean => {
    const user = users.find(u => u.username === username && u.pw === password);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const createUser = (userData: Omit<User, 'id'>): string | null => {
    if (!currentUser || currentUser.role !== 'rh') return null;
    const newUser: User = { ...userData, id: generateId() };
    setUsers([...users, newUser]);
    return newUser.id;
  };

  return (
    <UsersContext.Provider value={{ users, currentUser, login, logout, createUser }}>
      {children}
    </UsersContext.Provider>
  );
};

export const useUsers = () => {
  const context = useContext(UsersContext);
  if (!context) throw new Error('useUsers must be used within UsersProvider');
  return context;
};

