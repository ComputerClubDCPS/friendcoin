-- Create table to cache stock data and reduce API calls
CREATE TABLE IF NOT EXISTS stock_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    change_amount DECIMAL(10,2) NOT NULL,
    change_percent DECIMAL(5,2) NOT NULL,
    volume BIGINT,
    market_cap TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_stock_cache_symbol ON stock_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_cache_updated ON stock_cache(last_updated);

-- Enable RLS
ALTER TABLE stock_cache ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read stock data
CREATE POLICY "Anyone can read stock cache" ON stock_cache
    FOR SELECT USING (true);

-- Only service role can update stock data
CREATE POLICY "Service role can manage stock cache" ON stock_cache
    FOR ALL TO service_role USING (true);
