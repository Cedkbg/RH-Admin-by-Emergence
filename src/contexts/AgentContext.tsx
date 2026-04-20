import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Employee } from '@/data/orgData';

interface AgentContextType {
  agents: Employee[];
  addAgent: (emp: Omit<Employee, 'id' | 'initials' | 'hiredAt' | 'status' | 'comment'>) => string;
  updateAgent: (id: string, updates: Partial<Employee>) => void;
  deleteAgent: (id: string) => void;
}

const AgentContext = createContext<AgentContextType | null>(null);

export const AgentProvider = ({ children }: { children: ReactNode }) => {
  const [agents, setAgents] = useState<Employee[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('emergence_agents');
    if (saved) {
      setAgents(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('emergence_agents', JSON.stringify(agents));
  }, [agents]);

  const generateId = () => `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addAgent = (empData: Omit<Employee, 'id' | 'initials' | 'hiredAt' | 'status'>): string => {
    const dir = directions.find(d => d.id === empData.directionId);
    const nameParts = empData.name.trim().split(' ');
    const initials = (nameParts[0] ? nameParts[0][0] : '') + (nameParts[1] ? nameParts[1][0] : '');
    const newAgent: Employee = {
      id: generateId(),
      ...empData,
      initials: initials.toUpperCase(),
      hiredAt: new Date().toISOString().split('T')[0],
      status: 'actif' as const,
      comment: '',
    };
    const newAgents = [...agents, newAgent];
    setAgents(newAgents);
    return newAgent.id;
  };

  const updateAgent = (id: string, updates: Partial<Employee>) => {
    setAgents(agents.map(a => a.id === id ? {...a, ...updates} : a));
  };

  const deleteAgent = (id: string) => {
    setAgents(agents.filter(a => a.id !== id));
  };

  return (
    <AgentContext.Provider value={{ agents, addAgent, updateAgent, deleteAgent }}>
      {children}
    </AgentContext.Provider>
  );
};

export const useAgent = () => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgent must be used within AgentProvider');
  }
  return context;
};

