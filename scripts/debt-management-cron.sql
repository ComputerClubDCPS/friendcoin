-- This script should be run daily to manage debt and account restrictions
-- In production, this would be handled by a cron job or scheduled function

-- Function to calculate interest on overdue loans
CREATE OR REPLACE FUNCTION calculate_loan_interest() RETURNS void AS $$
DECLARE
    loan_record RECORD;
    weeks_overdue INTEGER;
    interest_amount INTEGER;
BEGIN
    -- Process all active loans that are overdue
    FOR loan_record IN 
        SELECT * FROM loans 
        WHERE status = 'active' 
        AND due_date < NOW()
    LOOP
        -- Calculate weeks overdue
        weeks_overdue := EXTRACT(EPOCH FROM (NOW() - loan_record.due_date)) / (7 * 24 * 60 * 60);
        
        -- Calculate interest: 1 unpaid friendship coin = 5ff/week
        -- Interest is calculated on the remaining balance
        interest_amount := (loan_record.principal_friendship_fractions - loan_record.amount_paid_friendship_fractions) * 5 * weeks_overdue;
        
        -- Add interest to the loan principal
        UPDATE loans 
        SET 
            principal_friendship_fractions = principal_friendship_fractions + interest_amount,
            last_interest_calculation = NOW()
        WHERE id = loan_record.id;
        
        -- Record interest payment
        INSERT INTO loan_payments (
            loan_id, 
            payment_amount_friendcoins, 
            payment_amount_friendship_fractions, 
            payment_type
        ) VALUES (
            loan_record.id, 
            0, 
            interest_amount, 
            'interest'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to manage account restrictions based on debt
CREATE OR REPLACE FUNCTION manage_debt_restrictions() RETURNS void AS $$
DECLARE
    user_record RECORD;
    days_overdue INTEGER;
BEGIN
    -- Check all users with overdue loans
    FOR user_record IN 
        SELECT DISTINCT user_id, MIN(due_date) as earliest_due
        FROM loans 
        WHERE status = 'active' 
        AND due_date < NOW()
        GROUP BY user_id
    LOOP
        days_overdue := EXTRACT(EPOCH FROM (NOW() - user_record.earliest_due)) / (24 * 60 * 60);
        
        IF days_overdue >= 7 THEN
            -- 7+ days overdue: Ban user and delete account
            INSERT INTO banned_users (user_id, ban_reason, ban_type)
            VALUES (user_record.user_id, 'Account deleted due to 7+ days of unpaid debt', 'all')
            ON CONFLICT (user_id) DO NOTHING;
            
            -- Mark account for deletion
            INSERT INTO account_restrictions (user_id, restriction_type, reason)
            VALUES (user_record.user_id, 'pending_deletion', 'Account scheduled for deletion due to unpaid debt')
            ON CONFLICT (user_id) DO UPDATE SET
                restriction_type = 'pending_deletion',
                reason = 'Account scheduled for deletion due to unpaid debt',
                created_at = NOW(),
                is_active = true;
                
        ELSIF days_overdue >= 1 THEN
            -- 1+ days overdue: Disable banking features
            INSERT INTO account_restrictions (user_id, restriction_type, reason)
            VALUES (user_record.user_id, 'banking_disabled', 'Banking disabled due to overdue loan payments')
            ON CONFLICT (user_id) DO UPDATE SET
                restriction_type = 'banking_disabled',
                reason = 'Banking disabled due to overdue loan payments',
                created_at = NOW(),
                is_active = true;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-deduct loan payments after 1 month
CREATE OR REPLACE FUNCTION auto_deduct_loans() RETURNS void AS $$
DECLARE
    loan_record RECORD;
    user_balance_fractions INTEGER;
    loan_balance_fractions INTEGER;
    deduction_amount INTEGER;
BEGIN
    -- Process loans that are exactly 1 month overdue for auto-deduction
    FOR loan_record IN 
        SELECT l.*, u.balance_friendcoins, u.balance_friendship_fractions
        FROM loans l
        JOIN users u ON l.user_id = u.stack_user_id
        WHERE l.status = 'active' 
        AND l.due_date < NOW() - INTERVAL '1 month'
        AND l.due_date > NOW() - INTERVAL '1 month 1 day' -- Only process once
    LOOP
        user_balance_fractions := loan_record.balance_friendcoins * 100 + loan_record.balance_friendship_fractions;
        loan_balance_fractions := (loan_record.principal_friendcoins - loan_record.amount_paid_friendcoins) * 100 + 
                                 (loan_record.principal_friendship_fractions - loan_record.amount_paid_friendship_fractions);
        
        -- Deduct whatever the user has available
        deduction_amount := LEAST(user_balance_fractions, loan_balance_fractions);
        
        IF deduction_amount > 0 THEN
            -- Update user balance
            UPDATE users 
            SET 
                balance_friendcoins = (user_balance_fractions - deduction_amount) / 100,
                balance_friendship_fractions = (user_balance_fractions - deduction_amount) % 100,
                updated_at = NOW()
            WHERE stack_user_id = loan_record.user_id;
            
            -- Update loan
            UPDATE loans 
            SET 
                amount_paid_friendcoins = amount_paid_friendcoins + (deduction_amount / 100),
                amount_paid_friendship_fractions = amount_paid_friendship_fractions + (deduction_amount % 100),
                status = CASE 
                    WHEN (amount_paid_friendcoins + (deduction_amount / 100)) * 100 + 
                         (amount_paid_friendship_fractions + (deduction_amount % 100)) >= loan_balance_fractions 
                    THEN 'auto_deducted' 
                    ELSE 'active' 
                END
            WHERE id = loan_record.id;
            
            -- Record payment
            INSERT INTO loan_payments (
                loan_id, 
                payment_amount_friendcoins, 
                payment_amount_friendship_fractions, 
                payment_type
            ) VALUES (
                loan_record.id, 
                deduction_amount / 100, 
                deduction_amount % 100, 
                'auto_deduction'
            );
            
            -- Record transaction
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
                loan_record.user_id, 
                'bank', 
                deduction_amount / 100, 
                deduction_amount % 100, 
                0, 
                'auto_loan_payment', 
                'completed', 
                loan_record.id
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
