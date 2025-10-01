-- Add service role bypass policies for merchant_projects table
-- This allows the service role to bypass RLS policies

-- Service role bypass for merchant_projects
CREATE POLICY "Service role bypass for merchant_projects" ON merchant_projects
  FOR ALL TO service_role USING (true);

-- Service role bypass for merchant_payment_plans  
CREATE POLICY "Service role bypass for merchant_payment_plans" ON merchant_payment_plans
  FOR ALL TO service_role USING (true);

-- Service role bypass for merchant_payment_sessions
CREATE POLICY "Service role bypass for merchant_payment_sessions" ON merchant_payment_sessions
  FOR ALL TO service_role USING (true);

-- Also ensure the service role can access other tables if needed
-- Add service role bypass for users table
CREATE POLICY "Service role bypass for users" ON users
  FOR ALL TO service_role USING (true);

-- Add service role bypass for transactions table
CREATE POLICY "Service role bypass for transactions" ON transactions
  FOR ALL TO service_role USING (true);

-- Add service role bypass for coupons table
CREATE POLICY "Service role bypass for coupons" ON coupons
  FOR ALL TO service_role USING (true);

-- Add service role bypass for api_keys table
CREATE POLICY "Service role bypass for api_keys" ON api_keys
  FOR ALL TO service_role USING (true);

-- Add service role bypass for investments table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investments') THEN
        EXECUTE 'CREATE POLICY "Service role bypass for investments" ON investments FOR ALL TO service_role USING (true)';
    END IF;
END
$$;

-- Add service role bypass for payment_validations table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_validations') THEN
        EXECUTE 'CREATE POLICY "Service role bypass for payment_validations" ON payment_validations FOR ALL TO service_role USING (true)';
    END IF;
END
$$;