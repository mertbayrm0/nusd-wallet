-- Comprehensive Audit Logging System
-- Tüm kritik işlemlerin kaydı
-- Run in Supabase SQL Editor

-- 1. Ana audit_logs tablosu
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Kim
    actor_id UUID REFERENCES auth.users(id),
    actor_email TEXT,
    actor_role TEXT, -- 'user', 'admin', 'system'
    
    -- Ne
    action TEXT NOT NULL, -- 'LOGIN', 'LOGOUT', 'TRANSFER', 'DEPOSIT', etc.
    resource_type TEXT, -- 'user', 'transaction', 'vault', 'department', 'p2p_order'
    resource_id UUID,
    
    -- Detay
    details JSONB DEFAULT '{}',
    
    -- Nereden
    ip_address TEXT,
    user_agent TEXT
);

-- 2. Index'ler (hızlı arama)
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- 3. Log ekleme fonksiyonu
CREATE OR REPLACE FUNCTION log_audit(
    p_actor_id UUID,
    p_actor_email TEXT,
    p_actor_role TEXT,
    p_action TEXT,
    p_resource_type TEXT DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO audit_logs (
        actor_id, actor_email, actor_role,
        action, resource_type, resource_id, details
    ) VALUES (
        p_actor_id, p_actor_email, p_actor_role,
        p_action, p_resource_type, p_resource_id, p_details
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- 4. RLS - Sadece adminler okuyabilir
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs" ON audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 5. Grant execute
GRANT EXECUTE ON FUNCTION log_audit TO service_role;

-- 6. Örnek action'lar (reference)
COMMENT ON TABLE audit_logs IS 'Action types:
- AUTH: LOGIN, LOGOUT, PASSWORD_CHANGE, 2FA_ENABLE
- USER: PROFILE_UPDATE, BALANCE_CHANGE, STATUS_CHANGE, ROLE_CHANGE
- TRANSACTION: DEPOSIT_REQUEST, DEPOSIT_APPROVE, WITHDRAW_REQUEST, WITHDRAW_APPROVE, TRANSFER
- ADMIN: USER_SUSPEND, USER_ACTIVATE, VAULT_UPDATE, DEPARTMENT_UPDATE
- P2P: ORDER_CREATE, ORDER_MATCH, ORDER_COMPLETE, ORDER_CANCEL
- SYSTEM: RATE_LIMIT_HIT, ERROR
';
