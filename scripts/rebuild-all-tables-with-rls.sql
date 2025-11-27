-- Comprehensive database rebuild script with ALL tables and complete RLS policies
-- This script drops all existing tables and policies, then recreates them with proper security

-- =====================================================================
-- 1. PRE-REBUILD CLEANUP (Triggers, Policies, Constraints)
-- =====================================================================

-- Disable triggers to allow drops (Note: This assumes your triggers are named USER, which is uncommon)
ALTER TABLE IF EXISTS transactions DISABLE TRIGGER USER;
ALTER TABLE IF EXISTS loan_payments DISABLE TRIGGER USER;
ALTER TABLE IF EXISTS investments DISABLE TRIGGER USER;
ALTER TABLE IF EXISTS product_purchases DISABLE TRIGGER USER;
ALTER TABLE IF EXISTS product_revenue DISABLE TRIGGER USER;
ALTER TABLE IF EXISTS product_subscriptions DISABLE TRIGGER USER;
ALTER TABLE IF EXISTS developer_subscriptions DISABLE TRIGGER USER;
ALTER TABLE IF EXISTS merchant_projects DISABLE TRIGGER USER;
ALTER TABLE IF EXISTS merchant_payment_plans DISABLE TRIGGER USER;
ALTER TABLE IF EXISTS merchant_payment_sessions DISABLE TRIGGER USER;
ALTER TABLE IF EXISTS payment_plans DISABLE TRIGGER USER;
ALTER TABLE IF EXISTS payment_sessions DISABLE TRIGGER USER;
ALTER TABLE IF EXISTS payment_validations DISABLE TRIGGER USER;
ALTER TABLE IF EXISTS developer_products DISABLE TRIGGER USER;
ALTER TABLE IF EXISTS coupons DISABLE TRIGGER USER;
ALTER TABLE IF EXISTS loans DISABLE TRIGGER USER;
ALTER TABLE IF EXISTS recent_transfers DISABLE TRIGGER USER;
ALTER TABLE IF EXISTS stock_prices DISABLE TRIGGER USER;
ALTER TABLE IF EXISTS stock_cache DISABLE TRIGGER USER;
ALTER TABLE IF EXISTS api_keys DISABLE TRIGGER USER;
ALTER TABLE IF EXISTS account_restrictions DISABLE TRIGGER USER;
ALTER TABLE IF EXISTS banned_users DISABLE TRIGGER USER;
ALTER TABLE IF EXISTS user_subscriptions DISABLE TRIGGER USER;
ALTER TABLE IF EXISTS products DISABLE TRIGGER USER;
ALTER TABLE IF EXISTS currency_circulation DISABLE TRIGGER USER;
ALTER TABLE IF EXISTS system_logs DISABLE TRIGGER USER;

-- Drop all policies from all tables
DO $$
DECLARE
    r RECORD;
    policy RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        FOR policy IN (SELECT policyname FROM pg_policies WHERE schemaname = r.schemaname AND tablename = r.tablename) LOOP
            -- Use consistent quoting for safety
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy.policyname) || ' ON ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename);
        END LOOP;
    END LOOP;
END $$;

