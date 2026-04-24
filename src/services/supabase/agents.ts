import { supabase } from '@/lib/supabase';
import type { Employee } from '@/data/orgData';

export const agentsService = {
  async list(): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Supabase employees list error:', error);
      return []; // Fallback
    }
    
    return data || [];
  },

  async create(empData: Omit<Employee, 'id' | 'initials' | 'hiredAt' | 'status' | 'comment'>): Promise<string> {
    const nameParts = empData.name.trim().split(' ');
    const initials = (nameParts[0]?.[0] || '') + (nameParts[1]?.[0] || '');
    
    const newAgent = {
      name: empData.name,
      role: empData.role,
      direction_id: empData.directionId,
      email: empData.email,
      status: 'actif',
      hired_at: new Date().toISOString(),
      initials: initials.toUpperCase(),
      comment: ''
    };

    const { data, error } = await supabase
      .from('employees')
      .insert(newAgent)
      .select()
      .single();

    if (error) {
      console.error('Supabase agents create error:', error);
      throw error;
    }
    
    return data.id;
  }
};

export type { Employee };
