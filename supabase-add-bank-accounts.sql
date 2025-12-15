-- =============================================
-- Add Bank Accounts for Demo and Investor
-- =============================================

-- 1️⃣ Demo hesabına banka ekle
INSERT INTO bank_accounts (user_id, bank_name, iban, account_name)
SELECT id, 'Ziraat Bankası', 'TR330006100519786457841326', 'Demo Kullanıcı'
FROM profiles WHERE email = 'demo@nusd.com'
ON CONFLICT DO NOTHING;

INSERT INTO bank_accounts (user_id, bank_name, iban, account_name)
SELECT id, 'İş Bankası', 'TR120006400000168789012458', 'Demo Kullanıcı'
FROM profiles WHERE email = 'demo@nusd.com'
ON CONFLICT DO NOTHING;

-- 2️⃣ Investor hesabına banka ekle
INSERT INTO bank_accounts (user_id, bank_name, iban, account_name)
SELECT id, 'Garanti BBVA', 'TR640006200105832214458790', 'Investor Kullanıcı'
FROM profiles WHERE email = 'investor@nusd.com'
ON CONFLICT DO NOTHING;

INSERT INTO bank_accounts (user_id, bank_name, iban, account_name)
SELECT id, 'Yapı Kredi', 'TR890006700518956234108765', 'Investor Kullanıcı'
FROM profiles WHERE email = 'investor@nusd.com'
ON CONFLICT DO NOTHING;

-- 3️⃣ Kontrol
SELECT 
    p.email,
    b.bank_name,
    b.iban,
    b.account_name
FROM bank_accounts b
JOIN profiles p ON p.id = b.user_id
WHERE p.email IN ('demo@nusd.com', 'investor@nusd.com')
ORDER BY p.email, b.bank_name;
