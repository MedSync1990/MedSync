
-- Stores individual full/partial payment entries processed against an invoice
CREATE TABLE IF NOT EXISTS payments (
    payment_id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_id     INT NOT NULL REFERENCES invoices(invoice_id),
    amount_paid    DECIMAL(10,2) NOT NULL CHECK (amount_paid > 0), -- FR-BPM-06: Payment must be > 0
    payment_date   TIMESTAMPTZ NOT NULL DEFAULT now(),
    payment_type   payment_type_enum NOT NULL                     -- Cash, Card, Insurance Settlement
);

-- Index for computing outstanding invoice balance aggregations
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

-- Index for doctor revenue and payment date-range reports
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
