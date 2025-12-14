-- =============================================
-- STEP 3: TRANSACTION SCHEMA CHECK
-- =============================================
-- Payment Panel üzerinden işlem yapabilmek için 'transactions' tablosunda
-- 'metadata' ve 'currency' kolonlarının bulunması gerekir.

-- 1. Metadata kolonu (Panel bilgileri, komisyon detayları burada tutulur)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 2. Currency kolonu (Varlık tipi: TRX, USDT vb.)
-- Eğer sisteminizde 'asset_type' kullanılıyorsa, Edge Function kodunun buna göre güncellenmesi gerekir.
-- Ancak biz kodda 'currency' kullandık (mevcut admin paneline uyumlu olması için).
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TRX';

-- 3. Payment Panel ID (Opsiyonel ama raporlama için iyi olabilir)
-- ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_panel_id UUID REFERENCES payment_panels(id);
