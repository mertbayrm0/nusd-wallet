-- =============================================
-- DEBUG: Kaya Altın hesabını kontrol et
-- Supabase SQL Editor'de çalıştırın
-- =============================================

-- 1️⃣ Tüm profilleri göster - account_type ile
SELECT 
  id,
  email, 
  name, 
  account_type, 
  business_name,
  balance,
  role
FROM profiles 
ORDER BY created_at DESC
LIMIT 10;

-- 2️⃣ Departments tablosunu kontrol et
SELECT id, name, owner_id FROM departments WHERE name LIKE '%Kaya%';
