-- =============================================
-- STEP 6: ADD COLOR COLUMN & RELAX CONSTRAINTS
-- =============================================

-- 1. Add Color Column
ALTER TABLE departments ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#10B981';

-- 2. Make Commission Fields Optional (Since we are moving logic to Panels)
-- If they are NOT NULL, we should alter them to drop NOT NULL or set defaults.
-- In Step 1 script, they didn't have NOT NULL explicitly (default null usually), 
-- but we will ensure they are safe.

ALTER TABLE departments ALTER COLUMN commission_mode DROP NOT NULL;
ALTER TABLE departments ALTER COLUMN commission_value SET DEFAULT 0;

-- 3. Yetki Kontrolü (Garanti olsun)
-- create-department fonksiyonu "service_role" ile yazar ama yine de policy kontrolü.
-- (Step 4 ve 5'te yapılanlar yeterli olmalı)