-- Drop all foreign key constraints (Keeping this section as requested, though CASCADE drop will handle most)
ALTER TABLE IF EXISTS transactions DROP CONSTRAINT IF EXISTS transactions_from_user_id_fkey;
ALTER TABLE IF EXISTS transactions DROP CONSTRAINT IF EXISTS transactions_to_user_id_fkey;
ALTER TABLE IF EXISTS transactions DROP CONSTRAINT IF EXISTS transactions_merchant_project_id_fkey;
ALTER TABLE IF EXISTS loan_payments DROP CONSTRAINT IF EXISTS loan_payments_loan_id_fkey;
ALTER TABLE IF EXISTS loans DROP CONSTRAINT IF EXISTS loans_user_id_fkey;
ALTER TABLE IF EXISTS investments DROP CONSTRAINT IF EXISTS investments_user_id_fkey;
ALTER TABLE IF EXISTS product_purchases DROP CONSTRAINT IF EXISTS product_purchases_product_id_fkey;
ALTER TABLE IF EXISTS product_purchases DROP CONSTRAINT IF EXISTS product_purchases_user_id_fkey;
ALTER TABLE IF EXISTS product_purchases DROP CONSTRAINT IF EXISTS product_purchases_developer_id_fkey;
ALTER TABLE IF EXISTS product_revenue DROP CONSTRAINT IF EXISTS product_revenue_purchase_id_fkey;
ALTER TABLE IF EXISTS product_revenue DROP CONSTRAINT IF EXISTS product_revenue_product_id_fkey;
ALTER TABLE IF EXISTS product_revenue DROP CONSTRAINT IF EXISTS product_revenue_developer_id_fkey;
ALTER TABLE IF EXISTS product_subscriptions DROP CONSTRAINT IF EXISTS product_subscriptions_product_id_fkey;
ALTER TABLE IF EXISTS product_subscriptions DROP CONSTRAINT IF EXISTS product_subscriptions_user_id_fkey;
ALTER TABLE IF EXISTS product_subscriptions DROP CONSTRAINT IF EXISTS product_subscriptions_developer_id_fkey;
ALTER TABLE IF EXISTS developer_subscriptions DROP CONSTRAINT IF EXISTS developer_subscriptions_product_id_fkey;
ALTER TABLE IF EXISTS developer_subscriptions DROP CONSTRAINT IF EXISTS developer_subscriptions_developer_id_fkey;
ALTER TABLE IF EXISTS developer_products DROP CONSTRAINT IF EXISTS developer_products_developer_id_fkey;
ALTER TABLE IF EXISTS coupons DROP CONSTRAINT IF EXISTS coupons_created_by_fkey;
ALTER TABLE IF EXISTS coupons DROP CONSTRAINT IF EXISTS coupons_redeemed_by_fkey;
ALTER TABLE IF EXISTS merchant_projects DROP CONSTRAINT IF EXISTS merchant_projects_user_id_fkey;
ALTER TABLE IF EXISTS merchant_payment_plans DROP CONSTRAINT IF EXISTS merchant_payment_plans_project_id_fkey;
ALTER TABLE IF EXISTS merchant_payment_sessions DROP CONSTRAINT IF EXISTS merchant_payment_sessions_project_id_fkey;
ALTER TABLE IF EXISTS merchant_payment_sessions DROP CONSTRAINT IF EXISTS merchant_payment_sessions_payment_plan_id_fkey;
ALTER TABLE IF EXISTS merchant_payment_sessions DROP CONSTRAINT IF EXISTS merchant_payment_sessions_transaction_id_fkey;
ALTER TABLE IF EXISTS payment_plans DROP CONSTRAINT IF EXISTS payment_plans_api_key_id_fkey;
ALTER TABLE IF EXISTS payment_sessions DROP CONSTRAINT IF EXISTS payment_sessions_payment_plan_id_fkey;
ALTER TABLE IF EXISTS payment_sessions DROP CONSTRAINT IF EXISTS payment_sessions_transaction_id_fkey;
ALTER TABLE IF EXISTS payment_validations DROP CONSTRAINT IF EXISTS payment_validations_user_id_fkey;
ALTER TABLE IF EXISTS api_keys DROP CONSTRAINT IF EXISTS api_keys_user_id_fkey;
ALTER TABLE IF EXISTS account_restrictions DROP CONSTRAINT IF EXISTS account_restrictions_user_id_fkey;
ALTER TABLE IF EXISTS banned_users DROP CONSTRAINT IF EXISTS banned_users_user_id_fkey;
ALTER TABLE IF EXISTS user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_fkey;
ALTER TABLE IF EXISTS user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_product_id_fkey;
ALTER TABLE IF EXISTS user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_developer_id_fkey;
ALTER TABLE IF EXISTS recent_transfers DROP CONSTRAINT IF EXISTS recent_transfers_from_user_id_fkey;
ALTER TABLE IF EXISTS recent_transfers DROP CONSTRAINT IF EXISTS recent_transfers_to_user_id_fkey;

