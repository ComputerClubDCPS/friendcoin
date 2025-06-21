-- Create merchant projects table
CREATE TABLE IF NOT EXISTS merchant_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    api_key TEXT UNIQUE NOT NULL,
    webhook_url TEXT,
    database_url TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create merchant payment plans table
CREATE TABLE IF NOT EXISTS merchant_payment_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES merchant_projects(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    amount_friendcoins INTEGER NOT NULL,
    amount_friendship_fractions INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, external_id)
);

-- Create merchant payment sessions table
CREATE TABLE IF NOT EXISTS merchant_payment_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES merchant_projects(id) ON DELETE CASCADE,
    payment_plan_id UUID NOT NULL REFERENCES merchant_payment_plans(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    validation_code TEXT UNIQUE,
    customer_email TEXT,
    customer_name TEXT,
    amount_friendcoins INTEGER NOT NULL,
    amount_friendship_fractions INTEGER NOT NULL,
    return_url TEXT,
    metadata JSONB DEFAULT '{}',
    status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'expired')) DEFAULT 'pending',
    transaction_id UUID REFERENCES transactions(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add merchant_project_id to transactions table for merchant branding
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS merchant_project_id UUID REFERENCES merchant_projects(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_merchant_projects_user_id ON merchant_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_projects_api_key ON merchant_projects(api_key);
CREATE INDEX IF NOT EXISTS idx_merchant_payment_plans_project_id ON merchant_payment_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_merchant_payment_plans_external_id ON merchant_payment_plans(external_id);
CREATE INDEX IF NOT EXISTS idx_merchant_payment_sessions_token ON merchant_payment_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_merchant_payment_sessions_validation_code ON merchant_payment_sessions(validation_code);
CREATE INDEX IF NOT EXISTS idx_merchant_payment_sessions_project_id ON merchant_payment_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant_project_id ON transactions(merchant_project_id);

-- Enable RLS
ALTER TABLE merchant_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_payment_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for merchant_projects
CREATE POLICY "Users can manage own projects" ON merchant_projects
  FOR ALL USING (user_id = auth.jwt() ->> 'sub');

-- RLS Policies for merchant_payment_plans
CREATE POLICY "Project owners can manage payment plans" ON merchant_payment_plans
  FOR ALL USING (
    project_id IN (
      SELECT id FROM merchant_projects WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

-- RLS Policies for merchant_payment_sessions
CREATE POLICY "Project owners can view sessions" ON merchant_payment_sessions
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM merchant_projects WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

-- Public access for payment processing
CREATE POLICY "Public access to sessions by token" ON merchant_payment_sessions
  FOR SELECT USING (true);

CREATE POLICY "Public update for payment completion" ON merchant_payment_sessions
  FOR UPDATE USING (true);
