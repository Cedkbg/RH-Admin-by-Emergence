import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Notification {
  id: string;
  from: string;
  message: string;
  time: string;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  markRead: (id: string) => void;
  addNotification: (notif: Omit<Notification, 'id'>) => string;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {


    const saved = localStorage.getItem('emergence_notifications');
    if (saved) setNotifications(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('emergence_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const generateId = () => `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addNotification = (notifData: Omit<Notification, 'id'>): string => {
    const newNotif: Notification = {
      id: generateId(),
      ...notifData,
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev.slice(0, 9)]); // keep 10
    return newNotif.id;
  };

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? {...n, read: true} : n));
  };


  return (
    <NotificationContext.Provider value={{ notifications, markRead, addNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be within NotificationProvider');
  return context;
};


