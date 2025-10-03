-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_revenue ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (stack_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (stack_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (stack_user_id = auth.jwt() ->> 'sub');

-- Transactions table policies
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (
    from_user_id = auth.jwt() ->> 'sub' OR 
    to_user_id = auth.jwt() ->> 'sub'
  );

CREATE POLICY "Users can create transactions from their account" ON transactions
  FOR INSERT WITH CHECK (from_user_id = auth.jwt() ->> 'sub');

-- Coupons table policies
CREATE POLICY "Users can view own created coupons" ON coupons
  FOR SELECT USING (created_by = auth.jwt() ->> 'sub');

CREATE POLICY "Users can create coupons" ON coupons
  FOR INSERT WITH CHECK (created_by = auth.jwt() ->> 'sub');

CREATE POLICY "Users can redeem any unredeemed coupon" ON coupons
  FOR UPDATE USING (is_redeemed = false);

-- API keys table policies
CREATE POLICY "Users can view own API keys" ON api_keys
  FOR SELECT USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can create own API keys" ON api_keys
  FOR INSERT WITH CHECK (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update own API keys" ON api_keys
  FOR UPDATE USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can delete own API keys" ON api_keys
  FOR DELETE USING (user_id = auth.jwt() ->> 'sub');

-- Investments table policies
CREATE POLICY "Users can view own investments" ON investments
  FOR SELECT USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can create own investments" ON investments
  FOR INSERT WITH CHECK (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update own investments" ON investments
  FOR UPDATE USING (user_id = auth.jwt() ->> 'sub');

-- Payment validations table policies
CREATE POLICY "Users can view own payment validations" ON payment_validations
  FOR SELECT USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can create payment validations" ON payment_validations
  FOR INSERT WITH CHECK (user_id = auth.jwt() ->> 'sub');

-- Merchant projects table policies
CREATE POLICY "Users can view own merchant projects" ON merchant_projects
  FOR SELECT USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can view all merchant projects for transaction history" ON merchant_projects
  FOR SELECT USING (true);

CREATE POLICY "Users can create own merchant projects" ON merchant_projects
  FOR INSERT WITH CHECK (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update own merchant projects" ON merchant_projects
  FOR UPDATE USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can delete own merchant projects" ON merchant_projects
  FOR DELETE USING (user_id = auth.jwt() ->> 'sub');

-- Developer products table policies
CREATE POLICY "Users can view own developer products" ON developer_products
  FOR SELECT USING (developer_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can create own developer products" ON developer_products
  FOR INSERT WITH CHECK (developer_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update own developer products" ON developer_products
  FOR UPDATE USING (developer_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can delete own developer products" ON developer_products
  FOR DELETE USING (developer_id = auth.jwt() ->> 'sub');

-- Product subscriptions table policies  
CREATE POLICY "Users can view their own subscriptions" ON product_subscriptions
  FOR SELECT USING (user_id = auth.jwt() ->> 'sub' OR developer_id = auth.jwt() ->> 'sub');

CREATE POLICY "Developers can create subscriptions for their products" ON product_subscriptions
  FOR INSERT WITH CHECK (developer_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update their own subscriptions" ON product_subscriptions
  FOR UPDATE USING (user_id = auth.jwt() ->> 'sub' OR developer_id = auth.jwt() ->> 'sub');

-- Product revenue table policies
CREATE POLICY "Developers can view their own revenue" ON product_revenue
  FOR SELECT USING (developer_id = auth.jwt() ->> 'sub');

CREATE POLICY "Developers can create revenue records" ON product_revenue
  FOR INSERT WITH CHECK (developer_id = auth.jwt() ->> 'sub');
