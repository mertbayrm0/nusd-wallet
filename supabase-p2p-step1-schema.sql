-- =============================================
-- P2P ISOLATION — STEP 1: SCHEMA
-- =============================================
-- Bu SQL mevcut tabloları ETKİLEMEZ.
-- Sadece YENİ tablolar oluşturur.
-- %100 GÜVENLİ - Geri dönüş: DROP TABLE
-- =============================================

-- =============================================
-- 1️⃣ p2p_orders (Ana durum tablosu)
-- =============================================

CREATE TABLE IF NOT EXISTS p2p_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Taraflar
    buyer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Tutar
    amount_usd NUMERIC NOT NULL CHECK (amount_usd > 0),
    
    -- Durum (State Machine)
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (
        status IN ('OPEN', 'MATCHED', 'PAID', 'COMPLETED', 'CANCELLED', 'EXPIRED')
    ),
    
    -- Eşleşme kilidi (Race condition önleme)
    lock_expires_at TIMESTAMPTZ,
    
    -- Eşleşme parametreleri
    match_tolerance_percent NUMERIC DEFAULT 2.0,  -- ±%2
    
    -- Seller banka bilgisi (snapshot - değişse bile sabit kalır)
    seller_iban TEXT,
    seller_bank_name TEXT,
    seller_account_name TEXT,
    
    -- Onay durumları
    buyer_confirmed_at TIMESTAMPTZ,
    admin_confirmed_at TIMESTAMPTZ,
    
    -- Zaman damgaları
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Yorum: Status akışı
-- OPEN → MATCHED → PAID → COMPLETED
--   ↓        ↓       ↓
-- CANCELLED/EXPIRED

-- =============================================
-- 2️⃣ p2p_events (Audit/Flow log)
-- =============================================

CREATE TABLE IF NOT EXISTS p2p_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- İlişki
    order_id UUID NOT NULL REFERENCES p2p_orders(id) ON DELETE CASCADE,
    
    -- Aktör
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    actor_role TEXT NOT NULL CHECK (
        actor_role IN ('buyer', 'seller', 'admin', 'system')
    ),
    
    -- Olay türü
    event_type TEXT NOT NULL CHECK (
        event_type IN (
            'CREATE',
            'MATCH', 
            'MARK_PAID',
            'BUYER_CONFIRM',
            'ADMIN_CONFIRM',
            'CANCEL',
            'EXPIRE',
            'UNMATCH'  -- Lock expired case
        )
    ),
    
    -- Ek veri
    metadata JSONB DEFAULT '{}',
    
    -- Zaman
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 3️⃣ p2p_bank_accounts_snapshot (Opsiyonel)
-- =============================================
-- Seller'ın o anki banka bilgisini saklar.
-- Hesap silse bile order IBAN'ı sabit kalır.

CREATE TABLE IF NOT EXISTS p2p_bank_accounts_snapshot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES p2p_orders(id) ON DELETE CASCADE,
    
    -- Banka bilgileri
    beneficiary_name TEXT NOT NULL,
    iban TEXT NOT NULL,
    bank_name TEXT,
    
    -- Zaman
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 4️⃣ Updated_at trigger (Otomatik güncelleme)
-- =============================================

CREATE OR REPLACE FUNCTION update_p2p_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_p2p_orders_updated_at ON p2p_orders;

CREATE TRIGGER trg_p2p_orders_updated_at
    BEFORE UPDATE ON p2p_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_p2p_orders_updated_at();

-- =============================================
-- ✅ DOĞRULAMA
-- =============================================

-- Tabloların oluştuğunu kontrol et
SELECT 
    table_name,
    (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_name IN ('p2p_orders', 'p2p_events', 'p2p_bank_accounts_snapshot')
AND table_schema = 'public';
