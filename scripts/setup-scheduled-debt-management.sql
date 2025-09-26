-- Set up automated debt management with proper scheduling
-- This creates a scheduled function that runs daily

-- Create the main debt management function that combines all operations
CREATE OR REPLACE FUNCTION run_daily_debt_management() RETURNS void AS $$
BEGIN
    -- Calculate interest on overdue loans
    PERFORM calculate_loan_interest();
    
    -- Manage account restrictions based on debt
    PERFORM manage_debt_restrictions();
    
    -- Auto-deduct loan payments after 1 month
    PERFORM auto_deduct_loans();
    
    -- Log the execution
    INSERT INTO system_logs (log_type, message, created_at)
    VALUES ('debt_management', 'Daily debt management completed', NOW());
    
EXCEPTION WHEN OTHERS THEN
    -- Log any errors
    INSERT INTO system_logs (log_type, message, error_details, created_at)
    VALUES ('debt_management_error', 'Daily debt management failed', SQLERRM, NOW());
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Create system_logs table for tracking scheduled operations
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_type TEXT NOT NULL,
    message TEXT NOT NULL,
    error_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a function to be called by external cron job or Vercel cron
CREATE OR REPLACE FUNCTION schedule_debt_management() RETURNS json AS $$
DECLARE
    result json;
BEGIN
    PERFORM run_daily_debt_management();
    
    result := json_build_object(
        'success', true,
        'message', 'Debt management completed successfully',
        'timestamp', NOW()
    );
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    result := json_build_object(
        'success', false,
        'error', SQLERRM,
        'timestamp', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION schedule_debt_management() TO service_role;
