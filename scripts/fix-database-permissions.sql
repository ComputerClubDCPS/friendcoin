-- Fix database permissions and RLS policies
-- This script addresses the "permission denied for table users" error

-- First, ensure RLS is properly configured for all tables
-- Disable RLS temporarily to set up proper policies
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE coupons DISABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;
DROP POLICY IF EXISTS "Public access for user creation" ON users;

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can create transactions" ON transactions;
DROP POLICY IF EXISTS "Service role can manage all transactions" ON transactions;

DROP POLICY IF EXISTS "Users can view own coupons" ON coupons;
DROP POLICY IF EXISTS "Users can create coupons" ON coupons;
DROP POLICY IF EXISTS "Users can redeem coupons" ON coupons;
DROP POLICY IF EXISTS "Service role can manage all coupons" ON coupons;

DROP POLICY IF EXISTS "Users can view own api keys" ON api_keys;
DROP POLICY IF EXISTS "Users can manage own api keys" ON api_keys;
DROP POLICY IF EXISTS "Service role can manage all api keys" ON api_keys;

-- Re-enable RLS with proper policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Allow service role to bypass RLS completely
CREATE POLICY "Service role bypass" ON users
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to view and update their own data
CREATE POLICY "Users can manage own data" ON users
  FOR ALL 
  TO authenticated
  USING (stack_user_id = auth.jwt() ->> 'sub')
  WITH CHECK (stack_user_id = auth.jwt() ->> 'sub');

-- Allow public access for user creation (needed for initialization)
CREATE POLICY "Public user creation" ON users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Transactions table policies
CREATE POLICY "Service role bypass transactions" ON transactions
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT
  TO authenticated
  USING (
    from_user_id = auth.jwt() ->> 'sub' OR 
    to_user_id = auth.jwt() ->> 'sub'
  );

CREATE POLICY "Users can create transactions" ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = auth.jwt() ->> 'sub');

-- Coupons table policies
CREATE POLICY "Service role bypass coupons" ON coupons
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view and create coupons" ON coupons
  FOR ALL
  TO authenticated
  USING (
    created_by = auth.jwt() ->> 'sub' OR 
    redeemed_by = auth.jwt() ->> 'sub' OR
    redeemed_by IS NULL
  )
  WITH CHECK (
    created_by = auth.jwt() ->> 'sub' OR
    redeemed_by = auth.jwt() ->> 'sub'
  );

-- API Keys table policies
CREATE POLICY "Service role bypass api_keys" ON api_keys
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage own api keys" ON api_keys
  FOR ALL
  TO authenticated
  USING (user_id = auth.jwt() ->> 'sub')
  WITH CHECK (user_id = auth.jwt() ->> 'sub');

-- Grant necessary permissions to authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions to anon role for user creation
GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT ON users TO anon;

-- Ensure service role has full access
GRANT ALL ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Create a function to help with user initialization that bypasses RLS
CREATE OR REPLACE FUNCTION initialize_user(
  p_stack_user_id TEXT,
  p_card_number TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  stack_user_id TEXT,
  balance_friendcoins INTEGER,
  balance_friendship_fractions INTEGER,
  card_number TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_interest_payment TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  generated_card_number TEXT;
  user_record RECORD;
BEGIN
  -- Check if user already exists
  SELECT * INTO user_record FROM users u WHERE u.stack_user_id = p_stack_user_id;
  
  IF FOUND THEN
    -- Return existing user
    RETURN QUERY SELECT 
      user_record.id,
      user_record.stack_user_id,
      user_record.balance_friendcoins,
      user_record.balance_friendship_fractions,
      user_record.card_number,
      user_record.created_at,
      user_record.updated_at,
      user_record.last_interest_payment;
    RETURN;
  END IF;
  
  -- Generate card number if not provided
  IF p_card_number IS NULL THEN
    generated_card_number := LPAD(FLOOR(RANDOM() * 10000000000000000)::TEXT, 16, '0');
  ELSE
    generated_card_number := p_card_number;
  END IF;
  
  -- Create new user
  INSERT INTO users (
    stack_user_id,
    balance_friendcoins,
    balance_friendship_fractions,
    card_number,
    last_interest_payment
  ) VALUES (
    p_stack_user_id,
    10,
    0,
    generated_card_number,
    NOW()
  ) RETURNING * INTO user_record;
  
  -- Return new user
  RETURN QUERY SELECT 
    user_record.id,
    user_record.stack_user_id,
    user_record.balance_friendcoins,
    user_record.balance_friendship_fractions,
    user_record.card_number,
    user_record.created_at,
    user_record.updated_at,
    user_record.last_interest_payment;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION initialize_user(TEXT, TEXT) TO authenticated, anon, service_role;
