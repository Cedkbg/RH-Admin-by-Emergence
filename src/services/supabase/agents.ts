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
  },

  async update(id: string, updates: Partial<Employee>): Promise<void> {
    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.directionId !== undefined) dbUpdates.direction_id = updates.directionId;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.comment !== undefined) dbUpdates.comment = updates.comment;

    const { error } = await supabase
      .from('employees')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('Supabase agents update error:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase agents delete error:', error);
      throw error;
    }
  }
};

export type { Employee };
