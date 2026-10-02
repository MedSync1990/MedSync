-- Tracks the different bank accounts a doctor has saved

CREATE TABLE IF NOT EXISTS staff_bank_accounts (
    account_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES staff(user_id) ON DELETE CASCADE,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    branch_name VARCHAR(255),
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staff_bank_accounts_user_id ON staff_bank_accounts(user_id);