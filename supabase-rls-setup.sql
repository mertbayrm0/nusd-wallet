-- =============================================
-- NUSD WALLET — RLS (Row Level Security) FINAL
-- ADIM 3: Güvenli mimari aktivasyonu
-- =============================================

-- ⚠️ ÖNCEKİ POLİCY'LERİ SİL (varsa)
DROP POLICY IF EXISTS "Users read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update safe profile fields" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON profiles;

DROP POLICY IF EXISTS "Users read own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can read own transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can read all transactions" ON transactions;
DROP POLICY IF EXISTS "Users can create own transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can update all transactions" ON transactions;

DROP POLICY IF EXISTS "Admins can manage vaults" ON vaults;

DROP POLICY IF EXISTS "User manages own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can read own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can insert own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can update own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can delete own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Admins can read all bank accounts" ON bank_accounts;

DROP POLICY IF EXISTS "Admins can manage departments" ON departments;

-- =============================================
-- 1️⃣ PROFILES (User sadece kendi profilini okur)
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- User yazma işlemi YASAK (Edge Function yapacak)
REVOKE UPDATE, INSERT, DELETE ON profiles FROM anon, authenticated;

-- =============================================
-- 2️⃣ TRANSACTIONS (User sadece kendi işlemlerini okur)
-- =============================================

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own transactions"
ON transactions FOR SELECT
USING (auth.uid() = user_id);

-- User yazma işlemi YASAK (Edge Function yapacak)
REVOKE INSERT, UPDATE, DELETE ON transactions FROM anon, authenticated;

-- =============================================
-- 3️⃣ VAULTS (Sadece Admin / service_role)
-- =============================================

ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;

-- Tüm erişim kapalı (service_role hariç)
REVOKE ALL ON vaults FROM anon, authenticated;

-- =============================================
-- 4️⃣ BANK_ACCOUNTS (User kendi hesaplarını yönetir)
-- =============================================

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User manages own bank accounts"
ON bank_accounts FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 5️⃣ DEPARTMENTS (Opsiyonel - herkese okuma)
-- =============================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read departments"
ON departments FOR SELECT
USING (true);

-- Yazma admin veya service_role ile
REVOKE INSERT, UPDATE, DELETE ON departments FROM anon, authenticated;

-- =============================================
-- ✅ KONTROL: Admin yetkisi
-- =============================================

SELECT email, role FROM profiles WHERE role = 'admin';
