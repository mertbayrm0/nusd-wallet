-- =============================================
-- TELEGRAM KYC & DEKONT VERIFICATION SYSTEM
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. KYC/Dekont Submissions Table
CREATE TABLE IF NOT EXISTS verification_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  
  -- Submission type
  submission_type TEXT NOT NULL CHECK (submission_type IN ('kyc', 'deposit')),
  
  -- Document URLs (Supabase Storage)
  document_url TEXT NOT NULL,
  document_url_2 TEXT, -- Second document (optional)
  
  -- For deposits
  amount DECIMAL(15,2),
  currency TEXT DEFAULT 'USD',
  
  -- Telegram tracking
  telegram_message_id BIGINT,
  telegram_chat_id BIGINT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Review info
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  admin_notes TEXT,
  
  -- AI verification (for future n8n integration)
  ai_verified BOOLEAN DEFAULT FALSE,
  ai_confidence DECIMAL(5,2),
  ai_result JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index for faster queries
CREATE INDEX IF NOT EXISTS idx_verification_user_id ON verification_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_status ON verification_submissions(status);
CREATE INDEX IF NOT EXISTS idx_verification_type ON verification_submissions(submission_type);
CREATE INDEX IF NOT EXISTS idx_verification_created ON verification_submissions(created_at DESC);

-- 3. RLS Policies
ALTER TABLE verification_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own submissions
CREATE POLICY "Users can view own submissions" ON verification_submissions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own submissions
CREATE POLICY "Users can insert own submissions" ON verification_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for Edge Functions)
CREATE POLICY "Service role full access" ON verification_submissions
  FOR ALL USING (auth.role() = 'service_role');

-- 4. Storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-docs',
  'verification-docs',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- 5. Storage policies
-- Users can upload to their own folder
CREATE POLICY "Users upload own docs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'verification-docs' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view their own docs
CREATE POLICY "Users view own docs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'verification-docs' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Service role full access for Edge Functions
CREATE POLICY "Service role storage access" ON storage.objects
  FOR ALL USING (
    bucket_id = 'verification-docs' AND 
    auth.role() = 'service_role'
  );

-- 6. Function to update user KYC status on approval
CREATE OR REPLACE FUNCTION update_user_kyc_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When KYC is approved, update user profile
  IF NEW.submission_type = 'kyc' AND NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE profiles
    SET 
      kyc_verified = TRUE,
      kyc_verified_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  
  -- When deposit is approved, add balance
  IF NEW.submission_type = 'deposit' AND NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE profiles
    SET balance = balance + NEW.amount
    WHERE id = NEW.user_id;
    
    -- Create a transaction record
    INSERT INTO transactions (
      user_id,
      user_email,
      type,
      amount,
      status,
      description
    ) VALUES (
      NEW.user_id,
      NEW.user_email,
      'deposit',
      NEW.amount,
      'completed',
      'Telegram verification - approved'
    );
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger
DROP TRIGGER IF EXISTS on_verification_status_change ON verification_submissions;
CREATE TRIGGER on_verification_status_change
  BEFORE UPDATE ON verification_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_kyc_status();

-- 8. Add kyc_verified column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'kyc_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN kyc_verified BOOLEAN DEFAULT FALSE;
    ALTER TABLE profiles ADD COLUMN kyc_verified_at TIMESTAMPTZ;
  END IF;
END $$;

-- 9. Grant permissions
GRANT ALL ON verification_submissions TO authenticated;
GRANT ALL ON verification_submissions TO service_role;

SELECT 'Telegram KYC/Dekont verification system tables created successfully!' as result;
