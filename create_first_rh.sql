-- Exécutez DANS Supabase Dashboard > SQL Editor pour créer 1er RH
-- Remplacez 'votre_nom' et 'rhadmin'

INSERT INTO users (username, fullName, role, pw_hash, disabled) 
VALUES (
  'rhadmin', 
  'Admin RH Emergence', 
  'rh', 
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',  -- hash de 'password'
  false
);

-- Login: rhadmin / password
-- Puis changez PW via app
