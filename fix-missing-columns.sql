-- Eksik kolonları ekle

-- 1. departments tablosuna is_active ekle (yoksa)
ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. profiles tablosuna eksik kolonlar ekle
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_role TEXT DEFAULT 'owner';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parent_business_id UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_department_id UUID REFERENCES departments(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'personal';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nusd_code TEXT;

-- 3. Mevcut işletme hesabını güncelle
UPDATE profiles 
SET 
  nusd_code = 'NUSD-' || UPPER(SUBSTRING(MD5(email) FROM 1 FOR 6)),
  account_type = 'business',
  business_role = 'owner'
WHERE email = 'furkanyapi@nusd.com';
