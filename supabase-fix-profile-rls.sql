-- =============================================
-- FIX: Profile RLS - Kullanıcı kendi profilini okusun
-- =============================================

-- Önce mevcut SELECT policy'yi sil
DROP POLICY IF EXISTS "Users read own profile" ON profiles;

-- Yeni policy: id veya email ile okuma izni
CREATE POLICY "Users read own profile"
ON profiles FOR SELECT
USING (
  auth.uid() = id 
  OR 
  auth.email() = email
);

-- Grant SELECT izni
GRANT SELECT ON profiles TO authenticated;

-- =============================================
-- KONTROL: Profile ID ve Auth User ID'yi karşılaştır
-- =============================================
SELECT 
  p.id as profile_id,
  p.email,
  p.account_type,
  a.id as auth_user_id
FROM profiles p
LEFT JOIN auth.users a ON a.email = p.email
WHERE p.email = 'kayaaltin@nusd.com';
