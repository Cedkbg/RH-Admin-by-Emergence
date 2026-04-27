import bcrypt from 'bcryptjs';

// ⚠️ MOTS DE PASSE PAR DÉFAUT — À CHANGER IMMÉDIATEMENT APRÈS PREMIÈRE CONNEXION
// Vite utilise import.meta.env, pas process.env
const DEFAULT_RH_PASSWORD = import.meta.env.VITE_DEFAULT_RH_PASSWORD || 'ChangeMeImmediately!';
const DEFAULT_AGENT_PASSWORD = import.meta.env.VITE_DEFAULT_AGENT_PASSWORD || 'ChangeMeImmediately!';

export interface SupabaseUser {
  id: string;
  username: string;
  fullName: string;
  role: 'rh' | 'agent';
  pw_hash: string | null;
  disabled: boolean;
  created_at: string;
}

let mockUsers: SupabaseUser[] = [];

if (typeof localStorage !== 'undefined') {
  try {
    const saved = localStorage.getItem('mockUsers');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration : retirer le champ pw s'il existe encore
      mockUsers = parsed.map((u: any) => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        pw_hash: u.pw_hash,
        disabled: u.disabled ?? false,
        created_at: u.created_at,
      }));
    }
  } catch {}
}

// Comptes RH et agents par défaut si vide
if (mockUsers.length === 0) {
  const rhHash = bcrypt.hashSync(DEFAULT_RH_PASSWORD, 10);
  mockUsers.push({
    id: 'rh-main',
    username: 'Emergence',
    fullName: 'Admin RH Emergence DRC',
    role: 'rh',
    pw_hash: rhHash,
    disabled: false,
    created_at: new Date().toISOString()
  });

  const agents = [
    { username: 'agent1', fullName: 'Agent 1 Joy' },
    { username: 'agent2', fullName: 'Agent 2 Forge' },
    { username: 'agent3', fullName: 'Agent 3 People' }
  ];

  for (const ag of agents) {
    const hash = bcrypt.hashSync(DEFAULT_AGENT_PASSWORD, 10);
    mockUsers.push({
      id: `agent-${ag.username}`,
      username: ag.username,
      fullName: ag.fullName,
      role: 'agent',
      pw_hash: hash,
      disabled: false,
      created_at: new Date().toISOString()
    });
  }
  localStorage.setItem('mockUsers', JSON.stringify(mockUsers));
}

export const localUsersService = {
  async list(): Promise<SupabaseUser[]> {
    return new Promise(resolve => setTimeout(() => resolve(mockUsers), 100));
  },

  async create(userData: { username: string; fullName: string; role: 'rh' | 'agent'; password: string }): Promise<string> {
    const pw_hash = bcrypt.hashSync(userData.password, 10);
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newUser: SupabaseUser = {
      id,
      username: userData.username,
      fullName: userData.fullName,
      role: userData.role,
      pw_hash,
      disabled: false,
      created_at: new Date().toISOString(),
    };
    mockUsers.push(newUser);
    localStorage.setItem('mockUsers', JSON.stringify(mockUsers));
    return id;
  },

  async login(username: string, password: string): Promise<SupabaseUser | null> {
    const user = mockUsers.find(u => u.username === username && !u.disabled);
    if (!user) return null;
    // Si aucun mot de passe n'est fourni, connexion sans vérification du hash
    if (!password) return user;
    const valid = bcrypt.compareSync(password, user.pw_hash || '');
    return valid ? user : null;
  },

  async toggleDisabled(id: string): Promise<void> {
    const user = mockUsers.find(u => u.id === id);
    if (user) {
      user.disabled = !user.disabled;
      localStorage.setItem('mockUsers', JSON.stringify(mockUsers));
    }
  }
};

