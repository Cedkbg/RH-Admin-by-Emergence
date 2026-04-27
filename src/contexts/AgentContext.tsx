import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { agentsService, type Employee } from '@/services/supabase/agents';

interface AgentContextType {
  agents: Employee[];
  addAgent: (emp: Omit<Employee, 'id' | 'initials' | 'hiredAt' | 'status' | 'comment'>) => Promise<string>;
  updateAgent: (id: string, updates: Partial<Employee>) => void;
  deleteAgent: (id: string) => void;
}

const AgentContext = createContext<AgentContextType | null>(null);

export const AgentProvider = ({ children }: { children: ReactNode }) => {
  const [agents, setAgents] = useState<Employee[]>([]);

  const refreshAgents = async () => {
    const newAgents = await agentsService.list();
    setAgents(newAgents);
  };

  useEffect(() => {
    refreshAgents();
  }, []);

  const addAgent = async (empData: Omit<Employee, 'id' | 'initials' | 'hiredAt' | 'status'>): Promise<string> => {
    const id = await agentsService.create(empData);
    await refreshAgents();
    return id;
  };

  const updateAgent = async (id: string, updates: Partial<Employee>) => {
    await agentsService.update(id, updates);
    await refreshAgents();
  };

  const deleteAgent = async (id: string) => {
    await agentsService.delete(id);
    await refreshAgents();
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
