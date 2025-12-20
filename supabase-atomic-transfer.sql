-- Atomic Transfer Function
-- Race condition'ı önleyen tek transaction'lı transfer
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION atomic_transfer(
    p_sender_id UUID,
    p_recipient_id UUID,
    p_amount DECIMAL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sender_balance DECIMAL;
    v_sender_new_balance DECIMAL;
    v_recipient_new_balance DECIMAL;
BEGIN
    -- Lock sender row for update (prevents race condition)
    SELECT balance INTO v_sender_balance
    FROM profiles
    WHERE id = p_sender_id
    FOR UPDATE;
    
    -- Check balance
    IF v_sender_balance < p_amount THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Insufficient balance',
            'balance', v_sender_balance
        );
    END IF;
    
    -- Update sender (atomic)
    UPDATE profiles 
    SET balance = balance - p_amount
    WHERE id = p_sender_id;
    
    -- Update recipient (atomic)
    UPDATE profiles 
    SET balance = balance + p_amount
    WHERE id = p_recipient_id;
    
    -- Calculate new balances
    SELECT balance INTO v_sender_new_balance FROM profiles WHERE id = p_sender_id;
    SELECT balance INTO v_recipient_new_balance FROM profiles WHERE id = p_recipient_id;
    
    RETURN json_build_object(
        'success', true,
        'sender_new_balance', v_sender_new_balance,
        'recipient_new_balance', v_recipient_new_balance
    );
END;
$$;

-- Grant execute to authenticated users (via edge function)
GRANT EXECUTE ON FUNCTION atomic_transfer TO service_role;