-- Drop all tables (CASCADE ensures dependent objects like FKs are dropped, though we tried manually above)
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS product_revenue CASCADE;
DROP TABLE IF EXISTS product_subscriptions CASCADE;
DROP TABLE IF EXISTS product_purchases CASCADE;
DROP TABLE IF EXISTS loan_payments CASCADE;
DROP TABLE IF EXISTS loans CASCADE;
DROP TABLE IF EXISTS investments CASCADE;
DROP TABLE IF EXISTS payment_validations CASCADE;
DROP TABLE IF EXISTS payment_sessions CASCADE;
DROP TABLE IF EXISTS payment_plans CASCADE;
DROP TABLE IF EXISTS merchant_payment_sessions CASCADE;
DROP TABLE IF EXISTS merchant_payment_plans CASCADE;
DROP TABLE IF EXISTS merchant_projects CASCADE;
DROP TABLE IF EXISTS developer_subscriptions CASCADE;
DROP TABLE IF EXISTS developer_products CASCADE;
DROP TABLE IF EXISTS recent_transfers CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS stock_prices CASCADE;
DROP TABLE IF EXISTS stock_cache CASCADE;
DROP TABLE IF EXISTS system_logs CASCADE;
DROP TABLE IF EXISTS user_subscriptions CASCADE;
DROP TABLE IF EXISTS account_restrictions CASCADE;
ALTER TABLE IF EXISTS api_keys DROP CONSTRAINT IF EXISTS api_keys_user_id_fkey; -- Explicitly handle this one separately if it causes issues during initial table drops
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS banned_users CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS currency_circulation CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================================
-- 2. RECREATE TABLES AND CONSTRAINTS
-- =====================================================================

-- Users table - base table for all user data
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stack_user_id text NOT NULL UNIQUE, -- Assumed to be the authenticated user ID (text representation)
    balance_friendcoins integer NOT NULL DEFAULT 0,
    balance_friendship_fractions integer NOT NULL DEFAULT 0,
    card_number text,
    last_interest_payment timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- Policies for users: Only the user themselves or service_role can access their own data.
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid()::text = stack_user_id OR auth.role() = 'service_role');
-- FIX: INSERT policies must only use WITH CHECK
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid()::text = stack_user_id OR auth.role() = 'service_role');
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid()::text = stack_user_id OR auth.role() = 'service_role') WITH CHECK (auth.uid()::text = stack_user_id OR auth.role() = 'service_role');
CREATE POLICY "users_delete_own" ON users FOR DELETE USING (auth.uid()::text = stack_user_id OR auth.role() = 'service_role');


-- Transactions table
CREATE TABLE transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id text NOT NULL REFERENCES users(stack_user_id) ON DELETE CASCADE,
    to_user_id text NOT NULL REFERENCES users(stack_user_id) ON DELETE CASCADE,
    transaction_type text NOT NULL,
    amount_friendcoins integer NOT NULL DEFAULT 0,
    amount_friendship_fractions integer NOT NULL DEFAULT 0,
    tax_amount integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'completed',
    external_reference text,
    merchant_project_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_select_own" ON transactions FOR SELECT USING (auth.uid()::text = from_user_id OR auth.uid()::text = to_user_id OR auth.role() = 'service_role');
-- FIX: INSERT policy correction
CREATE POLICY "transactions_insert_own" ON transactions FOR INSERT WITH CHECK (auth.uid()::text = from_user_id OR auth.role() = 'service_role');
CREATE POLICY "transactions_update_service" ON transactions FOR UPDATE USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');


