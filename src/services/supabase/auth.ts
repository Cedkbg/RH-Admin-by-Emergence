import { supabase } from '@/lib/supabase';

export interface AuthProfile {
  id: string;
  username: string;
  full_name: string;
  role: 'rh' | 'agent' | 'manager' | 'admin';
  avatar_url?: string;
  direction_id?: string;
  disabled: boolean;
  created_at: string;
}

export const authService = {
  async signUp(email: string, password: string, profile: Omit<AuthProfile, 'id' | 'created_at' | 'disabled'>) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      throw authError || new Error('Inscription échouée');
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        username: profile.username,
        full_name: profile.full_name,
        role: profile.role,
        direction_id: profile.direction_id,
        disabled: false,
      });

    if (profileError) {
      console.error('Erreur création profil:', profileError);
    }

    return authData.user;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      throw error || new Error('Connexion échouée');
    }

    return data.user;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getProfile(userId: string): Promise<AuthProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Erreur chargement profil:', error);
      return null;
    }

    return data as AuthProfile;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

