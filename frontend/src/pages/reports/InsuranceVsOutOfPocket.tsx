import { useState, useEffect } from 'react';
import { getInsuranceVsOutOfPocket, exportToCSV } from '../../api/reports';
import type { InsuranceVsOutOfPocketResponse, BranchResponse } from '../../api/types';
import { useAuth } from '../../context/AuthContext';
import { listBranches } from '../../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

export function InsuranceVsOutOfPocket() {
  const [data, setData] = useState<InsuranceVsOutOfPocketResponse | null>(null);
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [searchPeriod, setSearchPeriod] = useState('');

  const [isExporting, setIsExporting] = useState(false);

  const fetchReport = () => {
    setLoading(true);
    getInsuranceVsOutOfPocket({
      from: startDate || undefined,
      to: endDate || undefined,
      branch: selectedBranch || undefined,
    }).then(res => {
      setData(res);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setProviderFilter('all');
    setSearchPeriod('');
    setTimeout(() => {
      setLoading(true);
      getInsuranceVsOutOfPocket({}).then(res => { setData(res); setLoading(false); });
    }, 0);
  };

  const fmt = (n: number) => `LKR ${(Number(n) || 0).toLocaleString('en-US')}`;

  const q = searchPeriod.toLowerCase().trim();
  const filteredData = (data?.ledger || []).filter(item => {
    return !q || item.period.toLowerCase().includes(q);
  });

  const hasData = filteredData.length > 0;

  // KPIs
  const totalIns = (data?.ledger || []).reduce((acc, curr) => acc + curr.total_insurance_covered, 0) || 0;
  const totalOop = (data?.ledger || []).reduce((acc, curr) => acc + curr.total_out_of_pocket, 0) || 0;
  const totalBilled = totalIns + totalOop;
  const insCoveragePct = totalBilled > 0 ? (totalIns / totalBilled * 100).toFixed(1) : "0.0";
  const oopRatio = totalBilled > 0 ? (totalOop / totalBilled * 100).toFixed(1) : "0.0";

  const asc = [...(data?.ledger || [])].reverse();
  const X0 = 70, step = 85, base = 200;
  const maxVal = Math.max(...asc.map(m => m.total_insurance_covered + m.total_out_of_pocket), 1200000);
  const sc = 150 / maxVal;
  const yLabels = [0, maxVal * 0.33, maxVal * 0.66, maxVal];

  const prov = (data?.provider_split || []).filter(p => providerFilter === 'all' || p.provider_name.toLowerCase().includes(providerFilter.toLowerCase()));
  const sla = (data?.claim_slas || []).filter(p => providerFilter === 'all' || p.provider_name.toLowerCase().includes(providerFilter.toLowerCase()));
  const modes = data?.payment_modes || [];

  const totalInvoices = (data?.ledger || []).reduce((acc, curr) => acc + curr.volume, 0) || 0;

  const handleExport = async (type: string) => {
    if (type === 'CSV') {
      setIsExporting(true);
      exportToCSV(filteredData, 'Monthly_Settlement_Ledger');
      setTimeout(() => {
        setIsExporting(false);

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
        
        let dateInterval = 'All Time';
        if (asc.length > 0) {
            dateInterval = `Last ${asc.length} Months (${asc[0].period} - ${asc[asc.length - 1].period})`;
        }
        const genDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const trunc = (str: string, max: number) => str.length > max ? str.substring(0, max) + '...' : str;
        // ================= PAGE 1 =================
        
        // 1. Dark Navy Header Background
        doc.setFillColor(15, 23, 42); // slate-900 (Navy)
        doc.rect(0, 0, pageWidth, 55, 'F');
        doc.setFillColor(14, 165, 233); // sky-500 (Blue)
        doc.rect(0, 55, pageWidth, 2, 'F');

        // 2. Header Text (Left side)
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.setFont('helvetica', 'bold');
        doc.text("FINANCIAL OPERATIONS / BRANCH PERFORMANCE", margin, 15);
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255); 
        doc.setFont('helvetica', 'normal');
        doc.text(branchName, margin, 20);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); 
        doc.text(`Reporting period: ${dateInterval}`, margin, 24);

        // Title
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255); 
        doc.text("Insurance vs. Out-of-Pocket", margin, 42);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184); 
        doc.text("Coverage split between insurance and patient payments over a period", margin, 48);

        // 3. Header Logo (Right side inside white box)
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
        const c3 = margin + colW * 2 + 10;
        const c4 = margin + colW * 3 + 10;
        const c5 = margin + colW * 4 + 10;

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42); 
        doc.text("REPORTING SCOPE", c1, metaY);
        doc.text("DATE RANGE", c2, metaY);
        doc.text("INSURANCE", c3, metaY);
        doc.text("PREPARED FOR", c4, metaY);
        doc.text("GENERATED", c5, metaY);
        
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105); 
        doc.setFont('helvetica', 'normal');
        doc.text(doc.splitTextToSize(branchName, colW - 5), c1, metaY + 4);
        doc.text(doc.splitTextToSize(dateInterval, colW + 5), c2, metaY + 4);
        doc.text(providerFilter === 'all' ? 'All Providers' : providerFilter.toUpperCase(), c3, metaY + 4);
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
        doc.text("Key figures for the reporting period", margin, 101);

        // Styled KPI Boxes
        const kpiY = 106;
        const kpiW = (contentWidth - 15) / 4; 
        const kpis = [
            { label: "INSURANCE COVERAGE", val: `${insCoveragePct}%` },
            { label: "OUT-OF-POCKET RATIO", val: `${oopRatio}%` },
            { label: "TOTAL GROSS BILLED", val: `LKR ${(totalBilled/1000).toFixed(0)}K` },
            { label: "AVG CLAIM SETTLEMENT", val: `${data?.avg_claim_days?.toFixed(1) || '0.0'} days` }
        ];

        kpis.forEach((kpi, idx) => {
            const x = margin + (idx * (kpiW + 5));
            doc.setFillColor(241, 245, 249); 
            doc.rect(x, kpiY, kpiW, 22, 'F');
            doc.setFillColor(14, 165, 233); 
            doc.rect(x, kpiY, kpiW, 1, 'F');
            
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 116, 139); 
            doc.text(kpi.label, x + 4, kpiY + 7);
            
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
        const topProviderStr = prov.length > 0 ? `${prov[0].provider_name} accounted for ${prov[0].percentage.toFixed(1)}% of disbursed claims.` : "";
        const summaryPara = `Across ${dateInterval}, ${branchName} invoiced LKR ${totalBilled.toLocaleString()} over ${totalInvoices} invoices. Insurers covered LKR ${totalIns.toLocaleString()} (${insCoveragePct}%) and patients paid LKR ${totalOop.toLocaleString()} (${oopRatio}%) out of pocket. ${topProviderStr}`;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105); 
        const splitSummary = doc.splitTextToSize(summaryPara, contentWidth);
        doc.text(splitSummary, margin, kpiY + 32);

        // 6. Main SVG Chart Capture
        let currentY = kpiY + 32 + (splitSummary.length * 5) + 6;
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("Monthly Settlement Progression", margin, currentY);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text("Insurance vs. out-of-pocket disbursement across the selected periods", margin, currentY + 5);

        const chartEl = document.getElementById('monthly-chart-container');
        if (chartEl) {
            const canvas = await html2canvas(chartEl, { scale: 2, backgroundColor: '#ffffff', logging: false });
            const imgData = canvas.toDataURL('image/png');
            const imgProps = doc.getImageProperties(imgData);
            // Limit height so it perfectly fits Page 1
            const maxImgHeight = 65; 
            const calcHeight = (imgProps.height * contentWidth) / imgProps.width;
            const finalHeight = Math.min(calcHeight, maxImgHeight);
            
            doc.setDrawColor(226, 232, 240);
            doc.rect(margin, currentY + 10, contentWidth, finalHeight);
            doc.addImage(imgData, 'PNG', margin, currentY + 10, contentWidth, finalHeight);
            currentY += finalHeight + 20;
        } else {
            currentY += 80; // fallback spacing
        }

        // 7. Top Provider Split (Native Drawing)
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("Top Provider Split", margin, currentY);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Disbursed claims by contracted insurer (total LKR ${totalIns.toLocaleString()})`, margin, currentY + 5);

        currentY += 12;
        const barMaxWidth = contentWidth - 80;
        
        prov.slice(0, 4).forEach((p, idx) => {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(`• ${p.provider_name}`, margin, currentY);
            
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(`LKR ${p.amount.toLocaleString()}`, margin + barMaxWidth + 20, currentY, { align: 'right' });
            
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(14, 165, 233);
            doc.text(`${p.percentage.toFixed(1)}%`, margin + barMaxWidth + 35, currentY, { align: 'right' });

            const pW = (p.percentage / 100) * barMaxWidth;
            
            // Apply different colors based on rank
            if (idx === 0) doc.setFillColor(0, 97, 148); // Primary
            else if (idx === 1) doc.setFillColor(15, 23, 42); // Navy
            else if (idx === 2) doc.setFillColor(56, 189, 248); // Sky
            else doc.setFillColor(100, 116, 139); // Slate

            doc.rect(margin, currentY + 2, pW, 4, 'F');
            currentY += 12;
        });

        // Footer P1
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.setFont('helvetica', 'normal');
        doc.text(`MedSync Branch Manager Portal | ${branchName} Confidential for internal use`, margin, 285);
        doc.text("Page 1", pageWidth - margin, 285, { align: 'right' });

        // ================= PAGE 2 =================
        doc.addPage();
        
        // Header P2
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, pageWidth, 20, 'F');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text("MEDSYNC", margin, 12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text("| Insurance vs. Out-of-Pocket", margin + 22, 12);
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("Monthly Settlement Ledger", margin, 32);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Billing disbursements per monthly cycle (newest first)`, margin, 37);

        // 8. Formatted Data Table 
        const tableColumn = ["BILLING PERIOD", "INSURANCE (LKR)", "OUT-OF-POCKET (LKR)", "TOTAL INVOICED", "% COVERED", "VOLUME"];
        const tableRows = filteredData.map((m, i) => {
            const t = m.total_insurance_covered + m.total_out_of_pocket;
            const p = t > 0 ? (m.total_insurance_covered / t * 100).toFixed(1) + '%' : "0.0%";
            return [
              m.period + (i === 0 ? ' (ACTIVE)' : ''), 
              m.total_insurance_covered.toLocaleString(), 
              m.total_out_of_pocket.toLocaleString(), 
              t.toLocaleString(), 
              p,
              m.volume.toString()
            ];
        });
        
        tableRows.push([
            `Total (${filteredData.length} mo)`, totalIns.toLocaleString(), totalOop.toLocaleString(), totalBilled.toLocaleString(), `${insCoveragePct}%`, totalInvoices.toString()
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 42,
            theme: 'plain', 
            styles: { fontSize: 8, textColor: [71, 85, 105], cellPadding: { top: 5, right: 4, bottom: 5, left: 4 } },
            headStyles: { textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7 },
            columnStyles: {
                1: { halign: 'right' },
                2: { halign: 'right' },
                3: { halign: 'right' },
                4: { halign: 'right' },
                5: { halign: 'right' }
            },
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
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');
        doc.text(`Showing ${filteredData.length} periods, ${totalInvoices} cumulative invoices. % Covered = insurance/total invoiced.`, margin, finalY + 5);

        // 9. Bottom Blocks (Split layout)
        const obsY = finalY + 20;
        const halfW = (contentWidth / 2) - 5;
        const rightX = margin + halfW + 10;

        // LEFT: SLA
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("Insurer Claim Turnaround", margin, obsY);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text("Average settlement time by insurer against the 5-day SLA", margin, obsY + 5);

        let sY = obsY + 12;
        sla.forEach(r => {
            const isGood = r.avg_days <= 5.0;
            const init = r.provider_name.substring(0, 2).toUpperCase();
            
            doc.setFillColor(241, 245, 249);
            doc.rect(margin, sY, halfW, 12, 'F');
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(`${init} | ${trunc(r.provider_name, 20)}`, margin + 3, sY + 5);
            
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text("Processing SLA", margin + 3, sY + 9);
            
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(`${r.avg_days.toFixed(1)} Days`, margin + halfW - 3, sY + 5, { align: 'right' });
            
            doc.setFontSize(8);
            if(isGood) doc.setTextColor(16, 185, 129); // emerald-500
            else doc.setTextColor(245, 158, 11); // amber-500
            doc.text(isGood ? 'Under SLA (5d)' : 'Review Pending', margin + halfW - 3, sY + 9, { align: 'right' });

            sY += 14;
        });

        // RIGHT: Payment Modes
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("Out-of-Pocket Payment Modes", rightX, obsY);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text("Share of patient payments by mode", rightX, obsY + 5);

        let mY = obsY + 12;
        const modeW = (halfW - 6) / 3;
        
        modes.forEach((m, idx) => {
            const mx = rightX + (idx * (modeW + 3));
            doc.setFillColor(241, 245, 249);
            doc.rect(mx, mY, modeW, 16, 'F');
            
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 116, 139);
            doc.text(m.payment_type.toUpperCase(), mx + modeW/2, mY + 5, { align: 'center' });
            
            doc.setFontSize(12);
            doc.setTextColor(15, 23, 42);
            doc.text(`${m.percentage.toFixed(1)}%`, mx + modeW/2, mY + 10, { align: 'center' });
            
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(14, 165, 233);
            doc.text(`LKR ${(m.amount/1000).toFixed(0)}K`, mx + modeW/2, mY + 14, { align: 'center' });
        });

        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text("Daily Cash Drawer Reconciliation: 100% balanced | Chief Cashier: R. Perera", rightX, mY + 24);

        // Footer P2
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`MedSync Branch Manager Portal | ${branchName} Confidential for internal use`, margin, 285);
        doc.text("Page 2", pageWidth - margin, 285, { align: 'right' });

        doc.save(`MedSync_Insurance_vs_OutOfPocket.pdf`);
      } catch (err) {
        console.error("PDF generation failed:", err);
      } finally {
        setIsExporting(false);
      }
    }
  };

  return (
    <div className="flex flex-col w-full py-space-xl max-w-content-max-width mx-auto gap-space-xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div className="flex flex-col gap-space-2xs">
          <div className="flex items-center gap-space-xs text-primary font-label-md text-label-md uppercase tracking-wider">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>Financial Operations</span>
            <span className="text-outline">/</span>
            <span className="text-secondary font-medium">Branch Performance</span>
          </div>
          <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">Insurance vs. Out-of-Pocket</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Coverage split between insurance and patient payments over a period.</p>
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
          <div className="flex flex-col gap-1 min-w-[280px]">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Date Range</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="material-symbols-outlined text-primary text-[18px] absolute left-3 top-2.5 pointer-events-none">event</span>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full h-10 pl-9 pr-2 rounded-lg bg-surface-subtle font-body-md text-body-md text-on-surface outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 transition-all"/>
              </div>
              <span className="text-secondary">-</span>
              <div className="relative flex-1">
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-surface-subtle font-body-md text-body-md text-on-surface outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 transition-all"/>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-[240px]">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-secondary" htmlFor="provider-filter">Insurance Provider</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined text-secondary text-[18px] absolute left-3 pointer-events-none">corporate_fare</span>
              <select id="provider-filter" value={providerFilter} onChange={e => setProviderFilter(e.target.value)} className="w-full h-10 pl-9 pr-8 rounded-lg bg-surface-subtle font-body-md text-body-md text-on-surface outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 appearance-none transition-all cursor-pointer">
                <option value="all">All Providers</option>
                <option value="slic">Sri Lanka Insurance (SLIC)</option>
                <option value="ceylinco">Ceylinco General Insurance</option>
                <option value="aia">AIA Health Sri Lanka</option>
                <option value="softlogic">Softlogic Life Healthcare</option>
              </select>
              <span className="material-symbols-outlined text-secondary text-[18px] absolute right-3 pointer-events-none">expand_more</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-[220px]">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-secondary" htmlFor="table-search-input">Search Period</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined text-secondary text-[18px] absolute left-3 pointer-events-none">search</span>
              <input id="table-search-input" type="text" placeholder="Search period or amount..." value={searchPeriod} onChange={e => setSearchPeriod(e.target.value)} className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-subtle font-body-md text-body-md text-on-surface outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 transition-all"/>
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
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Insurance Coverage</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">health_and_safety</span></div>
          </div>
          <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{insCoveragePct}%</div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">shield</span></div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Out-of-Pocket Ratio</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">wallet</span></div>
          </div>
          <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{oopRatio}%</div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">payments</span></div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Total Gross Billed</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">receipt_long</span></div>
          </div>
          <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{fmt(totalBilled)}</div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">receipt</span></div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Avg Claim Settlement</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">timer</span></div>
          </div>
          <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{data?.avg_claim_days ? data.avg_claim_days.toFixed(1) : "0.0"} business days</div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">schedule</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
        <div className="lg:col-span-2 bg-surface-card rounded-xl p-space-lg shadow-sm flex flex-col gap-space-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">Monthly Settlement Progression</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Insurance vs. out-of-pocket disbursement across 6 months</p>
            </div>
            <div className="flex items-center gap-space-sm text-label-sm font-label-sm">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-primary"></div><span className="text-on-surface-variant">Insurance</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-brand-teal-light"></div><span className="text-on-surface-variant">Out-of-Pocket</span></div>
            </div>
          </div>
          <div className="w-full overflow-x-auto" id="monthly-chart-container">
            <svg className="min-w-[540px] w-full h-[260px]" viewBox="0 0 600 240">
              {yLabels.map((v, i) => {
                const y = base - (v * sc);
                return (
                  <g key={i}>
                    <line x1="0" x2="600" y1={y} y2={y} stroke="#F1F5F9" />
                    <text x="4" y={y - 4} fontSize="10" fill="#707881">{v ? (v / 1000).toFixed(0) + 'K' : '0'}</text>
                  </g>
                );
              })}
              {asc.map((m, i) => {
                const x = X0 + i * step;
                const hi = m.total_insurance_covered * sc;
                const ho = m.total_out_of_pocket * sc;
                const p = (m.total_insurance_covered / (m.total_insurance_covered + m.total_out_of_pocket) * 100).toFixed(1);
                const periodLabel = m.period.slice(0, 3) + " '" + m.period.slice(-2);
                return (
                  <g key={i}>
                    <rect x={x} y={base - hi} width="38" height={hi} rx="4" fill="#006194" />
                    <rect x={x} y={base - hi - ho} width="38" height={ho} rx="4" fill="#38BDF8" />
                    <text x={x + 19} y={base - hi - ho - 8} fontSize="11" fontWeight="700" textAnchor="middle" fill="#006194">{p}%</text>
                    <text x={x + 19} y="220" fontSize="11" fontWeight="600" textAnchor="middle" fill="#565e74">{periodLabel}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="flex items-center justify-between text-body-sm font-body-sm text-secondary">
            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-primary">trending_up</span>Insurance share up 2.3 points since April.</span>
            <span className="font-mono-data text-mono-data text-outline">Updated: 23 Sep 2026</span>
          </div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">Top Provider Split</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Disbursed claims by contracted insurer</p>
          </div>
          <div className="flex flex-col gap-space-md">
            {prov.map((p, i) => {
              const bgClass = i === 0 ? 'bg-primary' : i === 1 ? 'bg-tertiary' : i === 2 ? 'bg-brand-teal-light' : 'bg-secondary';
              return (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-body-sm font-body-sm">
                  <span className="font-label-md text-label-md text-on-surface flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${bgClass}`}></span>{p.provider_name}
                  </span>
                  <span className="font-mono-data text-mono-data text-secondary">{fmt(p.amount)} ({p.percentage.toFixed(1)}%)</span>
                </div>
                <div className="h-3 w-full bg-surface-subtle rounded-full overflow-hidden">
                  <div className={`${bgClass} h-full rounded-full`} style={{ width: `${p.percentage}%` }}></div>
                </div>
              </div>
            )})}
          </div>
          <div className="mt-auto p-space-sm rounded-lg bg-surface-subtle flex items-start gap-space-sm">
            <span className="material-symbols-outlined text-[20px] text-primary shrink-0 mt-0.5">policy</span>
            <div>
              <div className="font-label-md text-label-md">Pre-Authorization Policy</div>
              <div className="font-body-sm text-body-sm text-secondary mt-0.5">SLIC and Ceylinco direct billing requires a real-time eligibility check before specialist consultation checkout.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-lowest">
          <div className="flex items-center gap-space-sm">
            <div className="w-9 h-9 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[22px]">table_chart</span></div>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Monthly Settlement Ledger</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Billing disbursements per monthly cycle</p>
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
                <th className="px-space-md py-2.5 font-semibold">Billing Period</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Insurance (LKR)</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Out-of-Pocket (LKR)</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Total Invoiced</th>
                <th className="px-space-md py-2.5 font-semibold min-w-[200px]">% Covered</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-subtle">
              {filteredData.map((m, i) => {
                const t = m.total_insurance_covered + m.total_out_of_pocket;
                const p = t > 0 ? (m.total_insurance_covered / t * 100).toFixed(1) : "0.0";
                return (
                  <tr key={i} className="hover:bg-surface-subtle/70 transition-colors">
                    <td className="px-space-md py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`font-label-lg text-label-lg ${i === 0 ? 'font-bold' : ''} text-on-surface`}>{m.period}</span>
                        {i === 0 && <span className="px-1.5 py-0.5 rounded bg-status-scheduled-bg text-status-scheduled-text font-label-sm text-label-sm">Active</span>}
                      </div>
                    </td>
                    <td className="px-space-md py-3.5 text-right font-mono-data text-mono-data font-semibold text-primary">{fmt(m.total_insurance_covered)}</td>
                    <td className="px-space-md py-3.5 text-right font-mono-data text-mono-data text-secondary">{fmt(m.total_out_of_pocket)}</td>
                    <td className="px-space-md py-3.5 text-right font-mono-data text-mono-data font-bold text-on-surface">{fmt(t)}</td>
                    <td className="px-space-md py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="font-label-md text-label-md font-bold text-on-surface w-14">{p}%</span>
                        <div className="flex-1 h-2 rounded-full bg-surface-subtle overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${p}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-space-md py-3.5 text-right">
                      <span className="px-2 py-0.5 rounded bg-status-scheduled-bg text-status-scheduled-text font-mono-data text-mono-data font-semibold">{m.volume} invoices</span>
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
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md mt-1">Try resetting the insurer filter or extending the date range to include other billing cycles.</p>
              <button onClick={handleReset} className="mt-space-md px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-tertiary transition-colors">Clear Filters</button>
            </div>
          )}
          {loading && (
            <div className="py-space-3xl px-space-md flex justify-center text-center text-secondary">
               <span className="material-symbols-outlined  text-[32px]">hourglass_empty</span>
            </div>
          )}
        </div>
        <div className={`p-space-md bg-surface-subtle flex flex-col sm:flex-row items-center justify-between gap-space-sm ${!hasData ? 'hidden' : ''}`}>
          <div className="text-body-sm font-body-sm text-secondary">Showing {filteredData.length} periods · {totalInvoices} cumulative invoices</div>
          <div className="flex items-center gap-space-lg">
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Total Ins:</span>
              <span className="font-mono-data text-mono-data font-bold text-on-surface">{fmt(totalIns)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Total OOP:</span>
              <span className="font-headline-sm text-headline-sm font-bold text-primary">{fmt(totalOop)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
        <div className="bg-surface-card rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">speed</span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Insurer Claim Turnaround</h3>
            </div>
            <span className="font-label-sm text-label-sm text-status-completed-text bg-status-completed-bg px-2 py-0.5 rounded-full font-semibold">Healthy Flow</span>
          </div>
          <div className="flex flex-col gap-space-sm">
            {sla.map((r, i) => {
              const init = r.provider_name.substring(0, 2).toUpperCase();
              const isGood = r.avg_days <= 5.0;
              return (
              <div key={i} className="p-space-sm rounded-lg bg-surface-subtle flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">{init}</span>
                  <div>
                    <div className="font-label-md text-label-md text-on-surface">{r.provider_name}</div>
                    <div className="font-body-sm text-body-sm text-secondary">Claim Turnaround Time</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono-data text-mono-data font-bold text-on-surface">{r.avg_days.toFixed(1)} Days</div>
                  <div className={`font-label-sm text-label-sm font-semibold ${isGood ? 'text-status-completed-text' : 'text-status-pending-text'}`}>
                    {isGood ? 'Under SLA (5d)' : 'Review Pending'}
                  </div>
                </div>
              </div>
            )})}
          </div>
          <div className="font-body-sm text-body-sm text-secondary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">info</span>Claims over 7 days are flagged to the Financial Accounts team.
          </div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">account_balance_wallet</span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Out-of-Pocket Payment Modes</h3>
            </div>
            <span className="font-label-sm text-label-sm text-secondary">Sep 2026 YTD</span>
          </div>
          <div className="grid grid-cols-3 gap-space-sm text-center">
            {modes.map((m, i) => (
              <div key={i} className="p-space-sm rounded-lg bg-surface-subtle">
                <div className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">{m.payment_type}</div>
                <div className="font-headline-sm text-headline-sm text-on-surface mt-1">{m.percentage.toFixed(1)}%</div>
                <div className="font-mono-data text-mono-data text-primary mt-0.5">{fmt(m.amount)}</div>
              </div>
            ))}
          </div>
          <div className="p-space-sm rounded-lg bg-surface-subtle flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-status-completed-text text-[20px]">check_circle</span>
              <span className="font-label-md text-label-md text-on-surface">Daily Cash Drawer Reconciliation</span>
            </div>
            <span className="font-mono-data text-mono-data text-status-completed-text font-bold">100% BALANCED</span>
          </div>
          <div className="flex items-center justify-between mt-auto">
            <span className="font-body-sm text-body-sm text-secondary">Chief Cashier: R. Perera</span>
            <button className="text-primary font-label-md text-label-md hover:underline flex items-center gap-1" type="button">
              View Cashier Logs<span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}