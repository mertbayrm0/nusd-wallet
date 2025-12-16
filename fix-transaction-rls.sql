-- 🔧 TRANSACTION RLS FIX
-- Service role ile yazılan transaction'ların user tarafından okunabilmesi için

-- Mevcut policy'leri temizle ve yeniden oluştur
DROP POLICY IF EXISTS "Users read own transactions" ON transactions;

-- Kullanıcılar kendi transaction'larını okuyabilir
CREATE POLICY "Users read own transactions"
ON transactions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Service role her şeyi yapabilir (zaten varsayılan)

-- ✅ Test
SELECT * FROM transactions LIMIT 5;
