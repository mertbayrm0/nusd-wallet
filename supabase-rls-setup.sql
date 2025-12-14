-- =============================================
-- NUSD WALLET - RLS (Row Level Security) Setup
-- Supabase SQL Editor'da çalıştır
-- =============================================

-- 1. Admin kullanıcı tanımla
UPDATE profiles SET role = 'admin' WHERE email = 'admin@nusd.com';

-- 2. PROFILES tablosu için RLS AÇ
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. User kendi profilini okuyabilsin
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- 4. User kendi profilini güncelleyebilsin
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- 5. Admin herkesi okuyabilsin
CREATE POLICY "Admins can read all profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- 6. Admin herkesi güncelleyebilsin
CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- 7. Yeni profil oluşturma (signup için)
CREATE POLICY "Allow insert for authenticated users"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- =============================================
-- TRANSACTIONS tablosu için RLS
-- =============================================

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- User kendi işlemlerini görebilsin
CREATE POLICY "Users can read own transactions"
ON transactions FOR SELECT
USING (user_id = auth.uid());

-- User işlem oluşturabilsin
CREATE POLICY "Users can create own transactions"
ON transactions FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Admin tüm işlemleri görebilsin
CREATE POLICY "Admins can read all transactions"
ON transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Admin işlemleri güncelleyebilsin (approve/reject)
CREATE POLICY "Admins can update all transactions"
ON transactions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- =============================================
-- VAULTS tablosu (sadece admin)
-- =============================================

ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage vaults"
ON vaults FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- =============================================
-- DEPARTMENTS tablosu (sadece admin)
-- =============================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage departments"
ON departments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- =============================================
-- BANK_ACCOUNTS tablosu
-- =============================================

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- User kendi hesaplarını yönetebilsin
CREATE POLICY "Users can manage own bank accounts"
ON bank_accounts FOR ALL
USING (user_id = auth.uid());

-- Admin tümünü görebilsin
CREATE POLICY "Admins can read all bank accounts"
ON bank_accounts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- =============================================
-- KONTROL: Admin doğru mu?
-- =============================================

SELECT email, role FROM profiles WHERE email = 'admin@nusd.com';
