-- =============================================
-- NUSD WALLET — ATOMIC TRANSFER FUNCTION
-- ADIM 5: Race condition önleme
-- SELECT FOR UPDATE ile row locking
-- =============================================

-- Önceki varsa sil
DROP FUNCTION IF EXISTS execute_internal_transfer;

-- Atomic transfer function
CREATE OR REPLACE FUNCTION execute_internal_transfer(
    sender_id UUID,
    recipient_code TEXT,
    transfer_amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- service_role gibi çalışır
AS $$
DECLARE
    sender_record RECORD;
    recipient_record RECORD;
    result JSON;
BEGIN
    -- 1️⃣ LOCK: Sender'ın balance'ını kilitle
    SELECT id, balance, transfer_code, email
    INTO sender_record
    FROM profiles
    WHERE id = sender_id
    FOR UPDATE; -- ROW LOCK

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Sender not found');
    END IF;

    -- Kendine gönderme kontrolü
    IF sender_record.transfer_code = recipient_code THEN
        RETURN json_build_object('success', false, 'error', 'Cannot transfer to yourself');
    END IF;

    -- Bakiye kontrolü
    IF sender_record.balance < transfer_amount THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Insufficient balance',
            'balance', sender_record.balance
        );
    END IF;

    -- 2️⃣ LOCK: Recipient'ı bul ve kilitle
    SELECT id, balance, transfer_code, email
    INTO recipient_record
    FROM profiles
    WHERE transfer_code = recipient_code
    FOR UPDATE; -- ROW LOCK

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Recipient not found');
    END IF;

    -- 3️⃣ ATOMIC: Balance güncelle (her ikisi de aynı transaction içinde)
    UPDATE profiles 
    SET balance = balance - transfer_amount 
    WHERE id = sender_id;

    UPDATE profiles 
    SET balance = balance + transfer_amount 
    WHERE id = recipient_record.id;

    -- 4️⃣ Transaction kayıtları oluştur
    INSERT INTO transactions (user_id, type, amount, status, network, to_address)
    VALUES (sender_id, 'TRANSFER_OUT', transfer_amount, 'COMPLETED', 'INTERNAL', recipient_code);

    INSERT INTO transactions (user_id, type, amount, status, network, tx_hash)
    VALUES (recipient_record.id, 'TRANSFER_IN', transfer_amount, 'COMPLETED', 'INTERNAL', sender_record.transfer_code);

    -- 5️⃣ Başarılı sonuç
    RETURN json_build_object(
        'success', true,
        'message', format('%s USDT transferred to %s', transfer_amount, recipient_code),
        'newBalance', sender_record.balance - transfer_amount,
        'recipient', recipient_record.email
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Herhangi bir hata durumunda otomatik ROLLBACK
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Fonksiyonu test et (SQL Editor'da)
-- SELECT execute_internal_transfer('user-uuid', 'NUSD-XXXXXX', 100);
