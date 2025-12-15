-- =============================================
-- P2P ISOLATION — STEP 3: INDEXES
-- =============================================
-- Performans optimizasyonu.
-- Mevcut tabloları ETKİLEMEZ.
-- %100 GÜVENLİ
-- =============================================

-- =============================================
-- 1️⃣ p2p_orders Indexes
-- =============================================

-- Status bazlı sorgular için (en sık kullanılacak)
CREATE INDEX IF NOT EXISTS idx_p2p_orders_status 
ON p2p_orders(status);

-- Buyer bazlı sorgular
CREATE INDEX IF NOT EXISTS idx_p2p_orders_buyer 
ON p2p_orders(buyer_id);

-- Seller bazlı sorgular
CREATE INDEX IF NOT EXISTS idx_p2p_orders_seller 
ON p2p_orders(seller_id);

-- Zaman bazlı sorgular (tarih sırası, timeout)
CREATE INDEX IF NOT EXISTS idx_p2p_orders_created 
ON p2p_orders(created_at DESC);

-- Eşleşme sorgularında kullanılacak (OPEN + amount)
CREATE INDEX IF NOT EXISTS idx_p2p_orders_matching 
ON p2p_orders(status, amount_usd) 
WHERE status = 'OPEN';

-- Lock timeout kontrolü için
CREATE INDEX IF NOT EXISTS idx_p2p_orders_lock_expiry 
ON p2p_orders(lock_expires_at) 
WHERE lock_expires_at IS NOT NULL;

-- =============================================
-- 2️⃣ p2p_events Indexes
-- =============================================

-- Order bazlı event listesi (en sık kullanılacak)
CREATE INDEX IF NOT EXISTS idx_p2p_events_order 
ON p2p_events(order_id, created_at DESC);

-- Event type bazlı filtreleme
CREATE INDEX IF NOT EXISTS idx_p2p_events_type 
ON p2p_events(event_type);

-- Actor bazlı sorgular
CREATE INDEX IF NOT EXISTS idx_p2p_events_actor 
ON p2p_events(actor_id);

-- =============================================
-- 3️⃣ p2p_bank_accounts_snapshot Indexes
-- =============================================

-- Order bazlı lookup (UNIQUE constraint zaten index oluşturur)
-- Ek index gerekmez

-- =============================================
-- ✅ DOĞRULAMA
-- =============================================

-- Index'leri kontrol et
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE tablename IN ('p2p_orders', 'p2p_events', 'p2p_bank_accounts_snapshot')
ORDER BY tablename, indexname;
