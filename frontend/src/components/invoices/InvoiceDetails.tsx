import type { InvoiceData } from '../../types/invoiceTypes';

interface InvoiceDetailsProps {
  invoiceData: InvoiceData;
  onPrint: () => void;
  onRecordPayment: () => void;
}

export default function InvoiceDetails({ invoiceData, onPrint, onRecordPayment }: InvoiceDetailsProps) {
  return (
    <div className="bg-surface-card rounded-2xl border border-border-subtle shadow-sm p-space-lg space-y-space-md print-invoice-area" id="invoiceDetailPanel">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-[32px] font-black text-brand-navy-deep tracking-tight">{invoiceData.invoice_code}</span>
            <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full font-label-sm text-[15px] font-bold ${invoiceData.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : invoiceData.status === 'Partially Paid' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${invoiceData.status === 'Paid' ? 'bg-emerald-600' : invoiceData.status === 'Partially Paid' ? 'bg-amber-600' : 'bg-red-600'}`}></span>
              {invoiceData.status}
            </span>
          </div>
          <p className="font-body-sm text-[16px] text-outline mt-0.5">
            Issued: {new Date(invoiceData.created_at).toLocaleString()} · {invoiceData.unit_name} Branch
          </p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-subtle hover:bg-surface-container text-brand-navy-deep font-label-md text-[17px] font-semibold transition-colors no-print" onClick={onPrint} type="button">
          <span className="material-symbols-outlined text-[22px]">print</span>
          <span>Print</span>
        </button>
      </div>

      <div className="bg-surface-subtle p-space-md rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-border-subtle">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-primary-fixed flex items-center justify-center text-primary text-[24px] font-bold">
            {invoiceData.patient_name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h4 className="text-[24px] font-bold text-brand-navy-deep leading-tight">{invoiceData.patient_name}</h4>
              {invoiceData.patient_nic && (
                <span className="px-3 py-1 rounded-md bg-status-scheduled-bg text-status-scheduled-text font-label-sm text-[14px] font-bold border border-brand-teal-light/30">
                  NIC: {invoiceData.patient_nic}
                </span>
              )}
            </div>
            <span className="font-mono-data text-on-surface-variant font-semibold text-[16px]">Patient ID: {invoiceData.patient_id}</span>
          </div>
        </div>
        <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-border-subtle">
          <span className="font-label-sm text-[14px] text-outline uppercase tracking-wider block font-semibold">Attending Doctor &amp; Unit</span>
          <span className="font-label-md text-[18px] text-brand-navy-deep font-bold">{invoiceData.doctor_name}</span>
          <span className="text-[15px] text-outline block">{invoiceData.unit_name}</span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="font-label-sm text-[15px] uppercase tracking-wider text-outline font-bold">Itemised Treatment Lines</span>
          <span className="font-mono-data text-[16px] text-outline font-semibold">{invoiceData.items.length} Line Items</span>
        </div>
        <div className="border border-border-subtle rounded-xl overflow-hidden divide-y divide-border-subtle">
          {invoiceData.items.length === 0 ? (
            <div className="p-4 text-center text-outline">No line items recorded for this invoice.</div>
          ) : (
            invoiceData.items.map((item, index) => (
              <div key={index} className="p-4 bg-surface-card flex items-center justify-between hover:bg-surface-subtle transition-colors">
                <div className="flex flex-col">
                  <span className="font-label-lg text-[18px] text-brand-navy-deep font-bold">{item.treatment_name}</span>
                  <span className="font-mono-data text-[16px] text-outline">Code: {item.service_code} · Qty: {item.quantity}</span>
                </div>
                <span className="font-mono-data text-[18px] font-bold text-brand-navy-deep">LKR {item.total_price.toFixed(2)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-surface-subtle p-space-md rounded-xl space-y-3 border border-border-subtle">
        <div className="flex items-center justify-between">
          <span className="font-label-sm text-[15px] uppercase tracking-wider text-outline font-bold">Financial Summary</span>
          {invoiceData.insurance_policy_number && (
            <span className="inline-flex items-center gap-1.5 text-[15px] font-bold text-primary">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              Policy: {invoiceData.insurance_policy_number}
            </span>
          )}
        </div>
        <div className="space-y-2 text-[18px]">
          <div className="flex items-center justify-between"><span className="text-on-surface-variant font-medium">Total Amount</span><span className="font-mono-data text-[18px] text-brand-navy-deep font-bold">LKR {invoiceData.total_amount.toFixed(2)}</span></div>
          <div className="flex items-center justify-between text-status-scheduled-text"><span className="font-medium">Insurance Coverage ({invoiceData.insurance_percentage}%)</span><span className="font-mono-data text-[18px] font-bold">- LKR {invoiceData.insurance_amount.toFixed(2)}</span></div>
          <div className="pt-2.5 mt-1 border-t border-border-subtle flex items-center justify-between"><span className="text-[20px] text-brand-navy-deep font-extrabold">Outstanding Balance</span><span className={`text-[28px] font-black ${invoiceData.outstanding_balance > 0 ? 'text-primary' : 'text-emerald-600'}`}>LKR {invoiceData.outstanding_balance.toFixed(2)}</span></div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="font-label-sm text-[15px] uppercase tracking-wider text-outline font-bold">Payment History</span>
          <span className="font-label-sm text-[15px] font-bold text-status-completed-text">{invoiceData.payments.length} Payments Recorded</span>
        </div>
        {invoiceData.payments.length === 0 ? (
          <div className="bg-surface-subtle rounded-xl p-4 text-[16px] text-center text-outline border border-border-subtle">No payments recorded yet.</div>
        ) : (
          <div className="space-y-2">
            {invoiceData.payments.map((payment, index) => (
              <div key={index} className="bg-surface-subtle rounded-xl p-4 text-[17px] border border-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-2.5"><span className="material-symbols-outlined text-[22px] text-status-completed-text">payments</span><div><span className="font-label-md text-[18px] text-brand-navy-deep font-semibold block">{payment.payment_type}</span><span className="text-outline text-[14px]">{new Date(payment.payment_date).toLocaleString()}</span></div></div>
                <span className="font-mono-data text-[18px] font-bold text-brand-navy-deep">LKR {payment.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border-subtle no-print">
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-surface-subtle hover:bg-surface-container text-brand-navy-deep font-label-md text-[17px] font-bold transition-colors" onClick={onPrint} type="button">
            <span className="material-symbols-outlined text-[22px]">print</span>
            <span>Print</span>
          </button>
          
          <button 
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-surface-subtle hover:bg-surface-container text-brand-navy-deep font-label-md text-[17px] font-bold transition-colors" 
            onClick={() => {
              // Points directly to the FastAPI PDF route we just built!
              window.location.href = `http://localhost:8000/api/v1/invoices/${invoiceData.invoice_code}/pdf`;
            }} 
            type="button"
          >
            <span className="material-symbols-outlined text-[22px]">download</span>
            <span>Download PDF</span>
          </button>
        </div>

        {invoiceData.outstanding_balance > 0 ? (
          <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-[17px] font-extrabold shadow-md transition-all cursor-pointer" type="button" onClick={onRecordPayment}>
            <span className="material-symbols-outlined text-[22px]">add_card</span>
            <span>Record Payment (LKR {invoiceData.outstanding_balance.toFixed(2)})</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-100 text-emerald-800 font-label-md text-[17px] font-extrabold"><span className="material-symbols-outlined text-[22px]">check_circle</span><span>Invoice Fully Settled</span></div>
        )}
      </div>
    </div>
  );
}