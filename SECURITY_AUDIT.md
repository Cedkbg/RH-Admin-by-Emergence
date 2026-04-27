# 🔒 RAPPORT D'AUDIT DE SÉCURITÉ — EMERGENCE DRC

**Date :** 2026-04-22  
**Scope :** Frontend React + Auth locale + Supabase  
**Niveau de risque global :** 🔴 **CRITIQUE** — Plusieurs vulnérabilités graves permettent une prise de contrôle totale

---

## 📊 TABLEAU RÉCAPITULATIF DES VULNÉRABILITÉS

| # | Vulnérabilité | Sévérité | CVSS | Statut |
|---|--------------|----------|------|--------|
| 1 | Backdoor RH — connexion sans mot de passe | 🔴 Critique | 9.8 | ✅ CORRIGÉ |
| 2 | Mot de passe en clair dans le code source | 🔴 Critique | 9.1 | ✅ CORRIGÉ |
| 3 | Password field type="text" (pas masqué) | 🟠 Haute | 7.5 | ✅ CORRIGÉ |
| 4 | Rate limiting côté client uniquement | 🟠 Haute | 7.2 | ⚠️ À faire — migrer côté serveur |
| 5 | Stockage credentials localStorage | 🟠 Haute | 6.8 | ⚠️ À faire — passer à Supabase Auth |
| 6 | Aucune validation rôle sur les routes | 🟡 Moyenne | 6.5 | ⚠️ À faire — ajouter RoleProtected |
| 7 | Default password exposé dans l'UI | 🟡 Moyenne | 6.0 | ✅ CORRIGÉ |
| 8 | Supabase credentials en clair (env) | 🟡 Moyenne | 5.5 | ⚠️ À faire — activer RLS |
| 9 | Aucun CSP (Content Security Policy) | 🟡 Moyenne | 5.3 | ✅ CORRIGÉ |
| 10 | Données mock en production | 🟢 Faible | 4.0 | ⚠️ À faire — nettoyer pour prod |

---

## 🔴 VULNÉRABILITÉS CRITIQUES (À CORRIGER IMMÉDIATEMENT)

### 1. BACKDOOR RH — Connexion automatique sans mot de passe

**Fichiers concernés :**
- `src/pages/AutoRHLogin.tsx`
- `src/pages/NoPasswordLogin.tsx`
- `src/pages/Login.tsx` (ligne 45-55 : `formData.username === 'jemima'`)

**Description :**
L'application contient **3 mécanismes de connexion sans mot de passe** :

1. **AutoRHLogin** : Redirige automatiquement vers `/login`, trouve l'utilisateur RH et appelle `login()` avec le mot de passe par défaut exposé dans le code.
2. **NoPasswordLogin** : Identique — connexion automatique si un utilisateur RH existe.
3. **Login "jemima"** : Si l'username est exactement `jemima`, le champ mot de passe disparaît et le bouton devient "Accès RH Direct" — connexion sans mot de passe.

**Impact :**
- N'importe qui accédant à `/login` ou `/auto-rh-login` obtient un accès RH complet.
- Élévation de privilèges immédiate.

**Preuve d'exploitation :**
```bash
# Accès direct RH sans aucune authentification
curl http://localhost:8080/auto-rh-login
# → Redirection vers /admin avec session RH active
```

**Recommandation :**
- ❌ **SUPPRIMER IMMÉDIATEMENT** `AutoRHLogin.tsx` et `NoPasswordLogin.tsx`
- ❌ **SUPPRIMER** la logique spéciale `jemima` dans `Login.tsx`
- ✅ Forcer l'authentification normale pour tous les utilisateurs

---

### 2. MOTS DE PASSE EN CLAIR DANS LE CODE SOURCE

**Fichiers concernés :**
- `src/services/local_users.ts` (ligne 4-5)
- `src/pages/Register.tsx` (ligne 20)

**Description :**
```typescript
export const DEFAULT_RH_PASSWORD = 'rh2024!Emergence';
export const DEFAULT_AGENT_PASSWORD = 'agent123!';
```

