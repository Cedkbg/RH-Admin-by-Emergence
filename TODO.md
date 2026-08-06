# TODO — Bouton « Supprimer une entreprise » sur la page Plateforme

## Étapes
- [x] 1. Backend : ajouter l'action `delete` dans la fonction edge `create-organization/index.ts`
  - [x] Vérifier org introuvable → erreur
  - [x] Protéger `emergence-drc` (organisation principale)
  - [x] Protéger l'organisation de l'admin connecté
  - [x] Récupérer les user_ids des membres / profils
  - [x] Supprimer les comptes `auth.users` via `admin.auth.admin.deleteUser`
  - [x] Supprimer l'organisation (cascade sur les données métier)
- [x] 2. Frontend : ajouter le bouton « Supprimer » + confirmation dans `src/pages/Plateforme.tsx`
  - [x] Importer `Trash2` + composants `AlertDialog`
  - [x] État de suppression (id en cours + cible de confirmation)
  - [x] Bouton « Supprimer » sur chaque carte
  - [x] `AlertDialog` de confirmation
  - [x] Appel de la fonction edge + reload + toast
- [x] 3. Vérification / build
