import { useState, useEffect } from 'react';
import { getOutstandingBalances, exportToCSV } from '../../api/reports';
import { recordPayment } from '../../api/billing';
import type { OutstandingBalancesResponse, BranchResponse } from '../../api/types';
import { useAuth } from '../../context/AuthContext';
import { listBranches } from '../../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function OutstandingBalances() {
  const [data, setData] = useState<OutstandingBalancesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<number | ''>('');

  useEffect(() => {
    if (user?.role === 'Administrator') {
      listBranches().then(setBranches);
    }
  }, [user?.role]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [agingFilter, setAgingFilter] = useState('all');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInv, setSelectedInv] = useState<any | null>(null);

  // Export
  const [isExporting, setIsExporting] = useState(false);
  const [, setExportComplete] = useState(false);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  const fetchReport = () => {
    setLoading(true);
    getOutstandingBalances({ branch: selectedBranch || undefined }).then(res => {
      setData(res);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const fmt = (n: number) => `LKR ${(Number(n) || 0).toLocaleString('en-US')}`;

  const getAgingCategory = (days: number) => {
    if (days <= 30) return '0-30';
    if (days <= 60) return '31-60';
    return '60+';
  };

  const filteredData = (data?.data || []).filter(inv => {
    const q = searchQuery.toLowerCase().trim();
    const searchMatch = !q || 
      (inv.patient_name || '').toLowerCase().includes(q) || 
      String(inv.patient_id || '').toLowerCase().includes(q) || 
      (inv.invoice_id || '').toLowerCase().includes(q);
    
    const agingMatch = agingFilter === 'all' || getAgingCategory(inv.aging_days) === agingFilter;

    return searchMatch && agingMatch;
  }) || [];

  const hasData = filteredData.length > 0;

  // KPIs
  const totalOutstanding = filteredData.reduce((acc, curr) => acc + curr.due_amount, 0) || 0;
  const overdueInvoices = filteredData.length || 0;
  const partiallyPaid = filteredData.filter(i => i.status === 'Partially Paid').length || 0;
  const fullyUnpaid = filteredData.filter(i => i.status === 'Unpaid').length || 0;

  const handleExport = async (type: string) => {
    if (type === 'CSV') {
      setIsExporting(true);
      exportToCSV(filteredData, 'Outstanding_Balances');
      setTimeout(() => {
        setIsExporting(false);
        setExportComplete(true);
        setTimeout(() => setExportComplete(false), 2000);
      }, 600);
    } else if (type === 'PDF') {
      try {
        setIsExporting(true);
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 14;
        const contentWidth = pageWidth - (margin * 2);

        // Data Prep
        const branchName = selectedBranch ? branches.find(b => b.branch_id === selectedBranch)?.name || 'Colombo Central Branch' : 'Colombo Central Branch';
        const userName = user?.firstName ? `${user.firstName}, ${user.role}` : 'Chaminda, Branch Manager';
        const genDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        
        let agingText = 'All Overdue';
        if (agingFilter === '0-30') agingText = '0-30 Days';
        if (agingFilter === '31-60') agingText = '31-60 Days';
        if (agingFilter === '60+') agingText = '60+ Days';

        // ================= PAGE 1 =================
        
        // 1. Dark Navy Header Background
        doc.setFillColor(15, 23, 42); // slate-900 (Navy)
        doc.rect(0, 0, pageWidth, 55, 'F');
        doc.setFillColor(14, 165, 233); // sky-500 (Blue)
        doc.rect(0, 55, pageWidth, 2, 'F');

        // 2. Header Text
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.setFont('helvetica', 'bold');
        doc.text("FINANCIAL OPERATIONS / COLLECTIONS", margin, 15);

        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'normal');
        doc.text(branchName, margin, 20);

        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Aging range: ${agingText} | Generated ${genDate}`, margin, 24);

        // Title
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text("Outstanding Balances", margin, 42);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text("Unpaid and partially paid invoices - collection risk and recovery status", margin, 48);

        // 3. Header Logo (Inside white box)
        const logoBoxW = 45;
        const logoBoxH = 35;
        const logoBoxX = pageWidth - margin - logoBoxW;
        const logoBoxY = 10;

        doc.setFillColor(255, 255, 255);
        doc.roundedRect(logoBoxX, logoBoxY, logoBoxW, logoBoxH, 3, 3, 'F');

        try {
          const img = new Image();
          img.src = '/logo.jpg';
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
          const imgProps = doc.getImageProperties(img);
          const imgW = 35;
          const imgH = (imgProps.height * imgW) / imgProps.width;
          const imgX = logoBoxX + (logoBoxW - imgW) / 2;
          const imgY = logoBoxY + (logoBoxH - imgH) / 2;
          doc.addImage(img, 'JPEG', imgX, imgY, imgW, imgH);
        } catch (e) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(56, 189, 248);
          doc.text("MEDSYNC", logoBoxX + 12, logoBoxY + 18);
        }

        // 4. Meta Info Grid
        const metaY = 68;
        const colW = contentWidth / 5;
        const c1 = margin;
        const c2 = margin + colW;
        const c3 = margin + colW * 2;
        const c4 = margin + colW * 3;
        const c5 = margin + colW * 4 + 10;

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("REPORTING SCOPE", c1, metaY);
        doc.text("AGING RANGE", c2, metaY);
        doc.text("PATIENT SEARCH", c3, metaY);
        doc.text("PREPARED FOR", c4, metaY);
        doc.text("GENERATED", c5, metaY);

        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'normal');
        const trunc = (str: string, max: number) => str.length > max ? str.substring(0, max) + '...' : str;
        doc.text(doc.splitTextToSize(branchName, colW - 5), c1, metaY + 4);
        doc.text(agingText, c2, metaY + 4);
        doc.text(searchQuery ? trunc(searchQuery, 15) : 'None applied', c3, metaY + 4);
        doc.text(doc.splitTextToSize(userName, colW - 5), c4, metaY + 4);
        doc.text(genDate, c5, metaY + 4);

        // Line separator
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(margin, 82, pageWidth - margin, 82);

        // 5. Executive Summary
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("Executive Summary", margin, 96);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text("Key figures for the branch", margin, 101);

        // Styled KPI Boxes
        const kpiY = 106;
        const kpiW = (contentWidth - 15) / 4;
        const kpis = [
            { label: "TOTAL OUTSTANDING", val: `LKR ${totalOutstanding.toLocaleString()}` },
            { label: "OVERDUE INVOICES", val: `${overdueInvoices} invoices` },
            { label: "PARTIALLY PAID", val: partiallyPaid.toString() },
            { label: "FULLY UNPAID", val: fullyUnpaid.toString() }
        ];

        kpis.forEach((kpi, idx) => {
            const x = margin + (idx * (kpiW + 5));
            doc.setFillColor(241, 245, 249); // slate-100
            doc.rect(x, kpiY, kpiW, 22, 'F');
            doc.setFillColor(14, 165, 233); // sky-500
            doc.rect(x, kpiY, kpiW, 1, 'F');

            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 116, 139); // slate-500
            doc.text(kpi.label, x + 4, kpiY + 7);

            // Dynamic font sizing
            let valFontSize = 18;
            doc.setFontSize(valFontSize);
            doc.setTextColor(15, 23, 42);
            while (doc.getTextWidth(kpi.val) > kpiW - 8 && valFontSize > 8) {
                valFontSize -= 1;
                doc.setFontSize(valFontSize);
            }
            doc.text(kpi.val, x + 4, kpiY + 18);
        });

        // Summary Paragraph
        const totalBranchInvCount = data?.data?.length || 0;
        const totalBranchOut = (data?.data || []).reduce((acc, curr) => acc + curr.due_amount, 0);
        const largestInv = [...filteredData].sort((a,b) => b.due_amount - a.due_amount)[0];
        const oldest60Plus = filteredData.find(i => i.status === 'Unpaid' && i.aging_days > 60);

        let largestStr = largestInv ? `The largest is ${largestInv.invoice_id} (${largestInv.patient_name}, LKR ${largestInv.due_amount.toLocaleString()}, ${largestInv.status.toLowerCase()}, ${getAgingCategory(largestInv.aging_days)} days)` : '';
        let oldestStr = oldest60Plus && oldest60Plus.invoice_id !== largestInv?.invoice_id ? `, and ${oldest60Plus.invoice_id} (${oldest60Plus.patient_name}, LKR ${oldest60Plus.due_amount.toLocaleString()}) is an unpaid invoice aged over 60 days.` : '.';

        const summaryPara = `${branchName} has ${totalBranchInvCount} overdue invoices with LKR ${totalBranchOut.toLocaleString()} outstanding overall. The ${overdueInvoices} invoices listed in this report carry LKR ${totalOutstanding.toLocaleString()} of that balance. ${largestStr}${oldestStr}`;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        const splitSummary = doc.splitTextToSize(summaryPara, contentWidth);
        doc.text(splitSummary, margin, kpiY + 32);

        // 6. Collection Breakdown Section
        let breakY = kpiY + 32 + (splitSummary.length * 5) + 6;

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("Collection Breakdown", margin, breakY);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text("Status of all overdue invoices and aging of the invoices listed below", margin, breakY + 5);

        breakY += 12;
        const halfW = (contentWidth / 2) - 5;
        const rightX = margin + halfW + 10;

        // Left Box: Collection Status
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, breakY, halfW, 35, 'F');
        doc.setFillColor(14, 165, 233);
        doc.rect(margin, breakY, halfW, 1, 'F');

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("Collection Status", margin + 4, breakY + 6);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`All ${filteredData.length} overdue invoices`, margin + 4, breakY + 10);

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`${partiallyPaid}`, margin + 4, breakY + 18);
        doc.setTextColor(200);
        doc.text("|", margin + 16, breakY + 18);
        doc.setTextColor(15, 23, 42);
        doc.text(`${fullyUnpaid}`, margin + 22, breakY + 18);

        const ppPct = overdueInvoices ? ((partiallyPaid/overdueInvoices)*100).toFixed(1) : "0.0";
        const upPct = overdueInvoices ? ((fullyUnpaid/overdueInvoices)*100).toFixed(1) : "0.0";

        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(`• Partially Paid        ${partiallyPaid} invoices        ${ppPct}%`, margin + 4, breakY + 26);
        doc.text(`• Fully Unpaid          ${fullyUnpaid} invoices        ${upPct}%`, margin + 4, breakY + 31);

        // Right Box: Aging
        doc.setFillColor(241, 245, 249);
        doc.rect(rightX, breakY, halfW, 35, 'F');
        doc.setFillColor(14, 165, 233);
        doc.rect(rightX, breakY, halfW, 1, 'F');

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("Aging of Listed Invoices", rightX + 4, breakY + 6);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Outstanding balance of the ${overdueInvoices} invoices in the ledger`, rightX + 4, breakY + 10);

        let a30 = {amt:0, c:0}, a60 = {amt:0, c:0}, a90 = {amt:0, c:0};
        filteredData.forEach(i => {
            if(i.aging_days <= 30) { a30.amt += i.due_amount; a30.c++; }
            else if(i.aging_days <= 60) { a60.amt += i.due_amount; a60.c++; }
            else { a90.amt += i.due_amount; a90.c++; }
        });

        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(`0-30 days          LKR ${a30.amt.toLocaleString()}          ${a30.c} inv.`, rightX + 4, breakY + 18);
        doc.text(`31-60 days        LKR ${a60.amt.toLocaleString()}          ${a60.c} inv.`, rightX + 4, breakY + 24);
        doc.text(`60+ days           LKR ${a90.amt.toLocaleString()}          ${a90.c} inv.`, rightX + 4, breakY + 30);

        // 7. Invoice Ledger Table
        let tableY = breakY + 45;

        const tableColumn = ["PATIENT", "INVOICE #", "TOTAL", "PAID", "OUTSTANDING", "LAST PAYMENT", "STATUS", "AGING"];
        const tableRows = filteredData.map(d => {
            return [
              `${d.patient_name}\n${d.patient_id}`,
              d.invoice_id,
              d.total_amount.toLocaleString(),
              d.paid_amount.toLocaleString(),
              d.due_amount.toLocaleString(),
              (d.status === 'Unpaid' || !d.last_payment_date) ? '' : new Date(d.last_payment_date).toLocaleDateString('en-US', {month:'short', day:'2-digit', year:'numeric'}),
              d.status,
              `${getAgingCategory(d.aging_days)}d`
            ];
        });

        const totalPaid = filteredData.reduce((acc, curr) => acc + curr.paid_amount, 0);
        const totalGross = filteredData.reduce((acc, curr) => acc + curr.total_amount, 0);
        tableRows.push([
            `Total (listed invoices)`, "", totalGross.toLocaleString(), totalPaid.toLocaleString(), totalOutstanding.toLocaleString(), "", "", ""
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: tableY,
            theme: 'plain',
            styles: { fontSize: 8, textColor: [71, 85, 105], cellPadding: { top: 4, right: 3, bottom: 4, left: 3 } },
            headStyles: { textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7 },
            columnStyles: {
                2: { halign: 'right' },
                3: { halign: 'right' },
                4: { halign: 'right' }
            },
            didDrawPage: function (data) {
              // Add a small dark navy header for subsequent pages
              if (data.pageNumber > 1) {
                doc.setFillColor(15, 23, 42);
                doc.rect(0, 0, pageWidth, 20, 'F');
                doc.setFontSize(10);
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.text("MEDSYNC", margin, 12);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(148, 163, 184);
                doc.text("| Outstanding Balances", margin + 22, 12);
              }
            },
            margin: { top: 25 },
            didDrawCell: function(data) {
                if (data.row.section === 'body' || data.row.section === 'head') {
                    doc.setDrawColor(226, 232, 240);
                    doc.setLineWidth(0.2);
                    doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
                }
            },
            didParseCell: function(data) {
                if (data.row.index === tableRows.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [15, 23, 42];
                }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY || 150;
        const totalPages = (doc as any).internal.getNumberOfPages();

        // Footer (all pages)
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.setFont('helvetica', 'normal');
            if (i === totalPages) {
              doc.text(`Page ${i} of ${totalPages} in the portal ledger, the remaining ${totalBranchInvCount - overdueInvoices} invoices are not included in this export. Amounts in LKR`, margin, finalY + 5);
            }
            doc.setTextColor(150);
            doc.text(`MedSync Branch Manager Portal | ${branchName} Confidential contains patient information`, margin, 285);
            doc.text(`Page ${i}`, pageWidth - margin, 285, { align: 'right' });
        }

        doc.save(`MedSync_Outstanding_Balances.pdf`);
      } catch (err) {
        console.error("PDF generation failed:", err);
      } finally {
        setIsExporting(false);
      }
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInv) return;
    setIsRecordingPayment(true);
    try {
      await recordPayment(selectedInv.invoice_id, {
        amount: selectedInv.due_amount,
        payment_type: 'Cash'
      });
      const res = await getOutstandingBalances();
      setData(res);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to record payment', err);
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handleView = (inv: any) => {
    setSelectedInv(inv);
    setIsModalOpen(true);
  };

  const handleReset = () => {
    setSearchQuery('');
    setAgingFilter('all');
  };

  return (
    <div className="flex flex-col w-full py-space-xl max-w-content-max-width mx-auto gap-space-xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div className="flex flex-col gap-space-2xs">
          <div className="flex items-center gap-space-xs text-primary font-label-md text-label-md uppercase tracking-wider">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>Financial Operations</span>
            <span className="text-outline">/</span>
            <span className="text-secondary font-medium">Collections</span>
          </div>
          <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">Outstanding Balances</h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">Patients with unpaid or partially paid invoices. Monitor collection risks and invoice recovery status.</p>
        </div>
        {user?.role === 'Administrator' ? (
          <div className="flex items-center gap-space-sm px-space-md py-2 rounded-xl bg-surface-container-low shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">domain</span>
            </div>
            <div className="flex flex-col">
              <label htmlFor="branch-select" className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Reporting Scope</label>
              <select id="branch-select" value={selectedBranch} onChange={e => setSelectedBranch(e.target.value ? Number(e.target.value) : '')} className="bg-transparent font-label-lg text-label-lg text-on-surface outline-none cursor-pointer border-none p-0 focus:ring-0">
                <option value="">All Branches</option>
                {branches.map(b => (
                  <option key={b.branch_id} value={b.branch_id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-space-sm px-space-md py-2 rounded-xl bg-surface-container-low shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">lock</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Reporting Scope</span>
              <span className="font-label-lg text-label-lg text-on-surface">{user?.branchName || 'Assigned Branch'} (Locked)</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-surface-card rounded-xl p-space-md shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-space-md flex-1">
          <div className="flex flex-col gap-1 min-w-[280px] flex-1 max-w-md">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-secondary" htmlFor="patient-search">Search Patient</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined text-secondary text-[18px] absolute left-3 pointer-events-none">search</span>
              <input id="patient-search" type="text" placeholder="Patient name, ID, or invoice #" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-10 pl-9 pr-9 rounded-lg bg-surface-subtle font-body-md text-body-md text-on-surface outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 transition-all"/>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 text-outline hover:text-on-surface" type="button" aria-label="Clear search">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-secondary" htmlFor="aging-filter">Aging Range</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined text-primary text-[18px] absolute left-3 pointer-events-none">date_range</span>
              <select id="aging-filter" value={agingFilter} onChange={e => setAgingFilter(e.target.value)} className="w-full h-10 pl-9 pr-8 rounded-lg bg-surface-subtle font-body-md text-body-md text-on-surface outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 appearance-none transition-all cursor-pointer">
                <option value="all">All Overdue</option>
                <option value="0-30">0–30 Days</option>
                <option value="31-60">31–60 Days</option>
                <option value="60+">60+ Days</option>
              </select>
              <span className="material-symbols-outlined text-secondary text-[18px] absolute right-3 pointer-events-none">expand_more</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-space-xs self-end lg:self-center">
          <button onClick={handleReset} className="h-10 px-4 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>Reset
          </button>
          <button onClick={fetchReport} disabled={loading} className="h-10 px-5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-tertiary shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed">
            {loading ? (
              <span className="material-symbols-outlined text-[18px] ">hourglass_empty</span>
            ) : (
              <span className="material-symbols-outlined text-[18px]">filter_alt</span>
            )}
            {loading ? 'Applying...' : 'Apply Filters'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Total Outstanding</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">account_balance_wallet</span></div>
          </div>
          <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{fmt(totalOutstanding)}</div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">payments</span></div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Overdue Invoices</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">receipt_long</span></div>
          </div>
          <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{overdueInvoices} <span className="font-body-md text-body-md text-secondary font-normal">invoices</span></div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">receipt</span></div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Partially Paid</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">pie_chart</span></div>
          </div>
          <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{partiallyPaid}</div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">donut_small</span></div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Fully Unpaid</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">block</span></div>
          </div>
          <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{fullyUnpaid}</div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">money_off</span></div>
        </div>
      </div>

      <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-lowest">
          <div className="flex items-center gap-space-sm">
            <div className="w-9 h-9 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[22px]">table_chart</span></div>
            <div>
              <div className="flex items-center gap-space-xs">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Invoice Ledger</h3>
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm">Showing {filteredData.length} of {data?.data?.length || 0} invoices</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Unpaid and partially paid invoices for this branch</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleExport('CSV')} className="h-9 px-3 rounded-lg bg-surface-container text-on-surface font-label-sm text-label-sm hover:bg-surface-container-high transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">download</span> Export CSV
            </button>
            <button onClick={() => handleExport('PDF')} disabled={isExporting} className="h-9 px-3 rounded-lg bg-surface-container text-on-surface font-label-sm text-label-sm hover:bg-surface-container-high transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed">
              {isExporting ? <span className="material-symbols-outlined text-[16px] animate-spin">sync</span> : <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>}
              {isExporting ? 'Generating...' : 'Export PDF'}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className={`w-full text-left border-collapse ${hasData ? '' : 'hidden'}`}>
            <thead>
              <tr className="bg-surface-subtle text-secondary font-label-sm text-label-sm uppercase tracking-wider h-11">
                <th className="px-space-md py-2.5 font-semibold">Patient</th>
                <th className="px-space-md py-2.5 font-semibold">Invoice #</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Total</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Paid</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Outstanding</th>
                <th className="px-space-md py-2.5 font-semibold">Last Payment</th>
                <th className="px-space-md py-2.5 font-semibold text-center">Status</th>
                <th className="px-space-md py-2.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-subtle">
              {filteredData.map((d: any, i: number) => {
                const paidAmt = d.paid_amount;
                const dueAmt = d.due_amount;
                const un = d.status === 'Unpaid';
                const st = d.status;
                const c = un ? 'bg-status-cancelled-bg text-status-cancelled-text' : 'bg-status-pending-bg text-status-pending-text';
                const dot = un ? 'bg-status-cancelled-text' : 'bg-status-pending-text';
                const initials = (d.patient_name || 'U').split(' ').map((n: string) => n[0]).join('').substring(0, 2);
                
                return (
                  <tr key={i} className="hover:bg-surface-subtle/70 transition-colors">
                    <td className="px-space-md py-3.5">
                      <div className="flex items-center gap-space-sm">
                        <div className={`w-9 h-9 rounded-full ${un ? 'bg-error-container text-on-error-container' : 'bg-primary/10 text-primary'} flex items-center justify-center font-bold text-[14px]`}>{initials}</div>
                        <div className="min-w-0">
                          <div className="font-label-lg text-label-lg text-on-surface truncate">{d.patient_name}</div>
                          <div className="font-body-sm text-body-sm text-secondary">{d.patient_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-space-md py-3.5 font-mono-data text-mono-data font-semibold text-primary">{d.invoice_id}</td>
                    <td className="px-space-md py-3.5 text-right font-mono-data text-mono-data">{fmt(d.total_amount)}</td>
                    <td className="px-space-md py-3.5 text-right font-mono-data text-mono-data text-secondary">{fmt(paidAmt)}</td>
                    <td className="px-space-md py-3.5 text-right">
                      <span className={`px-2 py-0.5 rounded ${c} font-mono-data text-mono-data font-bold`}>{fmt(dueAmt)}</span>
                    </td>
                    <td className="px-space-md py-3.5 font-mono-data text-mono-data text-secondary">{un || !d.last_payment_date ? '—' : new Date(d.last_payment_date).toLocaleDateString()}</td>
                    <td className="px-space-md py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full ${c} font-label-sm text-label-sm`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${dot}`}></span>{st}
                      </span>
                    </td>
                    <td className="px-space-md py-3.5 text-center">
                      <button onClick={() => handleView(d)} className="px-3 py-1.5 rounded-lg bg-surface-container text-primary font-label-sm text-label-sm hover:bg-primary hover:text-on-primary transition-all flex items-center gap-1 mx-auto">
                        <span className="material-symbols-outlined text-[16px]">visibility</span>View Invoice
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {!hasData && !loading && (
            <div className="py-space-3xl px-space-md flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center text-secondary mb-space-sm"><span className="material-symbols-outlined text-[32px]">folder_off</span></div>
              <h4 className="font-headline-sm text-headline-sm text-on-surface">No data available for the selected criteria.</h4>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md mt-1">Adjust the aging range or search for another patient identifier or invoice number.</p>
              <button onClick={handleReset} className="mt-space-md px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-tertiary transition-colors">Clear Filters</button>
            </div>
          )}
          {loading && (
             <div className="py-space-3xl px-space-md flex justify-center text-center text-secondary">
               <span className="material-symbols-outlined  text-[32px]">hourglass_empty</span>
            </div>
          )}
        </div>
        <div className="p-space-md bg-surface-subtle flex flex-col sm:flex-row items-center justify-between gap-space-sm">
          <div className="flex items-center gap-2 text-body-sm font-body-sm text-secondary"><span className="material-symbols-outlined text-[16px] text-primary">verified</span>Reconciliation sync active · latest Colombo Central ledgers</div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-lg text-outline cursor-not-allowed" disabled type="button" aria-label="Previous page"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
            <span className="px-3 py-1 rounded-md bg-surface-card text-on-surface font-mono-data text-mono-data font-semibold">Page 1 of 1</span>
            <button className="p-1.5 rounded-lg text-outline cursor-not-allowed" disabled type="button" aria-label="Next page"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
          </div>
        </div>
      </div>

      <div className="bg-surface-card rounded-xl p-space-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md">
          <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-[24px]">contact_phone</span></div>
          <div><div className="font-headline-sm text-headline-sm text-on-surface">Need help with invoice escalation?</div><div className="font-body-sm text-body-sm text-secondary">Notify the patient liaison desk or send SMS reminders from central billing.</div></div>
        </div>
        <div className="flex items-center gap-space-sm">
          <button onClick={(e) => {
            const btn = e.currentTarget;
            const originalText = btn.innerText;
            btn.innerText = 'Links Sent!';
            setTimeout(() => { btn.innerText = originalText; }, 2000);
          }} className="h-10 px-4 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors" type="button">Send Payment Links</button>
          <a href="mailto:billing@medsync.com" className="h-10 px-5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-tertiary shadow-sm transition-colors flex items-center">Billing Help Desk</a>
        </div>
      </div>

      {isModalOpen && selectedInv && (
        <div className="fixed inset-0 z-[100] bg-brand-navy-deep/40 backdrop-blur-sm flex items-center justify-center p-space-md" onClick={() => setIsModalOpen(false)}>
          <div className="bg-surface-card rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-space-lg bg-surface-container-low flex items-start justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center"><span className="material-symbols-outlined text-[26px]">receipt</span></div>
                <div><div className="font-headline-sm text-headline-sm text-on-surface">{selectedInv.invoice_id}</div><div className="font-body-sm text-body-sm text-primary font-medium">Colombo Central Branch Registry</div></div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-lg bg-surface-card text-secondary hover:text-on-surface flex items-center justify-center transition-colors" aria-label="Close"><span className="material-symbols-outlined text-[20px]">close</span></button>
            </div>
            <div className="p-space-lg flex flex-col gap-space-md">
              <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-subtle"><span className="font-label-md text-label-md text-secondary">Patient</span><span className="font-label-md text-label-md text-on-surface font-semibold">{selectedInv.patient_name}</span></div>
              <div className="grid grid-cols-2 gap-space-sm">
                <div className="p-space-sm rounded-lg bg-surface-subtle flex flex-col"><span className="font-label-sm text-label-sm uppercase text-secondary">Total Invoiced</span><span className="font-headline-sm text-headline-sm font-bold text-on-surface">{fmt(selectedInv.total_amount)}</span></div>
                <div className="p-space-sm rounded-lg bg-surface-subtle flex flex-col"><span className="font-label-sm text-label-sm uppercase text-secondary">Paid Amount</span><span className="font-headline-sm text-headline-sm font-bold text-secondary">{fmt(selectedInv.paid_amount)}</span></div>
              </div>
              <div className="p-space-sm rounded-xl bg-surface-subtle flex items-center justify-between">
                <div><span className="font-label-sm text-label-sm uppercase tracking-wider text-primary">Balance Due</span><div className="font-headline-lg text-headline-lg text-primary font-bold">{fmt(selectedInv.due_amount)}</div></div>
                <span className={`px-3 py-1 rounded-full font-label-sm text-label-sm ${selectedInv.paid_amount === 0 ? 'bg-status-cancelled-bg text-status-cancelled-text' : 'bg-status-pending-bg text-status-pending-text'}`}>
                  {selectedInv.paid_amount === 0 ? 'Unpaid' : 'Partially Paid'}
                </span>
              </div>
              <div className="flex items-center justify-between text-body-sm font-body-sm text-secondary">
                <span>Last Recorded Payment</span>
                <strong className="font-mono-data text-mono-data text-on-surface">{(selectedInv.paid_amount === 0 || !selectedInv.last_payment_date) ? 'None recorded' : new Date(selectedInv.last_payment_date).toLocaleDateString()}</strong>
              </div>
            </div>
            <div className="p-space-md bg-surface-container-low flex justify-end gap-space-sm">
              <button onClick={() => setIsModalOpen(false)} className="h-10 px-4 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors">Close</button>
              <button onClick={handleRecordPayment} disabled={isRecordingPayment} className="h-10 px-5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-tertiary transition-colors flex items-center gap-1.5 disabled:opacity-50">
                {isRecordingPayment ? <span className="material-symbols-outlined text-[16px] ">hourglass_empty</span> : <span className="material-symbols-outlined text-[16px]">payments</span>}
                {isRecordingPayment ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}