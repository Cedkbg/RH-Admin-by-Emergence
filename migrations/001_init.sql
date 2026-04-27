-- ============================================
-- Migration 001 : Initialisation du schéma
-- Emergence DRC — Gestion des agents
-- ============================================

-- 1. Table des directions (organigramme)
CREATE TABLE IF NOT EXISTS directions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  manager_title TEXT NOT NULL DEFAULT 'Gestionnaire',
  color TEXT NOT NULL DEFAULT 'blue',
  icon TEXT NOT NULL DEFAULT 'TrendingUp',
  agent_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table des départements (sous-directions)
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short TEXT NOT NULL,
  module_id TEXT NOT NULL,
  agent_count INTEGER NOT NULL DEFAULT 0,
  icon TEXT NOT NULL DEFAULT 'Cpu',
  color TEXT NOT NULL DEFAULT 'blue',
  direction_id TEXT REFERENCES directions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table des employés / agents
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  direction_id TEXT REFERENCES directions(id),
  department_id TEXT REFERENCES departments(id),
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'actif' CHECK (status IN ('actif', 'suspendu', 'depart')),
  hired_at TIMESTAMPTZ DEFAULT NOW(),
  initials TEXT,
  comment TEXT,
  manager_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table des profils utilisateurs (liée à auth.users de Supabase)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('rh', 'agent', 'manager', 'admin')),
  avatar_url TEXT,
  direction_id TEXT REFERENCES directions(id),
  disabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Index pour performance
CREATE INDEX IF NOT EXISTS idx_employees_direction ON employees(direction_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_departments_direction ON departments(direction_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE directions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Politiques sur employees
CREATE POLICY "employees_select_all"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "employees_insert_rh"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'rh')
  );

CREATE POLICY "employees_update_rh"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'rh')
  );

CREATE POLICY "employees_delete_rh"
  ON employees FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'rh')
  );

-- Politiques sur profiles
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_update_self"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- ============================================
-- FONCTION : Met à jour updated_at automatiquement
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED : Directions par défaut
-- ============================================
INSERT INTO directions (id, code, name, manager_title, color, icon, agent_count)
VALUES
  ('dg', 'DG', 'Direction Générale', 'DG', 'purple', 'TrendingUp', 0),
  ('dga', 'DGA', 'Direction Générale Adjointe', 'DGA', 'indigo', 'TrendingUp', 0),
  ('tech', 'D1', 'Direction Technologie', 'Gestionnaire', 'blue', 'Cpu', 0),
  ('prod', 'D2', 'Direction Produits', 'Gestionnaire', 'green', 'Package', 0),
  ('ops', 'D3', 'Direction Opérations', 'Gestionnaire', 'teal', 'Settings2', 0),
  ('fin', 'D4', 'Direction Financière', 'Gestionnaire', 'indigo', 'TrendingUp', 0),
  ('risk', 'D5', 'Direction Risques', 'Gestionnaire', 'orange', 'ShieldCheck', 0),
  ('cmo', 'D6', 'Direction Commerciale', 'Gestionnaire', 'yellow', 'Megaphone', 0),
  ('rh', 'D7', 'Direction RH', 'Gestionnaire', 'blue', 'Users', 0),
  ('leg', 'D8', 'Direction Juridique', 'Gestionnaire', 'gray', 'Scale', 0)
ON CONFLICT (id) DO NOTHING;

