# Backend Fixes — DONE ✅

## Problème 1 : Mots de passe en clair
- [x] `local_users.ts` — champ `pw` supprimé, `DEFAULT_RH_PASSWORD` exporté
- [x] `mockUsers.json` — regénéré sans `pw`
- [x] `Index.tsx`, `AutoRHLogin.tsx`, `NoPasswordLogin.tsx` — utilisent la constante
- [x] `Login.tsx` — `pw` → `password`
- [x] `Register.tsx` — `pw` → `password`
- [x] `UsersContext.tsx` — interface et mutations adaptées
- [x] `seedUsers.ts` — corrigé

## Problème 2 : Variables d'environnement non validées
- [x] `supabase.ts` — alerte console + instructions `.env` si manquant

## Problème 3 : CRUD Agents incomplet
- [x] `agents.ts` — `update()` et `delete()` implémentés
- [x] `AgentContext.tsx` — branché sur Supabase (plus de TODO)

## Problème 4 : Auth mockée → Supabase Auth
- [x] `auth.ts` — service créé (signUp, signIn, signOut, getSession, getProfile)
- [x] `001_init.sql` — table `profiles` liée à `auth.users`

## Problème 5 : Schéma SQL manquant
- [x] `migrations/001_init.sql` — tables `directions`, `departments`, `employees`, `profiles`
- [x] Index créés, RLS activé, policies définies, triggers `updated_at`

## Problème 6 : Sécurité supplémentaire
- [x] `rateLimit.ts` — 5 tentatives / 15min, lockout 30min
- [x] Branché dans `UsersContext.tsx` sur la méthode `login`

