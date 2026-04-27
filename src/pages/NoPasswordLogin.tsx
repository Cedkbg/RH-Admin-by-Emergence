// ⚠️ FICHIER DÉSACTIVÉ POUR SÉCURITÉ
// Voir SECURITY_AUDIT.md — Backdoor de connexion automatique supprimé
// Utiliser /login pour l'authentification normale

const NoPasswordLogin = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600">Accès désactivé</h1>
        <p className="mt-2 text-gray-600">Cette page a été désactivée pour des raisons de sécurité.</p>
        <a href="/login" className="mt-4 inline-block text-blue-600 hover:underline">
          Aller à la page de connexion
        </a>
      </div>
    </div>
  );
};

export default NoPasswordLogin;

