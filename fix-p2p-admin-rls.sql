-- P2P Orders RLS Politikalarını Düzelt
-- Admin kullanıcıların p2p_orders tablosunu güncelleyebilmesi için

-- Önce mevcut UPDATE politikalarını silip temizleyelim
DROP POLICY IF EXISTS "admin_update_p2p_orders" ON p2p_orders;
DROP POLICY IF EXISTS "p2p_orders_update_policy" ON p2p_orders;
DROP POLICY IF EXISTS "Users can update own orders" ON p2p_orders;
DROP POLICY IF EXISTS "update_own_orders" ON p2p_orders;

-- Şimdi yeni UPDATE politikası oluştur - admin tüm order'ları güncelleyebilir
CREATE POLICY "admin_and_owner_update_p2p_orders" ON p2p_orders
FOR UPDATE TO authenticated
USING (
  -- Kendi order'ları VEYA admin ise hepsini görebilir
  buyer_id = auth.uid() 
  OR seller_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  -- Kendi order'larını VEYA admin ise hepsini güncelleyebilir
  buyer_id = auth.uid() 
  OR seller_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Mevcut SELECT politikalarını da kontrol et/düzelt
DROP POLICY IF EXISTS "admin_select_p2p_orders" ON p2p_orders;
DROP POLICY IF EXISTS "Users can read own orders" ON p2p_orders;
DROP POLICY IF EXISTS "select_own_orders" ON p2p_orders;

CREATE POLICY "admin_and_owner_select_p2p_orders" ON p2p_orders
FOR SELECT TO authenticated
USING (
  buyer_id = auth.uid() 
  OR seller_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Admin kullanıcının rolünün doğru olduğunu kontrol et
-- SELECT id, email, role FROM profiles WHERE role = 'admin';
