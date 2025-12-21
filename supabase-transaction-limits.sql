-- =============================================
-- TRANSACTION LIMITS SYSTEM
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. User Limits Table
CREATE TABLE IF NOT EXISTS user_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Current limits (based on account type & KYC status)
  daily_limit DECIMAL(15,2) DEFAULT 500,
  monthly_limit DECIMAL(15,2) DEFAULT 2000,
  
  -- Usage tracking
  daily_used DECIMAL(15,2) DEFAULT 0,
  monthly_used DECIMAL(15,2) DEFAULT 0,
  
  -- Reset tracking
  last_daily_reset DATE DEFAULT CURRENT_DATE,
  last_monthly_reset DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create limits for existing users
INSERT INTO user_limits (user_id, daily_limit, monthly_limit)
SELECT 
  p.id,
  CASE 
    WHEN p.account_type = 'business' THEN 50000
    WHEN p.kyc_verified = TRUE THEN 10000
    ELSE 500
  END as daily_limit,
  CASE 
    WHEN p.account_type = 'business' THEN 500000
    WHEN p.kyc_verified = TRUE THEN 100000
    ELSE 2000
  END as monthly_limit
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM user_limits ul WHERE ul.user_id = p.id)
ON CONFLICT (user_id) DO NOTHING;

-- 3. Function to reset limits if needed
CREATE OR REPLACE FUNCTION reset_user_limits_if_needed(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Reset daily if new day
  UPDATE user_limits
  SET 
    daily_used = 0,
    last_daily_reset = CURRENT_DATE,
    updated_at = NOW()
  WHERE user_id = p_user_id 
    AND last_daily_reset < CURRENT_DATE;
  
  -- Reset monthly if new month
  UPDATE user_limits
  SET 
    monthly_used = 0,
    last_monthly_reset = DATE_TRUNC('month', CURRENT_DATE)::DATE,
    updated_at = NOW()
  WHERE user_id = p_user_id 
    AND last_monthly_reset < DATE_TRUNC('month', CURRENT_DATE)::DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to check and update limits
CREATE OR REPLACE FUNCTION check_transaction_limit(
  p_user_id UUID,
  p_amount DECIMAL,
  p_update BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  allowed BOOLEAN,
  daily_remaining DECIMAL,
  monthly_remaining DECIMAL,
  error_message TEXT
) AS $$
DECLARE
  v_limits user_limits%ROWTYPE;
  v_daily_remaining DECIMAL;
  v_monthly_remaining DECIMAL;
BEGIN
  -- Reset limits if needed
  PERFORM reset_user_limits_if_needed(p_user_id);
  
  -- Get current limits
  SELECT * INTO v_limits FROM user_limits WHERE user_id = p_user_id;
  
  -- Create default limits if not exists
  IF v_limits IS NULL THEN
    INSERT INTO user_limits (user_id) VALUES (p_user_id);
    SELECT * INTO v_limits FROM user_limits WHERE user_id = p_user_id;
  END IF;
  
  -- Calculate remaining
  v_daily_remaining := v_limits.daily_limit - v_limits.daily_used;
  v_monthly_remaining := v_limits.monthly_limit - v_limits.monthly_used;
  
  -- Check if transaction is allowed
  IF p_amount > v_daily_remaining THEN
    RETURN QUERY SELECT 
      FALSE, 
      v_daily_remaining, 
      v_monthly_remaining,
      'Günlük limit aşıldı. Kalan: $' || v_daily_remaining::TEXT;
    RETURN;
  END IF;
  
  IF p_amount > v_monthly_remaining THEN
    RETURN QUERY SELECT 
      FALSE, 
      v_daily_remaining, 
      v_monthly_remaining,
      'Aylık limit aşıldı. Kalan: $' || v_monthly_remaining::TEXT;
    RETURN;
  END IF;
  
  -- Update usage if requested
  IF p_update THEN
    UPDATE user_limits
    SET 
      daily_used = daily_used + p_amount,
      monthly_used = monthly_used + p_amount,
      updated_at = NOW()
    WHERE user_id = p_user_id;
    
    v_daily_remaining := v_daily_remaining - p_amount;
    v_monthly_remaining := v_monthly_remaining - p_amount;
  END IF;
  
  RETURN QUERY SELECT 
    TRUE, 
    v_daily_remaining, 
    v_monthly_remaining,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to get user limits with remaining
CREATE OR REPLACE FUNCTION get_user_limits(p_user_id UUID)
RETURNS TABLE (
  daily_limit DECIMAL,
  daily_used DECIMAL,
  daily_remaining DECIMAL,
  monthly_limit DECIMAL,
  monthly_used DECIMAL,
  monthly_remaining DECIMAL
) AS $$
BEGIN
  -- Reset limits if needed
  PERFORM reset_user_limits_if_needed(p_user_id);
  
  RETURN QUERY
  SELECT 
    ul.daily_limit,
    ul.daily_used,
    ul.daily_limit - ul.daily_used as daily_remaining,
    ul.monthly_limit,
    ul.monthly_used,
    ul.monthly_limit - ul.monthly_used as monthly_remaining
  FROM user_limits ul
  WHERE ul.user_id = p_user_id;
  
  -- If no record, return defaults
  IF NOT FOUND THEN
    INSERT INTO user_limits (user_id) VALUES (p_user_id);
    RETURN QUERY SELECT 500::DECIMAL, 0::DECIMAL, 500::DECIMAL, 2000::DECIMAL, 0::DECIMAL, 2000::DECIMAL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger to update limits when KYC is verified
CREATE OR REPLACE FUNCTION update_limits_on_kyc()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.kyc_verified = TRUE AND (OLD.kyc_verified IS NULL OR OLD.kyc_verified = FALSE) THEN
    UPDATE user_limits
    SET 
      daily_limit = CASE WHEN NEW.account_type = 'business' THEN 50000 ELSE 10000 END,
      monthly_limit = CASE WHEN NEW.account_type = 'business' THEN 500000 ELSE 100000 END,
      updated_at = NOW()
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_kyc_verified_update_limits ON profiles;
CREATE TRIGGER on_kyc_verified_update_limits
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.kyc_verified IS DISTINCT FROM OLD.kyc_verified)
  EXECUTE FUNCTION update_limits_on_kyc();

-- 7. Trigger to create limits for new users
CREATE OR REPLACE FUNCTION create_user_limits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_limits (user_id, daily_limit, monthly_limit)
  VALUES (
    NEW.id,
    CASE WHEN NEW.account_type = 'business' THEN 50000 ELSE 500 END,
    CASE WHEN NEW.account_type = 'business' THEN 500000 ELSE 2000 END
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_create_limits ON profiles;
CREATE TRIGGER on_profile_create_limits
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_limits();

-- 8. RLS Policies
ALTER TABLE user_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own limits" ON user_limits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access" ON user_limits
  FOR ALL USING (auth.role() = 'service_role');

-- 9. Indexes
CREATE INDEX IF NOT EXISTS idx_user_limits_reset ON user_limits(last_daily_reset, last_monthly_reset);

-- 10. Grant permissions
GRANT ALL ON user_limits TO authenticated;
GRANT ALL ON user_limits TO service_role;
GRANT EXECUTE ON FUNCTION check_transaction_limit TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_limits TO authenticated;

SELECT 'Transaction limits system created successfully!' as result;
