-- db/modules/shavinda/doctor_payouts.sql
-- Tracks the actual payouts/disbursements made by the hospital to the doctor

CREATE TABLE IF NOT EXISTS staff_payouts (
    payout_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES staff(user_id) ON DELETE CASCADE,
    request_id INT REFERENCES staff_payout_requests(request_id) ON DELETE SET NULL,
    account_id INT NOT NULL REFERENCES staff_bank_accounts(account_id) ON DELETE RESTRICT,
    amount_paid DECIMAL(10, 2) NOT NULL CHECK (amount_paid > 0),
    payment_reference VARCHAR(100) NOT NULL,
    payment_method VARCHAR(100) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staff_payouts_user_id ON staff_payouts(user_id);