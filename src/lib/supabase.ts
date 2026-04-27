import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] Variables d\'environnement manquantes:\n' +
    '  VITE_SUPABASE_URL=' + (supabaseUrl || '❌ NON DÉFINI') + '\n' +
    '  VITE_SUPABASE_ANON_KEY=' + (supabaseAnonKey ? '✅ DÉFINI' : '❌ NON DÉFINI') + '\n' +
    'Créez un fichier .env à la racine avec:\n' +
    '  VITE_SUPABASE_URL=https://votre-projet.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY=votre-cle-anon'
  )
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
