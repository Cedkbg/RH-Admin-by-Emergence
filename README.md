# RH Admin

Application RH construite avec Next.js, PostgreSQL, Prisma et Nodemailer. L'interface React existante est conservée pendant la migration des services historiques.

## Environnement local

1. Vérifier que PostgreSQL est démarré sous Windows.
2. Copier `.env.example` en `.env`, renseigner le mot de passe PostgreSQL et définir `AUTH_SECRET` avec une valeur aléatoire.
3. Créer une base vide `rh_admin` avec le compte PostgreSQL local.
4. Installer les dépendances : `npm install`.
5. Générer le client : `npm run prisma:generate`.
6. Valider le modèle : `npm run prisma:validate`.
7. Démarrer Next.js : `npm run dev` puis ouvrir `http://localhost:3000`.

## Base de données

`prisma/schema.prisma` est le modèle cible PostgreSQL. Le schéma fourni est encore en cours de reconstruction à partir des anciennes migrations; ne lance pas `npm run prisma:migrate` avant que les modèles et leur validation soient terminés.

Les fichiers `database/migrations/*.sql` sont un historique hérité et ne sont pas exécutés automatiquement par Prisma. Ils sont conservés pour référence pendant le remplacement des anciennes fonctions serveur.
