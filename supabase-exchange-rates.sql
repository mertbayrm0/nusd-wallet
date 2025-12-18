-- Exchange Rates tablosu
-- 10 dakikada bir güncellenen USDT/TRY kur verisi
-- İki yönlü spread: Alım +0.20, Satım -0.20

CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pair VARCHAR(20) NOT NULL DEFAULT 'USDT/TRY',
    rate DECIMAL(18, 4) NOT NULL,           -- Piyasa kuru (CoinGecko)
    buy_rate DECIMAL(18, 4) NOT NULL,       -- Alım kuru (rate + spread) - Kullanıcı USDT alırken
    sell_rate DECIMAL(18, 4) NOT NULL,      -- Satım kuru (rate - spread) - Kullanıcı USDT satarken
    spread DECIMAL(18, 4) NOT NULL DEFAULT 0.20,
    source VARCHAR(50) NOT NULL DEFAULT 'coingecko',
    fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair_fetched 
ON exchange_rates(pair, fetched_at DESC);

-- RLS Policies
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Everyone can read exchange rates
CREATE POLICY "exchange_rates_public_read" ON exchange_rates
    FOR SELECT USING (true);

-- Only service role can insert/update
CREATE POLICY "exchange_rates_service_insert" ON exchange_rates
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Function to get current rate
CREATE OR REPLACE FUNCTION get_current_usdt_rate()
RETURNS TABLE (
    rate DECIMAL,
    buy_rate DECIMAL,
    sell_rate DECIMAL,
    spread DECIMAL,
    fetched_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        er.rate,
        er.buy_rate,
        er.sell_rate,
        er.spread,
        er.fetched_at
    FROM exchange_rates er
    WHERE er.pair = 'USDT/TRY'
    ORDER BY er.fetched_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_current_usdt_rate() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_usdt_rate() TO anon;
