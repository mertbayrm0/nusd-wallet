-- =============================================
-- STEP 9: SAFE FIX (GUARANTEED TO RUN)
-- =============================================

-- Bu script, hata durumlarını kontrol ederek çalışır.
-- "column does not exist" hatası vermez.

DO $$
BEGIN
    -- 1. "color" kolonu yoksa ekle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'color') THEN
        ALTER TABLE departments ADD COLUMN color TEXT DEFAULT '#10B981';
    END IF;

    -- 2. "commission_mode" varsa zorunluluğu kaldır
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'commission_mode') THEN
        ALTER TABLE departments ALTER COLUMN commission_mode DROP NOT NULL;
    END IF;

    -- 3. "commission_value" varsa zorunluluğu kaldır ve default ata
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'commission_value') THEN
        ALTER TABLE departments ALTER COLUMN commission_value DROP NOT NULL;
        ALTER TABLE departments ALTER COLUMN commission_value SET DEFAULT 0;
    END IF;
END $$;

-- 4. Yetkileri tazele (Hata vermez)
GRANT ALL ON TABLE departments TO service_role;
GRANT ALL ON TABLE departments TO postgres;
