-- =============================================
-- BUSINESS ACCOUNT SYSTEM
-- Step 1: Database schema updates
-- =============================================

-- 1. Profiles tablosuna işletme alanları ekle
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'personal';
-- 'personal' = bireysel, 'business' = işletme

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_department_id UUID REFERENCES departments(id);

-- 2. Departments tablosuna owner_id ekle (işletme sahipliği)
ALTER TABLE departments ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id);

-- 3. Check constraint for account_type
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_account_type;
ALTER TABLE profiles ADD CONSTRAINT check_account_type CHECK (account_type IN ('personal', 'business'));

-- Verify
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('account_type', 'business_name', 'business_department_id');

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'departments' 
AND column_name = 'owner_id';
