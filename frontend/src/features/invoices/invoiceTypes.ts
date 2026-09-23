export interface InvoiceLineItem {
  treatment_name: string;
  service_code: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface InvoicePayment {
  payment_date: string;
  amount: number;
  payment_type: string;
}

export interface InvoiceData {
  invoice_code: string;
  patient_name: string;
  patient_nic: string;
  patient_id: string;
  doctor_name: string;
  unit_name: string;
  total_amount: number;
  insurance_amount: number;
  insurance_percentage: number;
  insurance_policy_number: string | null;
  status: string;
  created_at: string;
  outstanding_balance: number;
  items: InvoiceLineItem[];
  payments: InvoicePayment[];
}