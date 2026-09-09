
-- Stores billing invoice details generated upon completed consultation and treatment recording
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_code      VARCHAR(10) GENERATED ALWAYS AS ('INV-' || lpad(invoice_id::text, 6, '0')) STORED, -- Generated ID format (INV-XXXXXX)
    consultation_id   INT NOT NULL REFERENCES consultations(consultation_id),
    appointment_id    INT NOT NULL UNIQUE REFERENCES appointments(appointment_id),  -- One invoice per completed appointment
    total_amount      DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),              -- Total cost of prescribed treatments
    insurance_amount  DECIMAL(10,2) NOT NULL DEFAULT 0
                       CHECK (insurance_amount >= 0 AND insurance_amount <= total_amount), -- Calculated insurance coverage
    status            invoice_status_enum NOT NULL DEFAULT 'Unpaid',                  -- Status tracking: Unpaid, Partially Paid, Paid
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index to optimize invoice filtering by payment status (Unpaid / Partially Paid / Paid)
CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoices(status);


