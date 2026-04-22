import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { localUsersService } from '../local_users';
import type { SupabaseUser } from '../local_users';

// Mock local users - bypass Supabase/DB issues (TS fix)
export const usersService = localUsersService as any;
export type { SupabaseUser };
