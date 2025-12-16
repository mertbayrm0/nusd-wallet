-- =============================================
-- DEPARTMENT NUSD WALLET SYSTEM
-- Step 2: Update execute_internal_transfer RPC
-- Supports both USER and DEPARTMENT recipients
-- =============================================

-- Önceki varsa sil
DROP FUNCTION IF EXISTS execute_internal_transfer;

-- Updated Atomic transfer function (User + Department support)
CREATE OR REPLACE FUNCTION execute_internal_transfer(
    sender_id UUID,
    recipient_code TEXT,
    transfer_amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    sender_record RECORD;
    recipient_user RECORD;
    recipient_dept RECORD;
    is_department BOOLEAN := FALSE;
    result JSON;
BEGIN
    -- 1️⃣ LOCK: Sender'ın balance'ını kilitle
    SELECT id, balance, transfer_code, email
    INTO sender_record
    FROM profiles
    WHERE id = sender_id
    FOR UPDATE;

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
            'error', 'Yetersiz bakiye',
            'balance', sender_record.balance
        );
    END IF;

    -- 2️⃣ Önce USER'da ara
    SELECT id, balance, transfer_code, email
    INTO recipient_user
    FROM profiles
    WHERE transfer_code = recipient_code
    FOR UPDATE;

    IF NOT FOUND THEN
        -- User bulunamadı, DEPARTMENT'ta ara
        SELECT id, balance, nusd_address, name
        INTO recipient_dept
        FROM departments
        WHERE nusd_address = recipient_code
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN json_build_object('success', false, 'error', 'Alıcı bulunamadı');
        END IF;
        
        is_department := TRUE;
    END IF;

    -- 3️⃣ ATOMIC: Balance güncelle
    -- Sender'dan düş
    UPDATE profiles 
    SET balance = balance - transfer_amount 
    WHERE id = sender_id;

    IF is_department THEN
        -- Department'a ekle
        UPDATE departments 
        SET balance = balance + transfer_amount 
        WHERE id = recipient_dept.id;

        -- Transaction kayıtları
        INSERT INTO transactions (user_id, type, amount, status, network, to_address, metadata)
        VALUES (
            sender_id, 
            'TRANSFER_OUT', 
            transfer_amount, 
            'COMPLETED', 
            'INTERNAL', 
            recipient_code,
            json_build_object('recipient_type', 'department', 'department_id', recipient_dept.id, 'department_name', recipient_dept.name)
        );

        RETURN json_build_object(
            'success', true,
            'message', format('%s USDT transferred to %s', transfer_amount, recipient_dept.name),
            'newBalance', sender_record.balance - transfer_amount,
            'recipient', recipient_dept.name,
            'recipient_type', 'department',
            'department_id', recipient_dept.id
        );
    ELSE
        -- User'a ekle
        UPDATE profiles 
        SET balance = balance + transfer_amount 
        WHERE id = recipient_user.id;

        -- Transaction kayıtları (mevcut gibi)
        INSERT INTO transactions (user_id, type, amount, status, network, to_address)
        VALUES (sender_id, 'TRANSFER_OUT', transfer_amount, 'COMPLETED', 'INTERNAL', recipient_code);

        INSERT INTO transactions (user_id, type, amount, status, network, tx_hash)
        VALUES (recipient_user.id, 'TRANSFER_IN', transfer_amount, 'COMPLETED', 'INTERNAL', sender_record.transfer_code);

        RETURN json_build_object(
            'success', true,
            'message', format('%s USDT transferred to %s', transfer_amount, recipient_code),
            'newBalance', sender_record.balance - transfer_amount,
            'recipient', recipient_user.email,
            'recipient_type', 'user'
        );
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Test
-- SELECT execute_internal_transfer('user-uuid', 'NUSD-XXXXXX', 100);
