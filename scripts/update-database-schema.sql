-- Add external_reference to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS external_reference TEXT;

-- Add webhook_url to api_keys table
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS webhook_url TEXT;

-- Create payment_plans table
CREATE TABLE IF NOT EXISTS payment_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    amount_friendcoins INTEGER NOT NULL,
    amount_friendship_fractions INTEGER NOT NULL,
    currency TEXT DEFAULT 'f€',
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(api_key_id, external_id)
);

-- Create payment_sessions table
CREATE TABLE IF NOT EXISTS payment_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_plan_id UUID NOT NULL REFERENCES payment_plans(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    customer_email TEXT,
    customer_name TEXT,
    amount_friendcoins INTEGER NOT NULL,
    amount_friendship_fractions INTEGER NOT NULL,
    status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'expired')) DEFAULT 'pending',
    payment_method TEXT,
    transaction_id UUID REFERENCES transactions(id),
    external_reference TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_plans_api_key_id ON payment_plans(api_key_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_external_id ON payment_plans(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_token ON payment_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_plan_id ON payment_sessions(payment_plan_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_status ON payment_sessions(status);

-- Update RLS policies for new tables
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;

-- Payment plans policies (accessible via API key ownership)
CREATE POLICY "API key owners can manage payment plans" ON payment_plans
  FOR ALL USING (
    api_key_id IN (
      SELECT id FROM api_keys WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

-- Payment sessions policies (accessible via payment plan ownership)
CREATE POLICY "Payment plan owners can view sessions" ON payment_sessions
  FOR SELECT USING (
    payment_plan_id IN (
      SELECT pp.id FROM payment_plans pp
      JOIN api_keys ak ON pp.api_key_id = ak.id
      WHERE ak.user_id = auth.jwt() ->> 'sub'
    )
  );

-- Public access for payment processing (sessions can be accessed by token)
CREATE POLICY "Public access to payment sessions by token" ON payment_sessions
  FOR SELECT USING (true);

CREATE POLICY "Public update for payment completion" ON payment_sessions
  FOR UPDATE USING (true);
