import type { FormEvent } from 'react';
import type { InvoiceData } from '../invoiceTypes';

interface RecordPaymentModalProps {
  invoiceData: InvoiceData;
  paymentAmount: string;
  paymentType: string;
  paymentSubmitting: boolean;
  paymentError: string | null;
  paymentSuccess: string | null;
  onPaymentAmountChange: (value: string) => void;
  onPaymentTypeChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

export default function RecordPaymentModal({
  invoiceData,
  paymentAmount,
  paymentType,
  paymentSubmitting,
  paymentError,
  paymentSuccess,
  onPaymentAmountChange,
  onPaymentTypeChange,
  onSubmit,
  onClose,
}: RecordPaymentModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-surface-card rounded-2xl max-w-lg w-full p-6 border border-border-subtle shadow-xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <h3 className="text-[22px] font-bold text-brand-navy-deep">Record Payment for {invoiceData.invoice_code}</h3>
          <button type="button" className="text-outline hover:text-brand-navy-deep" onClick={onClose}>
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        {paymentError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-[15px] font-medium">{paymentError}</div>}
        {paymentSuccess && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-[15px] font-medium">{paymentSuccess}</div>}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-[15px] font-semibold text-brand-navy-deep mb-1">Outstanding Balance</label>
            <input type="text" disabled value={`LKR ${invoiceData.outstanding_balance.toFixed(2)}`} className="w-full h-12 px-4 rounded-xl bg-surface-subtle text-outline font-mono-data font-bold text-[16px] border border-border-subtle" />
          </div>
          <div>
            <label className="block text-[15px] font-semibold text-brand-navy-deep mb-1">Payment Amount (LKR)</label>
            <input type="number" step="0.01" max={invoiceData.outstanding_balance} value={paymentAmount} onChange={(event) => onPaymentAmountChange(event.target.value)} className="w-full h-12 px-4 rounded-xl bg-surface-subtle text-brand-navy-deep font-mono-data font-bold text-[18px] border border-border-subtle focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
          <div>
            <label className="block text-[15px] font-semibold text-brand-navy-deep mb-1">Payment Method</label>
            <select value={paymentType} onChange={(event) => onPaymentTypeChange(event.target.value)} className="w-full h-12 px-4 rounded-xl bg-surface-subtle text-brand-navy-deep font-body-md text-[16px] border border-border-subtle focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Insurance Settlement">Insurance Settlement</option>
            </select>
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl bg-surface-subtle hover:bg-surface-container text-brand-navy-deep font-semibold">Cancel</button>
            <button type="submit" disabled={paymentSubmitting} className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold shadow-sm disabled:opacity-50">{paymentSubmitting ? 'Recording...' : 'Confirm & Record Payment'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}