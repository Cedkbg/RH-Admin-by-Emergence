import bcrypt from 'bcryptjs';

export interface SupabaseUser {
  id: string;
  username: string;
  fullName: string;
  role: 'rh' | 'agent';
  pw_hash: string | null;
  pw: string;
  disabled: boolean;
  created_at: string;
}

let mockUsers: SupabaseUser[] = [];

if (typeof localStorage !== 'undefined') {
  try {
    const saved = localStorage.getItem('mockUsers');
    if (saved) mockUsers = JSON.parse(saved);
  } catch {}
}

// Comptes RH et agents par défaut si vide
if (mockUsers.length === 0) {
  const rhPw = 'rh2024!Emergence';
  const agentPw = 'agent123!';

  // RH principal
  const rhHash = bcrypt.hashSync(rhPw, 10);
mockUsers.push({
    id: 'rh-main',
    username: 'Emergence',
    fullName: 'Admin RH Emergence DRC',
    role: 'rh',
    pw_hash: rhHash,
    pw: rhPw,
    disabled: false,
    created_at: new Date().toISOString()
  });

  // Agents exemples
  const agents = [
    { username: 'agent1', fullName: 'Agent 1 Joy' },
    { username: 'agent2', fullName: 'Agent 2 Forge' },
    { username: 'agent3', fullName: 'Agent 3 People' }
  ];

  for (const ag of agents) {
    const hash = bcrypt.hashSync(agentPw, 10);
    mockUsers.push({
      id: `agent-${ag.username}`,
      username: ag.username,
      fullName: ag.fullName,
      role: 'agent',
      pw_hash: hash,
      pw: agentPw,
      disabled: false,
      created_at: new Date().toISOString()
    });
  }
}

export const localUsersService = {
  async list(): Promise<SupabaseUser[]> {
    return new Promise(resolve => setTimeout(() => resolve(mockUsers), 100));
  },
  async create(userData: Omit<SupabaseUser, 'id' | 'pw_hash' | 'disabled' | 'created_at'>): Promise<string> {
    const pw_hash = bcrypt.hashSync(userData.pw, 10);
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newUser: SupabaseUser = { ...userData, id, pw_hash, disabled: false, created_at: new Date().toISOString(), pw: userData.pw };
    mockUsers.push(newUser);
    localStorage.setItem('mockUsers', JSON.stringify(mockUsers));
    return id;
  },
  async login(username: string, password: string): Promise<SupabaseUser | null> {
    const user = mockUsers.find(u => u.username === username && !u.disabled);
    if (!user) return null;
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