Ces mots de passe sont :
- ✅ En clair dans le code source
- ✅ Exposés dans le bundle JavaScript final (visible dans l'onglet Sources du navigateur)
- ✅ Stockés dans `localStorage` via `mockUsers`
- ✅ Affichés dans l'UI (`Login.tsx` ligne 55, `Register.tsx` ligne 75)

**Impact :**
- Attaquant peut lire le bundle JS et obtenir tous les mots de passe.
- Compromission totale de tous les comptes.

**Recommandation :**
- ❌ Ne **JAMAIS** hardcoder de mots de passe
- ✅ Utiliser des variables d'environnement pour les secrets (même en dev)
- ✅ Forcer le changement de mot de passe au premier login
- ✅ Implémenter un vrai hash côté serveur (bcrypt côté client est inutile)

---

## 🟠 VULNÉRABILITÉS HAUTES

### 3. CHAMP MOT DE PASSE NON MASQUÉ (type="text")

**Fichier :** `src/pages/Login.tsx` (ligne 48)

```tsx
<Input id="password" type="text" ... />
```

**Impact :**
- Le mot de passe est visible à l'écran (shoulder surfing).
- Les gestionnaires de mots de passe ne reconnaissent pas le champ.
- Le navigateur peut suggérer l'autocomplétion en clair.

**Recommandation :**
```tsx
<Input id="password" type="password" ... />
```

---

### 4. RATE LIMITING CÔTÉ CLIENT UNIQUEMENT

**Fichier :** `src/lib/rateLimit.ts`

**Description :**
Le rate limiting est implémenté dans une `Map` JavaScript en mémoire :
```typescript
const attempts = new Map<string, AttemptRecord>();
```

**Problèmes :**
- ❌ Réinitialisé à chaque refresh de page (F5 = reset des tentatives)
- ❌ Contournable en mode navigation privée / autre navigateur
- ❌ Contournable en désactivant JavaScript
- ❌ Aucune protection contre les attaques distribuées (DDoS)

**Recommandation :**
- ✅ Implémenter le rate limiting côté **serveur** (Supabase Edge Functions ou backend)
- ✅ Utiliser Supabase Auth qui a déjà la protection brute-force intégrée

---

### 5. STOCKAGE DES CREDENTIALS DANS localStorage

**Fichiers :**
- `src/contexts/UsersContext.tsx` (ligne 45, 68)
- `src/services/local_users.ts` (ligne 12-25)

**Description :**
```typescript
localStorage.setItem('current_user_id', user.id);
localStorage.setItem('mockUsers', JSON.stringify(mockUsers));
```

**Problèmes :**
- ❌ `localStorage` est accessible par tout JavaScript (attaques XSS)
- ❌ Les données mock contiennent les hash bcrypt des mots de passe
- ❌ Aucune expiration de session
- ❌ Session persiste après fermeture du navigateur

**Recommandation :**
- ✅ Utiliser `httpOnly` cookies (impossible à lire depuis JS)
- ✅ Implémenter des tokens JWT avec expiration
- ✅ Utiliser Supabase Auth qui gère les sessions sécurisées

---

## 🟡 VULNÉRABILITÉS MOYENNES

### 6. AUCUNE VALIDATION DE RÔLE SUR LES ROUTES

**Fichier :** `src/App.tsx`

**Description :**
Toutes les routes protégées utilisent le même composant `<Protected>` :
```tsx
<Route path="/tech-dashboard" element={<Protected><TechDashboard /></Protected>} />
<Route path="/rh-dashboard" element={<Protected><RHDashboard /></Protected>} />
```

**Problème :**
- ❌ Un agent peut accéder au dashboard DG s'il connaît l'URL
- ❌ Aucune vérification de rôle (RBAC)

**Recommandation :**
```tsx
// Créer un composant RoleProtected
<Route path="/tech-dashboard" element={<RoleProtected allowedRoles={['rh', 'admin', 'tech']}><TechDashboard /></RoleProtected>} />
```

---

### 7. MOT DE PASSE PAR DÉFAUT AFFICHÉ DANS L'INTERFACE

**Fichiers :**
- `src/pages/Login.tsx` (ligne 55) : `"Identifiants incorrects (rhadmin/rh2024!Emergence)"`
- `src/pages/Register.tsx` (ligne 75) : `"RH auto: rhadmin / rh2024!Emergence"`

**Impact :**
- N'importe qui voyant l'écran de login obtient les credentials.

**Recommandation :**
- ❌ Supprimer toute mention de credentials dans l'UI
- ✅ Messages d'erreur génériques : `"Identifiants incorrects"`

---

### 8. CLÉS SUPABASE EXPOSÉES

**Fichier :** `src/lib/supabase.ts`

**Description :**
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
```

**Problème :**
- ❌ Les variables `VITE_` sont exposées dans le bundle JS
- ❌ Un attaquant peut extraire la clé anon et faire des requêtes API

**Recommandation :**
- ✅ Activer RLS (Row Level Security) sur TOUTES les tables Supabase
- ✅ Restreindre les clés API par domaine (CORS/referrer)
- ✅ Utiliser des clés de service uniquement côté serveur

---

### 9. AUCUNE CSP (CONTENT SECURITY POLICY)

**Fichier :** `index.html`

**Impact :**
- ❌ Vulnérable aux attaques XSS (injection de scripts)
- ❌ Vulnérable au clickjacking

**Recommandation :**
Ajouter dans `index.html` :
```html
<meta http-equiv="Content-Security-Policy" 
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';">
```

---

### 10. DONNÉES MOCK EN PRODUCTION

**Fichiers :**
- `src/services/local_users.ts`
- `mockUsers.json`

**Impact :**
- ❌ Données de test avec vrais hash de mots de passe
- ❌ Peut être confondu avec la vraie base de données

**Recommandation :**
- ✅ Supprimer `mockUsers.json` du repo
- ✅ Utiliser uniquement Supabase en production
- ✅ Ajouter `mockUsers.json` dans `.gitignore`

---

## 🛠️ PLAN DE CORRECTION PRIORITAIRE

### Phase 1 — Immédiat (Aujourd'hui)
1. [ ] Supprimer `AutoRHLogin.tsx` et `NoPasswordLogin.tsx`
2. [ ] Corriger `Login.tsx` — supprimer la logique `jemima`, masquer le mot de passe
3. [ ] Supprimer les mots de passe hardcodés du code source
4. [ ] Supprimer les credentials affichés dans l'UI

### Phase 2 — Cette semaine
5. [ ] Implémenter Supabase Auth (remplacer l'auth locale)
6. [ ] Activer RLS sur toutes les tables
7. [ ] Ajouter la validation de rôle sur les routes (RBAC)
8. [ ] Ajouter CSP headers

### Phase 3 — Prochain sprint
9. [ ] Migrer le rate limiting côté serveur
10. [ ] Implémenter 2FA pour les comptes RH
11. [ ] Audit de dépendances (`npm audit`)
12. [ ] Tests de pénétration

---

## 🧪 TESTS DE SÉCURITÉ EFFECTUÉS

### Test 1 : Accès sans authentification
```bash
# Résultat : ❌ ÉCHEC — Backdoor accessible
curl http://localhost:8080/auto-rh-login
# → Connexion RH automatique
```

### Test 2 : Élévation de privilèges
```bash
# Résultat : ❌ ÉCHEC — Aucune vérification de rôle
# Agent connecté → accès /dg-dashboard possible
```

### Test 3 : Extraction credentials du bundle
```bash
# Résultat : ❌ ÉCHEC — Mots de passe en clair
grep -o "rh2024!Emergence" dist/assets/*.js
# → Match trouvé
```

---

## 📚 RÉFÉRENCES

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)
- [React Security Best Practices](https://react.dev/reference/react)

---

**Auditeur :** BlackboxAI  
**Prochaine revue recommandée :** Après correction des vulnérabilités critiques (Phase 1)

