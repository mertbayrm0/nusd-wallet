-- =============================================
-- Kaya Erdem profilini Business Account'a güncelle
-- =============================================

-- 1️⃣ RLS İZİNLERİNİ EKLE
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);
GRANT INSERT ON profiles TO authenticated;

DROP POLICY IF EXISTS "Users can insert department" ON departments;
CREATE POLICY "Users can insert department"
ON departments FOR INSERT
WITH CHECK (auth.uid() = owner_id);
GRANT INSERT ON departments TO authenticated;

-- 2️⃣ Department oluştur (sadece name)
INSERT INTO departments (name)
VALUES ('Kaya Altın')
ON CONFLICT DO NOTHING;

-- 3️⃣ Profili güncelle
DO $$
DECLARE
  v_user_id UUID;
  v_dept_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM profiles WHERE email = 'kayaaltin@nusd.com' LIMIT 1;
  SELECT id INTO v_dept_id FROM departments WHERE name = 'Kaya Altın' LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    UPDATE profiles 
    SET 
      account_type = 'business',
      business_name = 'Kaya Altın',
      business_department_id = v_dept_id,
      name = 'Kaya Altın'
    WHERE id = v_user_id;
    
    IF v_dept_id IS NOT NULL THEN
      UPDATE departments SET owner_id = v_user_id WHERE id = v_dept_id;
    END IF;
    
    RAISE NOTICE '✅ Başarılı!';
  ELSE
    RAISE NOTICE '❌ Kullanıcı bulunamadı!';
  END IF;
END $$;

-- 4️⃣ KONTROL
SELECT email, name, account_type, business_name FROM profiles WHERE email = 'kayaaltin@nusd.com';
