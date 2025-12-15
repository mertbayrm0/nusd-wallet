-- =============================================
-- STEP 8: FORCE FIX DATABASE (CRITICAL)
-- =============================================

-- Bu komutlar veritabanınızı kod ile uyumlu hale getirecektir.
-- Hata alırsanız (örneğin 'column does not exist') ÖNEMSEMEYİN ve devam edin.

-- 1. "color" kolonunu ekle
ALTER TABLE departments ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#10B981';

-- 2. Eski zorunlu alanları serbest bırak (DROP NOT NULL)
-- Kod artık bunları göndermiyor, veritabanı da istememeli.

ALTER TABLE departments ALTER COLUMN commission_mode DROP NOT NULL;
ALTER TABLE departments ALTER COLUMN commission_value DROP NOT NULL;

-- 3. Default değer ata (garanti olsun)
ALTER TABLE departments ALTER COLUMN commission_value SET DEFAULT 0;

-- 4. Yetkileri tazele
GRANT ALL ON TABLE departments TO service_role;
GRANT ALL ON TABLE departments TO postgres;
