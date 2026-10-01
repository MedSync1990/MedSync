-- Tracks payout requests submitted by the doctor

CREATE TABLE IF NOT EXISTS staff_payout_requests (
    request_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES staff(user_id) ON DELETE CASCADE,
    account_id INT NOT NULL REFERENCES staff_bank_accounts(account_id) ON DELETE RESTRICT,
    request_amount DECIMAL(10, 2) NOT NULL CHECK (request_amount > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Paid', 'Rejected')),
    request_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_date TIMESTAMP WITH TIME ZONE,
    remarks TEXT
);

CREATE INDEX IF NOT EXISTS idx_staff_payout_requests_user_id ON staff_payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_payout_requests_status ON staff_payout_requests(status);