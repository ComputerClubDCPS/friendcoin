-- Set up automated weekly interest payments for all users
-- This replaces the mock interest system with real calculations

-- Create function to calculate and distribute weekly interest
CREATE OR REPLACE FUNCTION distribute_weekly_interest() RETURNS json AS $$
DECLARE
    user_record RECORD;
    interest_amount_fractions INTEGER;
    total_users INTEGER := 0;
    total_interest_paid INTEGER := 0;
    result json;
BEGIN
    -- Calculate interest for all users who haven't received it this week
    FOR user_record IN 
        SELECT * FROM users 
        WHERE last_interest_payment < NOW() - INTERVAL '7 days'
        OR last_interest_payment IS NULL
    LOOP
        -- Calculate 0.5% weekly interest on balance
        -- Interest = (balance_friendcoins * 100 + balance_friendship_fractions) * 0.005
        interest_amount_fractions := ROUND(
            (user_record.balance_friendcoins * 100 + user_record.balance_friendship_fractions) * 0.005
        );
        
        -- Only pay interest if user has a balance > 0
        IF interest_amount_fractions > 0 THEN
            -- Update user balance
            UPDATE users 
            SET 
                balance_friendcoins = balance_friendcoins + (interest_amount_fractions / 100),
                balance_friendship_fractions = balance_friendship_fractions + (interest_amount_fractions % 100),
                last_interest_payment = NOW(),
                updated_at = NOW()
            WHERE id = user_record.id;
            
            -- Record the interest transaction
            INSERT INTO transactions (
                from_user_id, 
                to_user_id, 
                amount_friendcoins, 
                amount_friendship_fractions, 
                tax_amount, 
                transaction_type, 
                status,
                external_reference
            ) VALUES (
                'bank', 
                user_record.stack_user_id, 
                interest_amount_fractions / 100, 
                interest_amount_fractions % 100, 
                0, 
                'interest', 
                'completed',
                'weekly_interest_' || EXTRACT(WEEK FROM NOW()) || '_' || EXTRACT(YEAR FROM NOW())
            );
            
            total_users := total_users + 1;
            total_interest_paid := total_interest_paid + interest_amount_fractions;
        END IF;
    END LOOP;
    
    -- Log the operation
    INSERT INTO system_logs (log_type, message, created_at)
    VALUES (
        'interest_payment', 
        'Weekly interest distributed to ' || total_users || ' users. Total: ' || 
        (total_interest_paid / 100) || '.' || LPAD((total_interest_paid % 100)::text, 2, '0') || 'f€',
        NOW()
    );
    
    result := json_build_object(
        'success', true,
        'users_paid', total_users,
        'total_interest_fractions', total_interest_paid,
        'total_interest_display', (total_interest_paid / 100) || '.' || LPAD((total_interest_paid % 100)::text, 2, '0') || 'f€',
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
GRANT EXECUTE ON FUNCTION distribute_weekly_interest() TO service_role;
