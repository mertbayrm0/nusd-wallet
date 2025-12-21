-- =============================================
-- PUSH NOTIFICATIONS SYSTEM
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Push Tokens Table
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT DEFAULT 'web' CHECK (platform IN ('web', 'ios', 'android')),
  device_info JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, token)
);

-- 2. Notifications Log Table (for tracking sent notifications)
CREATE TABLE IF NOT EXISTS notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT DEFAULT 'general' CHECK (type IN ('general', 'transaction', 'kyc', 'p2p', 'security', 'promotion')),
  data JSONB,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ
);

-- 3. RLS Policies
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
CREATE POLICY "Users can manage own tokens" ON push_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications_log
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications_log
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role push_tokens" ON push_tokens
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role notifications" ON notifications_log
  FOR ALL USING (auth.role() = 'service_role');

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications_log(user_id, read_at) WHERE read_at IS NULL;

-- 5. Grant permissions
GRANT ALL ON push_tokens TO authenticated;
GRANT ALL ON push_tokens TO service_role;
GRANT ALL ON notifications_log TO authenticated;
GRANT ALL ON notifications_log TO service_role;

SELECT 'Push notifications tables created successfully!' as result;
