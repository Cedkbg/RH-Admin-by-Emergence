import { localUsersService } from '../local_users';
import type { SupabaseUser } from '../local_users';

// Export typé du service local (mock) — à remplacer par Supabase Auth plus tard
export const usersService = localUsersService;
export type { SupabaseUser };

