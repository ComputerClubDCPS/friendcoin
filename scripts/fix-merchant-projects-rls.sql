-- Fix Row Level Security policies for merchant_projects table
-- This script addresses the "permission denied for table merchant_projects" error
-- by ensuring the service role can bypass RLS policies while maintaining user security

-- First, check if the table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'merchant_projects') THEN
        RAISE NOTICE 'Table merchant_projects does not exist, skipping policy setup';
        RETURN;
    END IF;

    -- Drop existing policies on merchant_projects to avoid conflicts
    DROP POLICY IF EXISTS "Service role bypass for merchant_projects" ON merchant_projects;
    DROP POLICY IF EXISTS "Users can manage own projects" ON merchant_projects;
    
    -- Ensure RLS is enabled
    ALTER TABLE merchant_projects ENABLE ROW LEVEL SECURITY;
    
    -- Create service role bypass policy first (highest priority)
    -- This allows the service role to access all rows without restrictions
    CREATE POLICY "service_role_bypass_merchant_projects" ON merchant_projects
        FOR ALL 
        TO service_role 
        USING (true)
        WITH CHECK (true);
    
    -- Create user policy for authenticated users
    -- Users can only access their own projects
    CREATE POLICY "users_own_projects_merchant_projects" ON merchant_projects
        FOR ALL 
        TO authenticated
        USING (user_id = auth.jwt() ->> 'sub')
        WITH CHECK (user_id = auth.jwt() ->> 'sub');
    
    -- Allow anonymous read access for public APIs (if needed)
    -- This is for cases where merchant projects need to be referenced publicly
    CREATE POLICY "anon_read_merchant_projects" ON merchant_projects
        FOR SELECT
        TO anon
        USING (is_active = true);
        
    RAISE NOTICE 'Successfully updated RLS policies for merchant_projects table';
END
$$;

-- Verify the policies were created
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'merchant_projects') THEN
        RAISE NOTICE 'Current policies on merchant_projects:';
        -- This will show all policies (visible in logs)
        PERFORM * FROM pg_policies WHERE tablename = 'merchant_projects';
    END IF;
END
$$;