-- Coupons table
CREATE TABLE coupons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    amount_friendcoins integer NOT NULL,
    amount_friendship_fractions integer NOT NULL,
    created_by text NOT NULL REFERENCES users(stack_user_id) ON DELETE CASCADE,
    is_redeemed boolean NOT NULL DEFAULT false,
    redeemed_by text REFERENCES users(stack_user_id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now(),
    redeemed_at timestamp with time zone
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons_select_all" ON coupons FOR SELECT USING (true);
-- FIX: INSERT policy correction
CREATE POLICY "coupons_insert_own" ON coupons FOR INSERT WITH CHECK (auth.uid()::text = created_by OR auth.role() = 'service_role');
CREATE POLICY "coupons_update_redeem" ON coupons FOR UPDATE USING (NOT is_redeemed OR auth.role() = 'service_role') WITH CHECK (NOT is_redeemed OR auth.role() = 'service_role');


-- Loans table
CREATE TABLE loans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES users(stack_user_id) ON DELETE CASCADE,
    principal_friendcoins integer NOT NULL DEFAULT 0,
    principal_friendship_fractions integer NOT NULL DEFAULT 0,
    interest_rate numeric NOT NULL DEFAULT 0.05,
    amount_paid_friendcoins integer NOT NULL DEFAULT 0,
    amount_paid_friendship_fractions integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'active',
    created_at timestamp with time zone DEFAULT now(),
    due_date timestamp with time zone,
    last_interest_calculation timestamp with time zone DEFAULT now()
);

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loans_select_own" ON loans FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');
-- FIX: Loans INSERT/UPDATE should only use WITH CHECK
CREATE POLICY "loans_insert_service" ON loans FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "loans_update_service" ON loans FOR UPDATE USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');


-- Loan payments table
CREATE TABLE loan_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    payment_amount_friendcoins integer NOT NULL DEFAULT 0,
    payment_amount_friendship_fractions integer NOT NULL DEFAULT 0,
    payment_type text NOT NULL DEFAULT 'principal',
    payment_date timestamp with time zone DEFAULT now()
);

ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loan_payments_select_own" ON loan_payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM loans WHERE loans.id = loan_payments.loan_id AND loans.user_id = auth.uid()::text) OR auth.role() = 'service_role'
);
-- FIX: INSERT policy correction
CREATE POLICY "loan_payments_insert_service" ON loan_payments FOR INSERT WITH CHECK (auth.role() = 'service_role');


-- Investments table
CREATE TABLE investments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES users(stack_user_id) ON DELETE CASCADE,
    stock_symbol text NOT NULL,
    stock_name text NOT NULL,
    shares_owned numeric NOT NULL DEFAULT 0,
    total_invested_friendcoins integer NOT NULL DEFAULT 0,
    total_invested_friendship_fractions integer NOT NULL DEFAULT 0,
    current_value_usd numeric NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    last_updated timestamp with time zone DEFAULT now()
);

ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "investments_select_own" ON investments FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');
CREATE POLICY "investments_manage_own" ON investments FOR ALL USING (auth.uid()::text = user_id OR auth.role() = 'service_role') WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');


