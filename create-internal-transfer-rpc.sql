-- 🔒 Internal Transfer RPC - SIMPLE VERSION
-- NUSD kodunu email ile eşleştirmek için profiles tablosuna nusd_code sütunu ekliyoruz

-- 1. nusd_code sütunu ekle (varsa atla)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nusd_code TEXT;

-- 2. Mevcut kullanıcıların nusd_code'unu güncelle
-- JavaScript hash algoritmasını taklit et: ((acc << 5) - acc) + charCode
CREATE OR REPLACE FUNCTION generate_nusd_code(email TEXT) 
RETURNS TEXT AS $$
DECLARE
    hash_val BIGINT := 0;
    i INT;
    char_code INT;
BEGIN
    FOR i IN 1..LENGTH(email) LOOP
        char_code := ASCII(SUBSTRING(email, i, 1));
        hash_val := ((hash_val * 31) + char_code) % 2147483647;
    END LOOP;
    RETURN 'NUSD-' || UPPER(SUBSTRING(TO_CHAR(ABS(hash_val), 'FM00000000000000000000000'), 1, 6));
END;
$$ LANGUAGE plpgsql;

-- 3. Tüm kullanıcıların nusd_code'unu güncelle
UPDATE profiles SET nusd_code = generate_nusd_code(email) WHERE nusd_code IS NULL;

-- 4. Trigger ile yeni kullanıcılara otomatik code atansın
CREATE OR REPLACE FUNCTION set_nusd_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.nusd_code IS NULL AND NEW.email IS NOT NULL THEN
        NEW.nusd_code := generate_nusd_code(NEW.email);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_nusd_code ON profiles;
CREATE TRIGGER trigger_set_nusd_code
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_nusd_code();

-- 5. ATOMIC Transfer Function
DROP FUNCTION IF EXISTS execute_internal_transfer(uuid, text, numeric);

CREATE OR REPLACE FUNCTION execute_internal_transfer(
    sender_id UUID,
    recipient_code TEXT,
    transfer_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    sender_balance NUMERIC;
    recipient_row RECORD;
    sender_new_balance NUMERIC;
    recipient_new_balance NUMERIC;
    sender_tx_id UUID;
    recipient_tx_id UUID;
BEGIN
    -- 1. Gönderenin bakiyesini al ve kilitle
    SELECT balance INTO sender_balance
    FROM profiles
    WHERE id = sender_id
    FOR UPDATE;

    IF sender_balance IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sender not found');
    END IF;

    -- 2. Bakiye kontrolü
    IF sender_balance < transfer_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Yetersiz bakiye', 'balance', sender_balance);
    END IF;

    -- 3. Alıcıyı nusd_code ile bul
    SELECT id, email, balance, nusd_code INTO recipient_row
    FROM profiles
    WHERE nusd_code = recipient_code
    FOR UPDATE;

    IF recipient_row.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Alıcı bulunamadı: ' || recipient_code);
    END IF;

    -- 4. Kendine transfer engelle
    IF sender_id = recipient_row.id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kendinize transfer yapamazsınız');
    END IF;

    -- 5. Bakiyeleri güncelle
    sender_new_balance := sender_balance - transfer_amount;
    recipient_new_balance := recipient_row.balance + transfer_amount;

    UPDATE profiles SET balance = sender_new_balance WHERE id = sender_id;
    UPDATE profiles SET balance = recipient_new_balance WHERE id = recipient_row.id;

    -- 6. Transaction kayıtları oluştur
    INSERT INTO transactions (user_id, type, amount, status, network, description)
    VALUES (sender_id, 'TRANSFER', -transfer_amount, 'COMPLETED', 'INTERNAL', 'Transfer to ' || recipient_code)
    RETURNING id INTO sender_tx_id;

    INSERT INTO transactions (user_id, type, amount, status, network, description)
    VALUES (recipient_row.id, 'TRANSFER', transfer_amount, 'COMPLETED', 'INTERNAL', 'Transfer from internal')
    RETURNING id INTO recipient_tx_id;

    -- Başarılı
    RETURN jsonb_build_object(
        'success', true,
        'sender_new_balance', sender_new_balance,
        'recipient_new_balance', recipient_new_balance,
        'recipient_id', recipient_row.id,
        'recipient_email', recipient_row.email,
        'sender_transaction_id', sender_tx_id,
        'recipient_transaction_id', recipient_tx_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION execute_internal_transfer TO service_role;
GRANT EXECUTE ON FUNCTION generate_nusd_code TO service_role;

-- ✅ Test et
SELECT generate_nusd_code('kayaaltin@nusd.com');
SELECT nusd_code, email FROM profiles LIMIT 5;
