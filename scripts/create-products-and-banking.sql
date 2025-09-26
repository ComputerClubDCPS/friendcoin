-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    price_friendcoins INTEGER NOT NULL,
    price_friendship_fractions INTEGER NOT NULL,
    category TEXT DEFAULT 'general',
    is_active BOOLEAN DEFAULT TRUE,
    stock_quantity INTEGER DEFAULT -1, -- -1 means unlimited
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create product purchases table
CREATE TABLE IF NOT EXISTS product_purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER DEFAULT 1,
    total_price_friendcoins INTEGER NOT NULL,
    total_price_friendship_fractions INTEGER NOT NULL,
    status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'completed',
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivery_info JSONB DEFAULT '{}'
);

-- Create loans table
CREATE TABLE IF NOT EXISTS loans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    principal_friendcoins INTEGER NOT NULL,
    principal_friendship_fractions INTEGER NOT NULL,
    interest_rate DECIMAL(5,4) DEFAULT 0.05, -- 5% weekly on unpaid friendship fractions
    amount_paid_friendcoins INTEGER DEFAULT 0,
    amount_paid_friendship_fractions INTEGER DEFAULT 0,
    status TEXT CHECK (status IN ('active', 'paid', 'defaulted', 'auto_deducted')) DEFAULT 'active',
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_interest_calculation TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create loan payments table
CREATE TABLE IF NOT EXISTS loan_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    loan_id UUID NOT NULL REFERENCES loans(id),
    payment_amount_friendcoins INTEGER NOT NULL,
    payment_amount_friendship_fractions INTEGER NOT NULL,
    payment_type TEXT CHECK (payment_type IN ('manual', 'auto_deduction', 'interest')) DEFAULT 'manual',
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create account restrictions table for debt management
CREATE TABLE IF NOT EXISTS account_restrictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    restriction_type TEXT CHECK (restriction_type IN ('debt_warning', 'banking_disabled', 'pending_deletion')) NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create banned users table
CREATE TABLE IF NOT EXISTS banned_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    ip_address TEXT,
    hardware_fingerprint TEXT,
    ban_reason TEXT NOT NULL,
    banned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ban_type TEXT CHECK (ban_type IN ('ip', 'hardware', 'account', 'all')) DEFAULT 'all'
);

-- Add currency circulation tracking
CREATE TABLE IF NOT EXISTS currency_circulation (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    total_base_coins INTEGER DEFAULT 2000, -- Hard limit base
    total_user_bonus_coins INTEGER DEFAULT 0, -- 10 per user
    total_coins_in_circulation INTEGER DEFAULT 2000,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial circulation data
INSERT INTO currency_circulation (total_base_coins, total_user_bonus_coins, total_coins_in_circulation) 
VALUES (2000, 0, 2000) 
ON CONFLICT DO NOTHING;

-- Add some sample products
INSERT INTO products (name, description, price_friendcoins, price_friendship_fractions, category) VALUES
('Premium Account Upgrade', 'Unlock premium features for 1 month', 5, 0, 'subscription'),
('Custom Profile Badge', 'Personalized badge for your profile', 2, 50, 'cosmetic'),
('Transaction Fee Waiver', 'No fees on next 10 transactions', 1, 0, 'utility'),
('Priority Support', '24/7 priority customer support for 1 month', 3, 0, 'service'),
('Digital Gift Card', 'Send a digital gift card to friends', 10, 0, 'gift')
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_product_purchases_user_id ON product_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_product_purchases_product_id ON product_purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_due_date ON loans(due_date);
CREATE INDEX IF NOT EXISTS idx_account_restrictions_user_id ON account_restrictions(user_id);
CREATE INDEX IF NOT EXISTS idx_banned_users_ip ON banned_users(ip_address);
CREATE INDEX IF NOT EXISTS idx_banned_users_hardware ON banned_users(hardware_fingerprint);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_circulation ENABLE ROW LEVEL SECURITY;

-- RLS Policie



CREATE POLICY "Users can view own purchases" ON product_purchases
  FOR SELECT USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can view own loans" ON loans
  FOR SELECT USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can view own loan payments" ON loan_payments
  FOR SELECT USING (
    loan_id IN (SELECT id FROM loans WHERE user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "Users can view own restrictions" ON account_restrictions
  FOR SELECT USING (user_id = auth.jwt() ->> 'sub');

-- Currency circulation is read-only for users
CREATE POLICY "Currency circulation is viewable" ON currency_circulation FOR SELECT USING (true);
