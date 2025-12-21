-- =============================================
-- ADMIN ACTIVITY LOGS SYSTEM
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Admin Logs Table
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who did the action
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,
  user_role TEXT,
  
  -- What action was performed
  action TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'auth',           -- Login, logout, password change
    'transaction',    -- Deposit, withdraw, transfer
    'kyc',            -- KYC submit, approve, reject
    'p2p',            -- P2P orders, matches, completes
    'admin',          -- Admin actions (approve, reject, force)
    'user',           -- User profile changes
    'system',         -- System events
    'security'        -- Security events (failed login, etc)
  )),
  
  -- Details
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Target (if action affects another entity)
  target_type TEXT,  -- 'user', 'transaction', 'order', etc
  target_id TEXT,
  target_email TEXT,
  
  -- Request info
  ip_address TEXT,
  user_agent TEXT,
  
  -- Status
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_user ON admin_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action_type ON admin_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target ON admin_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_status ON admin_logs(status);

-- 3. Function to log actions easily
CREATE OR REPLACE FUNCTION log_admin_action(
  p_user_id UUID,
  p_action TEXT,
  p_action_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_target_type TEXT DEFAULT NULL,
  p_target_id TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'success'
)
RETURNS UUID AS $$
DECLARE
  v_user_email TEXT;
  v_user_name TEXT;
  v_user_role TEXT;
  v_log_id UUID;
BEGIN
  -- Get user info
  SELECT email, name, role INTO v_user_email, v_user_name, v_user_role
  FROM profiles WHERE id = p_user_id;
  
  -- Insert log
  INSERT INTO admin_logs (
    user_id, user_email, user_name, user_role,
    action, action_type, description, metadata,
    target_type, target_id, status
  ) VALUES (
    p_user_id, v_user_email, v_user_name, v_user_role,
    p_action, p_action_type, p_description, p_metadata,
    p_target_type, p_target_id, p_status
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger for transaction changes
CREATE OR REPLACE FUNCTION log_transaction_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    PERFORM log_admin_action(
      NEW.user_id,
      'transaction_status_change',
      'transaction',
      'Transaction status changed from ' || OLD.status || ' to ' || NEW.status,
      jsonb_build_object(
        'transaction_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'amount', NEW.amount,
        'type', NEW.type
      ),
      'transaction',
      NEW.id::TEXT,
      'success'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_transaction_status_change ON transactions;
CREATE TRIGGER on_transaction_status_change
  AFTER UPDATE ON transactions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_transaction_changes();

-- 5. Trigger for KYC verification changes
CREATE OR REPLACE FUNCTION log_kyc_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    PERFORM log_admin_action(
      NEW.user_id,
      CASE NEW.status 
        WHEN 'approved' THEN 'kyc_approved'
        WHEN 'rejected' THEN 'kyc_rejected'
        ELSE 'kyc_status_change'
      END,
      'kyc',
      'KYC verification ' || NEW.status || ' for user',
      jsonb_build_object(
        'submission_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'reviewed_by', NEW.reviewed_by
      ),
      'user',
      NEW.user_id::TEXT,
      'success'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_kyc_status_change ON verification_submissions;
CREATE TRIGGER on_kyc_status_change
  AFTER UPDATE ON verification_submissions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_kyc_changes();

-- 6. View for easier querying with formatted data
CREATE OR REPLACE VIEW admin_logs_view AS
SELECT 
  al.*,
  TO_CHAR(al.created_at AT TIME ZONE 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI:SS') as formatted_date
FROM admin_logs al
ORDER BY al.created_at DESC;

-- 7. RLS Policies
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view all logs" ON admin_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Service role full access
CREATE POLICY "Service role logs" ON admin_logs
  FOR ALL USING (auth.role() = 'service_role');

-- 8. Grant permissions
GRANT ALL ON admin_logs TO authenticated;
GRANT ALL ON admin_logs TO service_role;
GRANT SELECT ON admin_logs_view TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_action TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_action TO service_role;

-- 9. Add some initial log entries for testing
INSERT INTO admin_logs (action, action_type, description, status)
VALUES 
  ('system_initialized', 'system', 'Admin logs system initialized', 'success'),
  ('database_migration', 'system', 'Admin logs tables created', 'success');

SELECT 'Admin logs system created successfully!' as result;