-- Developer products table
CREATE TABLE developer_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    developer_id text NOT NULL REFERENCES users(stack_user_id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    price_friendcoins integer NOT NULL DEFAULT 0,
    price_friendship_fractions integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE developer_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "developer_products_select_all" ON developer_products FOR SELECT USING (true);
CREATE POLICY "developer_products_manage_own" ON developer_products FOR ALL USING (auth.uid()::text = developer_id OR auth.role() = 'service_role') WITH CHECK (auth.uid()::text = developer_id OR auth.role() = 'service_role');


-- Product purchases table
CREATE TABLE product_purchases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES users(stack_user_id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES developer_products(id) ON DELETE CASCADE,
    developer_id text NOT NULL REFERENCES users(stack_user_id) ON DELETE CASCADE,
    quantity integer NOT NULL DEFAULT 1,
    total_price_friendcoins integer NOT NULL DEFAULT 0,
    total_price_friendship_fractions integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'completed',
    delivery_info jsonb,
    purchase_date timestamp with time zone DEFAULT now()
);

ALTER TABLE product_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_purchases_select_own" ON product_purchases FOR SELECT USING (auth.uid()::text = user_id OR auth.uid()::text = developer_id OR auth.role() = 'service_role');
-- FIX: INSERT policy correction
CREATE POLICY "product_purchases_insert_service" ON product_purchases FOR INSERT WITH CHECK (auth.role() = 'service_role');


-- Product revenue table
CREATE TABLE product_revenue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id uuid NOT NULL REFERENCES product_purchases(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES developer_products(id) ON DELETE CASCADE,
    developer_id text NOT NULL REFERENCES users(stack_user_id) ON DELETE CASCADE,
    amount_friendcoins integer NOT NULL DEFAULT 0,
    amount_friendship_fractions integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE product_revenue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_revenue_select_own" ON product_revenue FOR SELECT USING (auth.uid()::text = developer_id OR auth.role() = 'service_role');
CREATE POLICY "product_revenue_manage_service" ON product_revenue FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');


-- Product subscriptions table
CREATE TABLE product_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES developer_products(id) ON DELETE CASCADE,
    user_id text NOT NULL REFERENCES users(stack_user_id) ON DELETE CASCADE,
    developer_id text NOT NULL REFERENCES users(stack_user_id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'active',
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE product_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_subscriptions_select_own" ON product_subscriptions FOR SELECT USING (auth.uid()::text = user_id OR auth.uid()::text = developer_id OR auth.role() = 'service_role');
CREATE POLICY "product_subscriptions_manage_service" ON product_subscriptions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');


-- Developer subscriptions table
CREATE TABLE developer_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES developer_products(id) ON DELETE CASCADE,
    developer_id text NOT NULL REFERENCES users(stack_user_id) ON DELETE CASCADE,
    billing_interval text NOT NULL DEFAULT 'monthly',
    trial_days integer DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE developer_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "developer_subscriptions_select_own" ON developer_subscriptions FOR SELECT USING (auth.uid()::text = developer_id OR auth.role() = 'service_role');
CREATE POLICY "developer_subscriptions_manage_own" ON developer_subscriptions FOR ALL USING (auth.uid()::text = developer_id OR auth.role() = 'service_role') WITH CHECK (auth.uid()::text = developer_id OR auth.role() = 'service_role');


-- Merchant projects table
CREATE TABLE merchant_projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES users(stack_user_id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    api_key text NOT NULL UNIQUE,
    account_number text,
    webhook_url text,
    database_url text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE merchant_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merchant_projects_select_own" ON merchant_projects FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');
CREATE POLICY "merchant_projects_manage_own" ON merchant_projects FOR ALL USING (auth.uid()::text = user_id OR auth.role() = 'service_role') WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');


-- Merchant payment plans table
CREATE TABLE merchant_payment_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES merchant_projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    amount_friendcoins integer NOT NULL DEFAULT 0,
    amount_friendship_fractions integer NOT NULL DEFAULT 0,
    external_id text,
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE merchant_payment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merchant_payment_plans_select_own" ON merchant_payment_plans FOR SELECT USING (
    EXISTS (SELECT 1 FROM merchant_projects WHERE merchant_projects.id = merchant_payment_plans.project_id AND merchant_projects.user_id = auth.uid()::text) OR auth.role() = 'service_role'
);
CREATE POLICY "merchant_payment_plans_manage_own" ON merchant_payment_plans FOR ALL USING (
    EXISTS (SELECT 1 FROM merchant_projects WHERE merchant_projects.id = merchant_payment_plans.project_id AND merchant_projects.user_id = auth.uid()::text) OR auth.role() = 'service_role'
) WITH CHECK (EXISTS (SELECT 1 FROM merchant_projects WHERE merchant_projects.id = merchant_payment_plans.project_id AND merchant_projects.user_id = auth.uid()::text) OR auth.role() = 'service_role');


-- Merchant payment sessions table
CREATE TABLE merchant_payment_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES merchant_projects(id) ON DELETE CASCADE,
    payment_plan_id uuid NOT NULL REFERENCES merchant_payment_plans(id) ON DELETE CASCADE,
    session_token text NOT NULL UNIQUE,
    validation_code text,
    status text NOT NULL DEFAULT 'pending',
    amount_friendcoins integer NOT NULL DEFAULT 0,
    amount_friendship_fractions integer NOT NULL DEFAULT 0,
    customer_name text,
    customer_email text,
    return_url text,
    transaction_id uuid,
    completed_at timestamp with time zone,
    expires_at timestamp with time zone,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE merchant_payment_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merchant_payment_sessions_select_owner" ON merchant_payment_sessions FOR SELECT USING (
    EXISTS (SELECT 1 FROM merchant_projects WHERE merchant_projects.id = merchant_payment_sessions.project_id AND merchant_projects.user_id = auth.uid()::text) OR auth.role() = 'service_role'
);
CREATE POLICY "merchant_payment_sessions_select_public" ON merchant_payment_sessions FOR SELECT USING (true);
CREATE POLICY "merchant_payment_sessions_update_service" ON merchant_payment_sessions FOR UPDATE USING (true) WITH CHECK (auth.role() = 'service_role');


-- Payment plans table
CREATE TABLE payment_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id uuid,
    name text NOT NULL,
    description text,
    amount_friendcoins integer NOT NULL DEFAULT 0,
    amount_friendship_fractions integer NOT NULL DEFAULT 0,
    external_id text,
    currency text DEFAULT 'friendcoin',
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_plans_select_all" ON payment_plans FOR SELECT USING (true);
CREATE POLICY "payment_plans_manage_service" ON payment_plans FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');


-- Payment sessions table
CREATE TABLE payment_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_plan_id uuid NOT NULL REFERENCES payment_plans(id) ON DELETE CASCADE,
    session_token text NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'pending',
    amount_friendcoins integer NOT NULL DEFAULT 0,
    amount_friendship_fractions integer NOT NULL DEFAULT 0,
    customer_name text,
    customer_email text,
    payment_method text,
    transaction_id uuid,
    external_reference text,
    completed_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_sessions_select_public" ON payment_sessions FOR SELECT USING (true);
CREATE POLICY "payment_sessions_update_service" ON payment_sessions FOR UPDATE USING (true) WITH CHECK (auth.role() = 'service_role');


-- Payment validations table
CREATE TABLE payment_validations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES users(stack_user_id) ON DELETE CASCADE,
    validation_token text NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'pending',
    amount_friendcoins integer NOT NULL DEFAULT 0,
    amount_friendship_fractions integer NOT NULL DEFAULT 0,
    payment_method text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE payment_validations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_validations_select_own" ON payment_validations FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');
CREATE POLICY "payment_validations_manage_service" ON payment_validations FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');


-- API keys table
CREATE TABLE api_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES users(stack_user_id) ON DELETE CASCADE,
    name text NOT NULL,
    api_key text NOT NULL UNIQUE,
    is_active boolean NOT NULL DEFAULT true,
    webhook_url text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_keys_select_own" ON api_keys FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');
CREATE POLICY "api_keys_manage_own" ON api_keys FOR ALL USING (auth.uid()::text = user_id OR auth.role() = 'service_role') WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');


-- Account restrictions table
CREATE TABLE account_restrictions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES users(stack_user_id) ON DELETE CASCADE,
    restriction_type text NOT NULL,
    reason text,
    is_active boolean NOT NULL DEFAULT true,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE account_restrictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_restrictions_select_own" ON account_restrictions FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');
CREATE POLICY "account_restrictions_manage_service" ON account_restrictions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');


-- Banned users table
CREATE TABLE banned_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES users(stack_user_id) ON DELETE CASCADE,
    ban_type text NOT NULL,
    ban_reason text,
    ip_address text,
    hardware_fingerprint text,
    banned_at timestamp with time zone DEFAULT now()
);

ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banned_users_manage_service" ON banned_users FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');


-- User subscriptions table
CREATE TABLE user_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES users(stack_user_id) ON DELETE CASCADE,
    product_id uuid REFERENCES developer_products(id) ON DELETE CASCADE,
    developer_id text REFERENCES users(stack_user_id) ON DELETE CASCADE,
    subscription_id uuid,
    status text NOT NULL DEFAULT 'active',
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    trial_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_subscriptions_select_own" ON user_subscriptions FOR SELECT USING (auth.uid()::text = user_id OR auth.uid()::text = developer_id OR auth.role() = 'service_role');
CREATE POLICY "user_subscriptions_manage_service" ON user_subscriptions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');


-- Products table
CREATE TABLE products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    price_friendcoins integer NOT NULL DEFAULT 0,
    price_friendship_fractions integer NOT NULL DEFAULT 0,
    category text,
    stock_quantity integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select_all" ON products FOR SELECT USING (true);
CREATE POLICY "products_manage_service" ON products FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');


-- Currency circulation table
CREATE TABLE currency_circulation (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    total_base_coins integer NOT NULL DEFAULT 0,
    total_user_bonus_coins integer NOT NULL DEFAULT 0,
    total_coins_in_circulation integer NOT NULL DEFAULT 0,
    last_updated timestamp with time zone DEFAULT now()
);

ALTER TABLE currency_circulation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "currency_circulation_select_all" ON currency_circulation FOR SELECT USING (true);
CREATE POLICY "currency_circulation_manage_service" ON currency_circulation FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');


-- Stock cache table
CREATE TABLE stock_cache (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol text NOT NULL UNIQUE,
    name text NOT NULL,
    price numeric NOT NULL,
    change_amount numeric NOT NULL DEFAULT 0,
    change_percent numeric NOT NULL DEFAULT 0,
    volume bigint NOT NULL DEFAULT 0,
    market_cap text,
    created_at timestamp with time zone DEFAULT now(),
    last_updated timestamp with time zone DEFAULT now()
);

ALTER TABLE stock_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_cache_select_all" ON stock_cache FOR SELECT USING (true);
CREATE POLICY "stock_cache_manage_service" ON stock_cache FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');


-- Stock prices table
CREATE TABLE stock_prices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol text NOT NULL, -- Unique index removed as this sounds like time-series data
    price numeric NOT NULL,
    change_percent numeric NOT NULL DEFAULT 0,
    last_updated timestamp with time zone DEFAULT now()
);

