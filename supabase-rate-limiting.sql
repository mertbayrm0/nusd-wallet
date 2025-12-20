-- Rate Limiting with PostgreSQL
-- Simple counter-based rate limiting for edge functions
-- Run in Supabase SQL Editor

-- 1. Create rate limit table
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    identifier TEXT NOT NULL, -- IP or user_id
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(identifier, endpoint)
);

-- 2. Rate limit check function
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_identifier TEXT,
    p_endpoint TEXT,
    p_max_requests INTEGER DEFAULT 100,
    p_window_seconds INTEGER DEFAULT 60
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_record rate_limits;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- Get or create rate limit record
    SELECT * INTO v_record
    FROM rate_limits
    WHERE identifier = p_identifier AND endpoint = p_endpoint
    FOR UPDATE;
    
    IF v_record IS NULL THEN
        -- First request
        INSERT INTO rate_limits (identifier, endpoint, request_count, window_start)
        VALUES (p_identifier, p_endpoint, 1, v_now);
        
        RETURN json_build_object('allowed', true, 'remaining', p_max_requests - 1);
    END IF;
    
    -- Check if window expired
    IF v_record.window_start + (p_window_seconds || ' seconds')::INTERVAL < v_now THEN
        -- Reset window
        UPDATE rate_limits
        SET request_count = 1, window_start = v_now
        WHERE id = v_record.id;
        
        RETURN json_build_object('allowed', true, 'remaining', p_max_requests - 1);
    END IF;
    
    -- Check if over limit
    IF v_record.request_count >= p_max_requests THEN
        RETURN json_build_object(
            'allowed', false, 
            'remaining', 0,
            'retry_after', EXTRACT(EPOCH FROM (v_record.window_start + (p_window_seconds || ' seconds')::INTERVAL - v_now))::INTEGER
        );
    END IF;
    
    -- Increment counter
    UPDATE rate_limits
    SET request_count = request_count + 1
    WHERE id = v_record.id;
    
    RETURN json_build_object('allowed', true, 'remaining', p_max_requests - v_record.request_count - 1);
END;
$$;

-- 3. Cleanup old records (run periodically)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM rate_limits
    WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$;

-- 4. Grant execute
GRANT EXECUTE ON FUNCTION check_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_rate_limits TO service_role;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON rate_limits(identifier, endpoint);
