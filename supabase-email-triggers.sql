-- ============================================
-- NUSD Wallet - Email Triggers
-- Automatic email sending for key events
-- ============================================

-- Note: These require the send-email Edge Function to be deployed
-- and RESEND_API_KEY to be set in Supabase secrets

-- ============================================
-- 1. WELCOME EMAIL - On New User Registration
-- ============================================
-- This trigger fires when a new profile is created

CREATE OR REPLACE FUNCTION send_welcome_email()
RETURNS TRIGGER AS $$
DECLARE
    user_email TEXT;
    user_name TEXT;
BEGIN
    -- Get user email from auth.users
    SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;
    
    -- Get user name
    user_name := COALESCE(NEW.first_name, SPLIT_PART(user_email, '@', 1));
    
    -- Call Edge Function to send welcome email
    -- Note: This uses pg_net extension for HTTP calls
    -- If pg_net is not available, use application-level triggers instead
    
    PERFORM net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/send-email',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object(
            'to', user_email,
            'template', 'welcome',
            'data', jsonb_build_object('userName', user_name)
        )
    );
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Welcome email error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (disabled by default - enable after testing)
-- DROP TRIGGER IF EXISTS trigger_welcome_email ON profiles;
-- CREATE TRIGGER trigger_welcome_email
--     AFTER INSERT ON profiles
--     FOR EACH ROW
--     EXECUTE FUNCTION send_welcome_email();


-- ============================================
-- 2. WITHDRAWAL SUCCESS EMAIL TRIGGER
-- Alternative: Application-level trigger recommended
-- ============================================
-- For withdrawals, it's better to trigger from the application
-- when admin approves the withdrawal, similar to deposit_success


-- ============================================
-- SIMPLER APPROACH: Use Application-Level Triggers
-- ============================================
-- Instead of database triggers, add these email calls in:
-- 
-- 1. WELCOME: In Register.tsx after successful registration
-- 2. WITHDRAWAL: In AdminDashboard.tsx when approving withdrawal
-- 3. P2P: In P2P order completion handler
--
-- Example code for application:
--
-- import { api } from '../services/api';
-- 
-- // After successful registration
-- await api.sendEmail(user.email, 'welcome', { userName: user.name });
--
-- // After withdrawal approval
-- await api.sendEmail(user.email, 'withdrawal_success', { 
--     userName: user.name, 
--     amount: withdrawal.amount 
-- });


-- ============================================
-- ENABLE PG_NET EXTENSION (if not already)
-- ============================================
-- Run this if you want database triggers to work:
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- Set app settings for triggers (requires superuser):
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
