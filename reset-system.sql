-- 🔄 SISTEM SIFIRLAMA
-- Tüm işlemleri temizle, bakiyeleri 10.000$ yap

-- 1️⃣ Tüm transaction'ları temizle
TRUNCATE TABLE transactions CASCADE;

-- 2️⃣ Transaction audit log'larını temizle
TRUNCATE TABLE transaction_audit_logs CASCADE;

-- 3️⃣ P2P order'larını temizle (varsa)
TRUNCATE TABLE p2p_orders CASCADE;

-- 4️⃣ Vault ledger'larını temizle (varsa)
TRUNCATE TABLE vault_ledger CASCADE;

-- 5️⃣ Tüm kullanıcı bakiyelerini 10.000$ yap
UPDATE profiles SET balance = 10000;

-- 6️⃣ Tüm vault bakiyelerini sıfırla
UPDATE vaults SET balance = 0;

-- ✅ Bitti!
SELECT 'Sistem sıfırlandı! Tüm bakiyeler 10.000$' as result;
