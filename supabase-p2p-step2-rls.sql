-- =============================================
-- P2P ISOLATION — STEP 2: RLS POLICIES
-- =============================================
-- Bu SQL sadece YENİ tablolara RLS ekler.
-- Mevcut tabloları ETKİLEMEZ.
-- %100 GÜVENLİ
-- =============================================

-- =============================================
-- 1️⃣ p2p_orders RLS
-- =============================================

ALTER TABLE p2p_orders ENABLE ROW LEVEL SECURITY;

-- SELECT: Kullanıcı kendi order'larını görür (buyer veya seller olarak)
CREATE POLICY "Users can view own orders"
ON p2p_orders FOR SELECT
TO authenticated
USING (
    auth.uid() = buyer_id 
    OR auth.uid() = seller_id
);

-- SELECT: Admin tüm order'ları görür
CREATE POLICY "Admins can view all orders"
ON p2p_orders FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- INSERT/UPDATE/DELETE: Sadece service_role (Edge Functions)
-- Frontend ASLA doğrudan yazamaz
REVOKE INSERT, UPDATE, DELETE ON p2p_orders FROM anon, authenticated;

-- =============================================
-- 2️⃣ p2p_events RLS
-- =============================================

ALTER TABLE p2p_events ENABLE ROW LEVEL SECURITY;

-- SELECT: İlgili order'a dahil kullanıcı görebilir
CREATE POLICY "Users can view events of own orders"
ON p2p_events FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM p2p_orders
        WHERE p2p_orders.id = p2p_events.order_id
        AND (p2p_orders.buyer_id = auth.uid() OR p2p_orders.seller_id = auth.uid())
    )
);

-- SELECT: Admin tüm event'leri görür
CREATE POLICY "Admins can view all events"
ON p2p_events FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- INSERT/UPDATE/DELETE: Sadece service_role
REVOKE INSERT, UPDATE, DELETE ON p2p_events FROM anon, authenticated;

-- =============================================
-- 3️⃣ p2p_bank_accounts_snapshot RLS
-- =============================================

ALTER TABLE p2p_bank_accounts_snapshot ENABLE ROW LEVEL SECURITY;

-- SELECT: İlgili order'a dahil kullanıcı görebilir
CREATE POLICY "Users can view bank snapshot of own orders"
ON p2p_bank_accounts_snapshot FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM p2p_orders
        WHERE p2p_orders.id = p2p_bank_accounts_snapshot.order_id
        AND (p2p_orders.buyer_id = auth.uid() OR p2p_orders.seller_id = auth.uid())
    )
);

-- SELECT: Admin görebilir
CREATE POLICY "Admins can view all bank snapshots"
ON p2p_bank_accounts_snapshot FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- INSERT/UPDATE/DELETE: Sadece service_role
REVOKE INSERT, UPDATE, DELETE ON p2p_bank_accounts_snapshot FROM anon, authenticated;

-- =============================================
-- 4️⃣ Service role için GRANT (Edge Functions)
-- =============================================

-- Service role zaten tüm tablolara erişebilir (RLS bypass)
-- Ama explicit olarak GRANT yapalım
GRANT ALL ON p2p_orders TO service_role;
GRANT ALL ON p2p_events TO service_role;
GRANT ALL ON p2p_bank_accounts_snapshot TO service_role;

-- =============================================
-- ✅ DOĞRULAMA
-- =============================================

-- RLS durumunu kontrol et
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('p2p_orders', 'p2p_events', 'p2p_bank_accounts_snapshot');

-- Politikaları kontrol et
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename IN ('p2p_orders', 'p2p_events', 'p2p_bank_accounts_snapshot');
