-- Fix the missing developer_products table and related schema issues
-- This addresses the "developer_id" column not found error

-- Create developer_products table if it doesn't exist
CREATE TABLE IF NOT EXISTS developer_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    developer_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price_friendcoins INTEGER NOT NULL DEFAULT 0,
    price_friendship_fractions INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create product_subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS product_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    developer_id TEXT NOT NULL,
    product_id UUID REFERENCES developer_products(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create product_purchases table if it doesn't exist (update existing)
ALTER TABLE product_purchases 
ADD COLUMN IF NOT EXISTS developer_id TEXT;

-- Create product_revenue table if it doesn't exist
CREATE TABLE IF NOT EXISTS product_revenue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    developer_id TEXT NOT NULL,
    product_id UUID REFERENCES developer_products(id) ON DELETE CASCADE,
    purchase_id UUID REFERENCES product_purchases(id) ON DELETE CASCADE,
    amount_friendcoins INTEGER NOT NULL DEFAULT 0,
    amount_friendship_fractions INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_developer_products_developer_id ON developer_products(developer_id);
CREATE INDEX IF NOT EXISTS idx_product_subscriptions_developer_id ON product_subscriptions(developer_id);
CREATE INDEX IF NOT EXISTS idx_product_purchases_developer_id ON product_purchases(developer_id);
CREATE INDEX IF NOT EXISTS idx_product_revenue_developer_id ON product_revenue(developer_id);

-- Enable RLS on new tables
ALTER TABLE developer_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_revenue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own developer products" ON developer_products
    FOR ALL USING (developer_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can view their own subscriptions" ON product_subscriptions
    FOR ALL USING (user_id = auth.jwt() ->> 'sub' OR developer_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can view their own revenue" ON product_revenue
    FOR ALL USING (developer_id = auth.jwt() ->> 'sub');

-- Service role bypass policies
CREATE POLICY "Service role can manage all developer products" ON developer_products
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role can manage all subscriptions" ON product_subscriptions
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role can manage all revenue" ON product_revenue
    FOR ALL TO service_role USING (true);
