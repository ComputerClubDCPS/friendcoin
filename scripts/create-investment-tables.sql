-- Create investments table
CREATE TABLE IF NOT EXISTS investments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    stock_symbol TEXT NOT NULL,
    stock_name TEXT NOT NULL,
    shares_owned DECIMAL(10,4) DEFAULT 0,
    total_invested_friendcoins INTEGER DEFAULT 0,
    total_invested_friendship_fractions INTEGER DEFAULT 0,
    current_value_usd DECIMAL(10,2) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment validations table
CREATE TABLE IF NOT EXISTS payment_validations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    validation_token TEXT UNIQUE NOT NULL,
    amount_friendcoins INTEGER NOT NULL,
    amount_friendship_fractions INTEGER NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stock prices cache table
CREATE TABLE IF NOT EXISTS stock_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol TEXT UNIQUE NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    change_percent DECIMAL(5,2) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_symbol ON investments(stock_symbol);
CREATE INDEX IF NOT EXISTS idx_payment_validations_user_id ON payment_validations(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_validations_token ON payment_validations(validation_token);
CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol ON stock_prices(symbol);
