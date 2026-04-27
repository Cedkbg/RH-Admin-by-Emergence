# TODO — Correction Formulaire Inscription (Register.tsx)

## Problème identifié
Le formulaire d'inscription (`src/pages/Register.tsx`) ne contient aucun champ pour :
- Le **mot de passe**
- La **confirmation du mot de passe**

Tous les nouveaux comptes se voient attribuer un mot de passe hardcodé : `const defaultPassword = 'emergence123!'` — vulnérabilité critique flaguée dans `SECURITY_AUDIT.md` (#2, #7).

## Plan de correction

### Étape 1 — Modifier `src/pages/Register.tsx` ✅
- [x] Ajouter `password` et `confirmPassword` au state `formData`
- [x] Ajouter deux champs `<Input type="password">` dans le formulaire (Mot de passe + Confirmation)
- [x] Ajouter la validation côté client :
  - Minimum 8 caractères
  - Correspondance password / confirmPassword
- [x] Supprimer `const defaultPassword = 'emergence123!'`
- [x] Transmettre le mot de passe saisi par l'utilisateur à `createUser()`
- [x] Remplacer le message trompeur "Votre mot de passe vous sera attribué..." par un message de sécurité

### Étape 2 — Vérifier `src/services/local_users.ts`
- [ ] S'assurer que `DEFAULT_RH_PASSWORD` et `DEFAULT_AGENT_PASSWORD` ne sont utilisés que pour l'initialisation des seeds (quand `mockUsers.length === 0`)
- [ ] Confirmer que `localUsersService.create()` utilise bien `userData.password` (déjà le cas)

### Étape 3 — Vérifier `src/contexts/UsersContext.tsx`
- [ ] Confirmer que `createUser` transmet bien le `password` au service (déjà le cas)

### Étape 4 — Tests
- [ ] Vérifier que le build passe (`bun run build` ou `npm run build`)
- [ ] Vérifier visuellement le formulaire

## Fichiers à modifier
1. `src/pages/Register.tsx` (principal)
2. Aucun autre fichier nécessaire (les services et contextes gèrent déjà le password)

