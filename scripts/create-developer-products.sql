-- Create developer products and subscriptions tables
CREATE TABLE IF NOT EXISTS developer_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    developer_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price_friendcoins INTEGER NOT NULL DEFAULT 0,
    price_friendship_fractions INTEGER NOT NULL DEFAULT 0,
    product_type TEXT NOT NULL DEFAULT 'one_time' CHECK (product_type IN ('one_time', 'subscription')),
    webhook_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS developer_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    developer_id TEXT NOT NULL,
    product_id UUID REFERENCES developer_products(id) ON DELETE CASCADE,
    billing_interval TEXT NOT NULL CHECK (billing_interval IN ('monthly', 'yearly')),
    trial_days INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    product_id UUID REFERENCES developer_products(id) ON DELETE CASCADE,
    developer_id TEXT NOT NULL,
    amount_paid_friendcoins INTEGER NOT NULL DEFAULT 0,
    amount_paid_friendship_fractions INTEGER NOT NULL DEFAULT 0,
    purchase_type TEXT NOT NULL DEFAULT 'one_time',
    subscription_id UUID REFERENCES developer_subscriptions(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    subscription_id UUID REFERENCES developer_subscriptions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES developer_products(id) ON DELETE CASCADE,
    developer_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add account_number column to merchant_projects if it doesn't exist
ALTER TABLE merchant_projects ADD COLUMN IF NOT EXISTS account_number TEXT;

-- Add notes column to transactions if it doesn't exist
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create recent_transfers table for quick access to recent recipients
CREATE TABLE IF NOT EXISTS recent_transfers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    to_display_name TEXT,
    last_transfer_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    transfer_count INTEGER DEFAULT 1,
    UNIQUE(from_user_id, to_user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_developer_products_developer_id ON developer_products(developer_id);
CREATE INDEX IF NOT EXISTS idx_developer_products_active ON developer_products(is_active);
CREATE INDEX IF NOT EXISTS idx_product_purchases_user_id ON product_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_product_purchases_developer_id ON product_purchases(developer_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_recent_transfers_from_user ON recent_transfers(from_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_notes ON transactions(notes);

-- Enable RLS (but don't use auth.jwt() since we're not using Supabase auth)
ALTER TABLE developer_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recent_transfers ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policies that allow all operations for now
-- In production, you'd want more restrictive policies
CREATE POLICY "Allow all operations on developer_products" ON developer_products FOR ALL USING (true);
CREATE POLICY "Allow all operations on developer_subscriptions" ON developer_subscriptions FOR ALL USING (true);
CREATE POLICY "Allow all operations on product_purchases" ON product_purchases FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_subscriptions" ON user_subscriptions FOR ALL USING (true);
CREATE POLICY "Allow all operations on recent_transfers" ON recent_transfers FOR ALL USING (true);
