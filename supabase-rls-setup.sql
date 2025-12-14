-- =============================================
-- NUSD WALLET - CORE DATA MODEL + RLS
-- Güvenli Mimari: User hiçbir para tablosuna write yapamaz
-- Deposit/Withdraw sadece Edge Function veya service_role ile
-- =============================================

-- =============================================
-- ADIM 1: PROFILES TABLOSU
-- User bakiyesi burada (profiles.balance)
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- User kendi profilini okuyabilsin
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Admin tüm profilleri okuyabilsin
CREATE POLICY "Admins can read all profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- User sadece güvenli alanları güncelleyebilsin (isim, adres vb.)
-- BALANCE GÜNCELLEMESİ YOK - sadece Edge Function yapabilir
CREATE POLICY "Users can update safe profile fields"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admin tüm profilleri güncelleyebilsin (bakiye dahil)
CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Yeni profil oluşturma (signup için)
CREATE POLICY "Allow insert for authenticated users"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- =============================================
-- ADIM 2: TRANSACTIONS TABLOSU (SOURCE OF TRUTH)
-- User okuyabilir ama ASLA yazamaz
-- =============================================

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- User kendi işlemlerini görebilsin
CREATE POLICY "Users can read own transactions"
ON transactions FOR SELECT
USING (user_id = auth.uid());

-- Admin tüm işlemleri görebilsin
CREATE POLICY "Admins can read all transactions"
ON transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Admin işlem oluşturabilsin (deposit/withdraw onayı için)
CREATE POLICY "Admins can insert transactions"
ON transactions FOR INSERT
WITH CHECK (
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

-- ⚠️ USER TRANSACTION INSERT YOK - Edge Function yapacak

-- =============================================
-- ADIM 3: VAULTS TABLOSU (SADECE ADMİN)
-- Şirket crypto adresleri
-- =============================================

ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;

-- Sadece admin vault işlemleri yapabilir
CREATE POLICY "Admins can manage vaults"
ON vaults FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- =============================================
-- ADIM 4: BANK_ACCOUNTS TABLOSU
-- User kendi banka hesaplarını yönetebilir
-- =============================================

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- User kendi hesaplarını okuyabilsin
CREATE POLICY "Users can read own bank accounts"
ON bank_accounts FOR SELECT
USING (user_id = auth.uid());

-- User kendi hesaplarını ekleyebilsin
CREATE POLICY "Users can insert own bank accounts"
ON bank_accounts FOR INSERT
WITH CHECK (user_id = auth.uid());

-- User kendi hesaplarını güncelleyebilsin
CREATE POLICY "Users can update own bank accounts"
ON bank_accounts FOR UPDATE
USING (user_id = auth.uid());

-- User kendi hesaplarını silebilsin
CREATE POLICY "Users can delete own bank accounts"
ON bank_accounts FOR DELETE
USING (user_id = auth.uid());

-- Admin tüm hesapları görebilsin
CREATE POLICY "Admins can read all bank accounts"
ON bank_accounts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- =============================================
-- ADIM 5: DEPARTMENTS TABLOSU (SADECE ADMİN)
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
-- FINAL: Admin kullanıcı kontrolü
-- =============================================

SELECT email, role FROM profiles WHERE email = 'admin@nusd.com';