ALTER TABLE stock_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_prices_select_all" ON stock_prices FOR SELECT USING (true);
CREATE POLICY "stock_prices_manage_service" ON stock_prices FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol ON stock_prices(symbol);


-- System logs table
CREATE TABLE system_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    log_type text NOT NULL,
    message text NOT NULL,
    error_details text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_logs_manage_service" ON system_logs FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');


-- Recent transfers table
CREATE TABLE recent_transfers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id text NOT NULL REFERENCES users(stack_user_id) ON DELETE CASCADE,
    to_user_id text NOT NULL REFERENCES users(stack_user_id) ON DELETE CASCADE,
    to_display_name text,
    transfer_count integer NOT NULL DEFAULT 1,
    last_transfer_at timestamp with time zone DEFAULT now()
);

ALTER TABLE recent_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recent_transfers_select_own" ON recent_transfers FOR SELECT USING (auth.uid()::text = from_user_id OR auth.uid()::text = to_user_id OR auth.role() = 'service_role');
CREATE POLICY "recent_transfers_manage_service" ON recent_transfers FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');


-- =====================================================================
-- 3. CREATE INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_users_stack_user_id ON users(stack_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_from_user ON transactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_user ON transactions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_created_by ON coupons(created_by);
CREATE INDEX IF NOT EXISTS idx_coupons_is_redeemed ON coupons(is_redeemed);
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_symbol ON investments(stock_symbol);
CREATE INDEX IF NOT EXISTS idx_developer_products_developer_id ON developer_products(developer_id);
CREATE INDEX IF NOT EXISTS idx_developer_products_is_active ON developer_products(is_active);
CREATE INDEX IF NOT EXISTS idx_product_purchases_user_id ON product_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_product_purchases_developer_id ON product_purchases(developer_id);
CREATE INDEX IF NOT EXISTS idx_stock_cache_symbol ON stock_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_merchant_projects_user_id ON merchant_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_payment_plans_project_id ON merchant_payment_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_account_restrictions_user_id ON account_restrictions(user_id);
CREATE INDEX IF NOT EXISTS idx_banned_users_user_id ON banned_users(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_recent_transfers_from_user_id ON recent_transfers(from_user_id);
CREATE INDEX IF NOT EXISTS idx_recent_transfers_to_user_id ON recent_transfers(to_user_id);
