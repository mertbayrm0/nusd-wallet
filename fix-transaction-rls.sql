-- 🔧 TRANSACTIONS RLS KAPSAMLI DÜZELTME
-- Bu SQL tüm RLS politikalarını düzgün ayarlar

-- 1. Önce mevcut politikaları listele
SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename = 'transactions';

-- 2. Tüm transaction politikalarını kaldır
DROP POLICY IF EXISTS "Users read own transactions" ON transactions;
DROP POLICY IF EXISTS "Allow users to read own transactions" ON transactions;
DROP POLICY IF EXISTS "users_select_own_transactions" ON transactions;

-- 3. RLS'yi aç (zaten açık olabilir)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 4. SELECT politikası - kullanıcılar kendi işlemlerini görebilir
CREATE POLICY "users_read_own_transactions"
ON transactions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 5. Service role için bypass (zaten varsayılan çalışmalı ama emin olmak için)
ALTER TABLE transactions FORCE ROW LEVEL SECURITY;

-- 6. Test - mevcut kullanıcının işlemlerini gör
SELECT id, user_id, type, amount, status, created_at FROM transactions LIMIT 10;

-- 7. Policies kontrol
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies WHERE tablename = 'transactions';
