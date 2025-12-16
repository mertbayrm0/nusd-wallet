-- =============================================
-- DEPARTMENT NUSD WALLET SYSTEM
-- Step 1: Add nusd_address and balance to departments
-- =============================================

-- 1. Add nusd_address column (benzersiz NUSD adresi)
ALTER TABLE departments ADD COLUMN IF NOT EXISTS nusd_address TEXT UNIQUE;

-- 2. Add balance column (departman bakiyesi)
ALTER TABLE departments ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;

-- 3. Generate NUSD addresses for existing departments
UPDATE departments 
SET nusd_address = 'NUSD-' || UPPER(SUBSTR(MD5(id::TEXT || NOW()::TEXT), 1, 6))
WHERE nusd_address IS NULL;

-- 4. Verify
SELECT id, name, nusd_address, balance FROM departments;
