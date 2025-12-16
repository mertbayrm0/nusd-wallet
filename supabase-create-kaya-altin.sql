-- =============================================
-- KAYA ALTIN FİRMA HESABI OLUŞTURMA
-- Adım adım çalıştırın (Supabase SQL Editor'de)
-- =============================================

-- ⚠️ ÖNEMLİ: Bu script 2 aşamada çalıştırılmalı!
-- AŞAMA 1: Auth kullanıcısı + Department oluştur
-- AŞAMA 2: Profile'ı business olarak güncelle

-- =============================================
-- AŞAMA 1: Department ve Auth User Oluştur
-- =============================================

-- 1️⃣ Önce Department oluştur
INSERT INTO departments (name, category, commission_mode, commission_value, is_active, color)
VALUES ('Kaya Altın', 'jewelry', 'percentage', 0, true, '#FFD700')
ON CONFLICT DO NOTHING;

-- Department ID'yi kontrol et
SELECT id, name FROM departments WHERE name = 'Kaya Altın';

-- 2️⃣ Auth kullanıcısı oluştur (Admin Auth API ile)
-- Supabase Dashboard > Authentication > Users > Add User
-- Email: kayaaltin@nusd.com
-- Password: 1234
-- Auto Confirm: ✓ (işaretli olsun)

-- =============================================
-- AŞAMA 2: Auth user oluşturduktan sonra çalıştır
-- =============================================

-- 3️⃣ Profile'ı business account olarak güncelle ve banka hesabı ekle
DO $$
DECLARE
  v_user_id UUID;
  v_dept_id UUID;
  v_iban TEXT;
BEGIN
  -- Department ID'yi al
  SELECT id INTO v_dept_id FROM departments WHERE name = 'Kaya Altın' LIMIT 1;
  
  -- User ID'yi al (email ile)
  SELECT id INTO v_user_id FROM profiles WHERE email = 'kayaaltin@nusd.com' LIMIT 1;
  
  IF v_user_id IS NOT NULL AND v_dept_id IS NOT NULL THEN
    -- Profile'ı business account olarak güncelle
    UPDATE profiles 
    SET 
      name = 'Kaya Altın',
      account_type = 'business',
      business_name = 'Kaya Altın',
      business_department_id = v_dept_id,
      balance = 0
    WHERE id = v_user_id;
    
    -- Department'ın sahibini ayarla
    UPDATE departments 
    SET owner_id = v_user_id 
    WHERE id = v_dept_id;
    
    -- Rastgele IBAN oluştur (Türkiye formatı: TR + 2 check digit + 5 bank code + 1 reserve + 16 account)
    v_iban := 'TR' || LPAD(FLOOR(RANDOM() * 100)::TEXT, 2, '0') || 
              '00064' || -- İş Bankası kodu
              '0' || 
              LPAD(FLOOR(RANDOM() * 10000000000000000)::TEXT, 16, '0');
    
    -- Banka hesabı ekle
    INSERT INTO bank_accounts (user_id, bank_name, iban, account_name)
    VALUES (
      v_user_id, 
      'Türkiye İş Bankası', 
      v_iban,
      'KAYA ALTIN TİCARET A.Ş.'
    )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ Kaya Altın firma hesabı başarıyla oluşturuldu!';
    RAISE NOTICE '   User ID: %', v_user_id;
    RAISE NOTICE '   Department ID: %', v_dept_id;
    RAISE NOTICE '   IBAN: %', v_iban;
  ELSE
    IF v_user_id IS NULL THEN
      RAISE NOTICE '❌ Kullanıcı bulunamadı! Önce Supabase Dashboard > Authentication > Users kısmından';
      RAISE NOTICE '   Email: kayaaltin@nusd.com ile kullanıcı oluşturun.';
    END IF;
    IF v_dept_id IS NULL THEN
      RAISE NOTICE '❌ Department bulunamadı! Önce AŞAMA 1 scriptini çalıştırın.';
    END IF;
  END IF;
END $$;

-- =============================================
-- KONTROL SORGULARI
-- =============================================

-- Firma profilini kontrol et
SELECT 
  '👤 Profile' as info,
  p.id,
  p.email,
  p.name,
  p.account_type,
  p.business_name,
  p.balance,
  p.business_department_id
FROM profiles p
WHERE p.email = 'kayaaltin@nusd.com';

-- Firma departmanını kontrol et
SELECT 
  '🏢 Department' as info,
  d.id,
  d.name,
  d.category,
  d.owner_id,
  d.is_active,
  d.color
FROM departments d
WHERE d.name = 'Kaya Altın';

-- Banka hesabını kontrol et
SELECT 
  '🏦 Bank Account' as info,
  b.id,
  b.bank_name,
  b.iban,
  b.account_name
FROM bank_accounts b
JOIN profiles p ON p.id = b.user_id
WHERE p.email = 'kayaaltin@nusd.com';

-- =============================================
-- ÖZET BİLGİLER
-- =============================================
-- Firma Adı: Kaya Altın
-- Email: kayaaltin@nusd.com
-- Şifre: 1234
-- Hesap Tipi: Business (İşletme)
-- Banka: Türkiye İş Bankası
-- Departmanlarda görünecek: ✅
-- =============================================
