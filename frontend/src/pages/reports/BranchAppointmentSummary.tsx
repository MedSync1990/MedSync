import { useState, useEffect } from 'react';
import { getAppointmentsSummary, exportToCSV, downloadManagementPdf } from '../../api/reports';
import type { AppointmentsSummaryResponse, BranchResponse } from '../../api/types';
import { useAuth } from '../../context/AuthContext';
import { listBranches } from '../../api';

export default function BranchAppointmentSummary() {
  const [data, setData] = useState<AppointmentsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isApplying, setIsApplying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { user } = useAuth();
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<number | ''>('');
  const [appliedParams, setAppliedParams] = useState<Record<string, string | number | undefined>>({});

  useEffect(() => {
    if (user?.role === 'Administrator') {
      listBranches().then(setBranches);
    }
  }, [user?.role]);

  const fetchSummary = () => {
    const typeMap: Record<string, string> = {
      'doctor': 'Scheduled Visit',
      'followup': 'Follow-up',
      'walkin': 'Walk-in'
    };
    const params: any = categoryFilter === 'all' ? {} : { appointment_type: typeMap[categoryFilter] };
    if (selectedBranch) params.branch = selectedBranch;
    return getAppointmentsSummary(Object.keys(params).length > 0 ? params : undefined).then(res => {
      setAppliedParams({ branch_id: selectedBranch || undefined, appointment_type: params.appointment_type });
      setData(res);
    });
  };

  useEffect(() => {
    fetchSummary().then(() => setLoading(false));
  }, []);

  const handleApply = () => {
    setIsApplying(true);
    fetchSummary().then(() => setIsApplying(false));
  };

  const handleReset = () => {
    setCategoryFilter('all');
    setTimeout(() => {
      setIsApplying(true);
      getAppointmentsSummary().then(res => {
        setAppliedParams({});
        setData(res);
        setIsApplying(false);
      });
    }, 0);
  };

  const handleExport = async (type: string) => {
    if (type === 'CSV') {
      exportToCSV(data?.daily_data || [], 'Branch_Appointment_Summary');
    } else if (type === 'PDF') {
      try {
        setIsExporting(true);
        
        // 1. Dark Navy Header Background
        doc.setFillColor(15, 23, 42); // slate-900 (Navy)
        doc.rect(0, 0, pageWidth, 55, 'F');
        
        // Bright Blue Accent Line
        doc.setFillColor(14, 165, 233); // sky-500 (Blue)
        doc.rect(0, 55, pageWidth, 2, 'F');

        // 2. Header Text (Left side)
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.setFont('helvetica', 'bold');
        doc.text("OPERATIONAL ANALYTICS / APPOINTMENTS", margin, 15);
        
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255); // white
        doc.setFont('helvetica', 'normal');
        doc.text(branchName, margin, 20);
        
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(`Reporting period: ${dateInterval}`, margin, 24);

        // Title
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255); // white
        doc.text("Branch Appointment Summary", margin, 42);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text("Scheduled, completed and cancelled appointments by branch and day", margin, 48);

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
          // Center image perfectly inside the white box
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
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text("REPORTING SCOPE", c1, metaY);
        doc.text("DATE INTERVAL", c2, metaY);
        doc.text("CATEGORY", c3, metaY);
        doc.text("PREPARED FOR", c4, metaY);
        doc.text("GENERATED", c5, metaY);
        
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105); // slate-600
        doc.setFont('helvetica', 'normal');
        const trunc = (str: string, max: number) => str.length > max ? str.substring(0, max) + '...' : str;
        doc.text(doc.splitTextToSize(branchName, colW - 5), c1, metaY + 4);
        doc.text(doc.splitTextToSize(dateInterval, colW - 5), c2, metaY + 4);
        doc.text(doc.splitTextToSize(categoryFilter === 'all' ? 'All Categories' : categoryFilter, colW - 5), c3, metaY + 4);
        doc.text(doc.splitTextToSize(userName, colW - 5), c4, metaY + 4);
        doc.text(genDate, c5, metaY + 4);

        // Line separator
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.5);
        doc.line(margin, 82, pageWidth - margin, 82);

        // 5. Executive Summary
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text("Executive Summary", margin, 96);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text("Key figures for the reporting period", margin, 101);

        // Styled KPI Boxes
        const kpiY = 106;
        const kpiW = (contentWidth - 15) / 4; 
        const kpis = [
            { label: "TOTAL SCHEDULED", val: totalScheduled.toString() },
            { label: "TOTAL COMPLETED", val: totalCompleted.toString() },
            { label: "TOTAL CANCELLED", val: totalCancelled.toString() },
            { label: "WALK-IN INFLOW", val: totalWalkins.toString() }
        ];

        kpis.forEach((kpi, idx) => {
            const x = margin + (idx * (kpiW + 5));
            
            // Light gray box
            doc.setFillColor(241, 245, 249); // slate-100
            doc.rect(x, kpiY, kpiW, 22, 'F');
            
            // Top blue accent border on the box
            doc.setFillColor(14, 165, 233); // sky-500
            doc.rect(x, kpiY, kpiW, 1, 'F');
            
            // Text inside box (Left aligned)
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 116, 139); // slate-500
            doc.text(kpi.label, x + 4, kpiY + 7);
            
            // Large number
            doc.setFontSize(22);
            doc.setTextColor(15, 23, 42); // slate-900
            doc.text(kpi.val, x + 4, kpiY + 18);
        });

        // Summary Paragraph
        const completionRate = totalScheduled > 0 ? ((totalCompleted / totalScheduled) * 100).toFixed(1) : "0.0";
        const pending = totalScheduled - totalCompleted - totalCancelled;
        const peakDay = chartData.length > 0 ? chartData.reduce((max, d) => d.scheduled > max.scheduled ? d : max, chartData[0]) : null;
        const peakDateStr = peakDay ? new Date(peakDay.date).toLocaleDateString('en-GB', { month: 'short', day: '2-digit' }) : '';
        
        let lowestRate = 100;
        let lowestDay = '';
        chartData.forEach(d => {
            if (d.scheduled > 0) {
                const r = (d.completed / d.scheduled) * 100;
                if (r < lowestRate) { 
                    lowestRate = r; 
                    lowestDay = new Date(d.date).toLocaleDateString('en-GB', { month: 'short', day: '2-digit' }); 
                }
            }
        });

        const summaryPara = `Between ${dateInterval}, ${branchName} scheduled ${totalScheduled} appointments, of which ${totalCompleted} were completed (${completionRate}%), ${totalCancelled} were cancelled (${totalScheduled ? ((totalCancelled/totalScheduled)*100).toFixed(1) : 0}%) and ${pending} remained pending or in another status. Demand peaked on ${peakDateStr} with ${peakDay?.scheduled || 0} appointments. The lowest daily completion rate was ${lowestRate === 100 ? 0.0 : lowestRate.toFixed(1)}% on ${lowestDay || 'N/A'}.`;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105); // slate-600
        const splitSummary = doc.splitTextToSize(summaryPara, contentWidth);
        doc.text(splitSummary, margin, kpiY + 32);

        // 6. Chart Section
        let currentY = kpiY + 32 + (splitSummary.length * 5) + 6;
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("Daily Volume & Outcomes", margin, currentY);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text("Each bar is the day's scheduled total, split by outcome", margin, currentY + 5);

        const chartEl = document.getElementById('chart-container');
        if (chartEl) {
            const canvas = await html2canvas(chartEl, { scale: 2, backgroundColor: '#ffffff', logging: false });
            const imgData = canvas.toDataURL('image/png');
            const imgProps = doc.getImageProperties(imgData);
            const pdfHeight = (imgProps.height * contentWidth) / imgProps.width;
            
            // Draw a subtle border around the chart image
            doc.setDrawColor(226, 232, 240);
            doc.rect(margin, currentY + 10, contentWidth, pdfHeight);
            doc.addImage(imgData, 'PNG', margin, currentY + 10, contentWidth, pdfHeight);
        }

        // Footer P1
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`MedSync Branch Manager Portal | ${branchName} Confidential for internal use`, margin, 285);
        doc.text("Page 1", pageWidth - margin, 285, { align: 'right' });

        // ================= PAGE 2 =================
        doc.addPage();
        
        // 7. P2 Simple Navy Header
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, 0, pageWidth, 20, 'F');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text("MEDSYNC", margin, 12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text("| Branch Appointment Summary", margin + 22, 12);
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("Daily Breakdown Records", margin, 32);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Appointment lifecycle log for ${branchName} (newest first)`, margin, 37);

        // 8. Formatted Data Table 
        const tableColumn = ["BRANCH", "DATE", "SCHEDULED", "COMPLETED", "CANCELLED", "COMPLETION RATE"];
        const tableRows = tableData.map(d => {
            const p = d.scheduled > 0 ? ((d.completed / d.scheduled) * 100).toFixed(1) + '%' : "0.0%";
            const displayDate = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
            return [branchName, displayDate, d.scheduled.toString(), d.completed.toString(), d.cancelled.toString(), p];
        });
        
        // Total Row
        tableRows.push([
            `Total (${tableData.length} days)`, "", totalScheduled.toString(), totalCompleted.toString(), totalCancelled.toString(), `${completionRate}%`
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 42,
            theme: 'plain', 
            styles: { fontSize: 9, textColor: [71, 85, 105], cellPadding: { top: 5, right: 4, bottom: 5, left: 4 } },
            headStyles: { textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 8 },
            columnStyles: {
                2: { halign: 'right' },
                3: { halign: 'right' },
                4: { halign: 'right' },
                5: { halign: 'right' }
            },
            didDrawCell: function(data) {
                // Subtle row dividers
                if (data.row.section === 'body' || data.row.section === 'head') {
                    doc.setDrawColor(226, 232, 240);
                    doc.setLineWidth(0.2);
                    doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
                }
            },
            didParseCell: function(data) {
                // Bold the total row
                if (data.row.index === tableRows.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [15, 23, 42];
                }
            }
        });

        // Table Footer Caption
        const finalY = (doc as any).lastAutoTable.finalY || 150;
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');
        doc.text(`Showing ${tableRows.length > 1 ? tableRows.length - 1 : 0} entries. Completion rate = completed/scheduled. Pending/other = scheduled - completed - cancelled.`, margin, finalY + 5);

        // 9. Key Observations Section
        const obsY = finalY + 20;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("Key Observations", margin, obsY);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text("Derived from the daily figures above", margin, obsY + 5);

        const obsW = (contentWidth - 10) / 3;
        const avgSched = (totalScheduled / (tableRows.length > 1 ? tableRows.length - 1 : 1)).toFixed(1);
        const avgComp = (totalCompleted / (tableRows.length > 1 ? tableRows.length - 1 : 1)).toFixed(1);
        const cancelRate = totalScheduled ? ((totalCancelled/totalScheduled)*100).toFixed(1) : "0.0";
        const maxCancellations = chartData.length > 0 ? Math.max(...chartData.map(d => d.cancelled)) : 0;

        const observations = [
            {
                title: "Peak Day",
                desc: `${peakDateStr} was the busiest day with ${peakDay?.scheduled || 0} scheduled appointments and ${peakDay?.completed || 0} completed.`,
                metric: `${peakDay && peakDay.scheduled > 0 ? ((peakDay.completed/peakDay.scheduled)*100).toFixed(1) : 0}% completion`
            },
            {
                title: "Cancellations",
                desc: `${totalCancelled} appointments were cancelled over the period (${cancelRate}% of scheduled). No single day exceeded ${maxCancellations} cancellations.`,
                metric: `${cancelRate}% rate`
            },
            {
                title: "Daily Average",
                desc: `The branch averaged ${avgSched} scheduled and ${avgComp} completed appointments per day.`,
                metric: `Peak Completion: ${peakDay && peakDay.scheduled > 0 ? ((peakDay.completed/peakDay.scheduled)*100).toFixed(1) : 0}%`
            }
        ];

        observations.forEach((obs, idx) => {
            const x = margin + (idx * (obsW + 5));
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(obs.title, x, obsY + 15);
            
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            const splitDesc = doc.splitTextToSize(obs.desc, obsW);
            doc.text(splitDesc, x, obsY + 22);

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(14, 165, 233);
            doc.text(obs.metric, x, obsY + 45);
        });

        // Footer P2
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.setFont('helvetica', 'normal');
        doc.text(`MedSync Branch Manager Portal | ${branchName} Confidential for internal use`, margin, 285);
        doc.text("Page 2", pageWidth - margin, 285, { align: 'right' });

        doc.save(`MedSync_Branch_Appointment_Summary.pdf`);
=======
        await downloadManagementPdf('appointments-summary', { ...appliedParams });
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to generate PDF");
        console.error("PDF generation failed:", err);
      } finally {
        setIsExporting(false);
      }
    }
  };

  const hasData = categoryFilter === 'all' && data && data.daily_data && data.daily_data.length > 0;
  
  // Safe extraction for KPIs
  const totalScheduled = data?.total_scheduled || 0;
  const totalCompleted = data?.total_completed || 0;
  const totalCancelled = data?.total_cancelled || 0;
  const totalWalkins = data?.total_walkins || 0;

  // Chart
  const base = 200;
  const top = 30;
  const dynamicMax = data?.daily_data?.reduce((m: number, d: any) => Math.max(m, d.scheduled), 50) || 50;
  const sc = (base - top) / dynamicMax;
  const yAxisLabels = [0, dynamicMax * 0.2, dynamicMax * 0.4, dynamicMax * 0.6, dynamicMax * 0.8, dynamicMax].map(Math.round);

  return (
    <div className="flex flex-col w-full gap-space-xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div className="flex flex-col gap-space-2xs">
          <div className="flex items-center gap-space-xs text-primary font-label-md text-label-md uppercase tracking-wider">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>Operational Analytics</span>
            <span className="text-outline">/</span>
            <span className="text-secondary font-medium">Q3 Reporting Period</span>
          </div>
          <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">Branch Appointment Summary</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Scheduled, completed, and cancelled appointments by branch and day.</p>
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
          <div className="flex flex-col gap-1 min-w-[260px]">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-secondary" htmlFor="date-range">Date Interval</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined text-primary text-[18px] absolute left-3 pointer-events-none">date_range</span>
              <input id="date-range" type="text" readOnly value="Sep 01, 2026 – Sep 07, 2026" className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-subtle font-body-md text-body-md text-on-surface outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer" />
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-[220px]">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-secondary" htmlFor="category-filter">Appointment Category</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined text-secondary text-[18px] absolute left-3 pointer-events-none">category</span>
              <select id="category-filter" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full h-10 pl-9 pr-8 rounded-lg bg-surface-subtle font-body-md text-body-md text-on-surface outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 appearance-none transition-all cursor-pointer">
                <option value="all">All Categories</option>
                <option value="doctor">Doctor Consultation</option>
                <option value="followup">Follow-up</option>
                <option value="walkin">Walk-in</option>
              </select>
              <span className="material-symbols-outlined text-secondary text-[18px] absolute right-3 pointer-events-none">expand_more</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-space-xs self-end lg:self-center">
          <button onClick={handleReset} className="h-10 px-4 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>Reset
          </button>
          <button onClick={handleApply} disabled={isApplying} className="h-10 px-5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-tertiary shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed">
            {isApplying ? <span className="material-symbols-outlined text-[18px] ">hourglass_empty</span> : <span className="material-symbols-outlined text-[18px]">filter_alt</span>}
            {isApplying ? 'Applying...' : 'Apply Filters'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Total Scheduled</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">calendar_today</span></div>
          </div>
          <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{totalScheduled}</div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">event</span></div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Total Completed</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">check_circle</span></div>
          </div>
          <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{totalCompleted}</div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">task_alt</span></div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Total Cancelled</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">cancel</span></div>
          </div>
          <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{totalCancelled}</div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">event_busy</span></div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Walk-in Inflow</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">transfer_within_a_station</span></div>
          </div>
          <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{totalWalkins}</div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">directions_walk</span></div>
        </div>
      </div>

      <div className="bg-surface-card rounded-xl p-space-lg shadow-sm flex flex-col gap-space-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">Daily Volume &amp; Outcomes</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Each bar is the day's scheduled total, split by outcome</p>
          </div>
          <div className="flex items-center gap-space-sm text-label-sm font-label-sm">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-primary"></div><span className="text-on-surface-variant">Completed</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-brand-teal-light"></div><span className="text-on-surface-variant">Pending / Other</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#FB7185]"></div><span className="text-on-surface-variant">Cancelled</span></div>
          </div>
        </div>
        <div className="w-full overflow-x-auto" id="chart-container">
          <svg className="min-w-[560px] w-full h-[280px]" viewBox="0 0 700 250" role="img" aria-label="Stacked bar chart of daily appointments by outcome">
            {yAxisLabels.map((v, idx) => {
              const y = base - (v * sc);
              return (
                <g key={idx}>
                  <line x1="40" x2="700" y1={y} y2={y} stroke={v ? '#E2E8F0' : '#bfc7d2'} strokeDasharray={v ? '3 3' : ''} />
                  <text x="32" y={y + 4} fontSize="11" fill="#707881" textAnchor="end">{v}</text>
                </g>
              );
            })}
            {(data?.daily_data || []).map((d: any, i: number) => {
              const gap = Math.max(90, 600 / Math.max((data?.daily_data || []).length, 1));
              const x = 70 + i * gap;
              const w = 44;
              const oth = Math.max(0, d.scheduled - d.completed - d.cancelled);
              const hc = d.completed * sc;
              const ho = oth * sc;
              const hx = d.cancelled * sc;
              const displayDate = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
              
              return (
                <g key={i}>
                  <rect x={x} y={base - hc} width={w} height={hc} fill="#006194" rx="3" />
                  <rect x={x} y={base - hc - ho} width={w} height={ho} fill="#38BDF8" />
                  <rect x={x} y={base - hc - ho - hx} width={w} height={hx} fill="#FB7185" rx="3" />
                  <text x={x + w / 2} y={base - (d.scheduled * sc) - 8} fontSize="12" fontWeight="700" fill="#0b1c30" textAnchor="middle">{d.scheduled}</text>
                  <text x={x + w / 2} y="222" fontSize="12" fontWeight="600" fill="#565e74" textAnchor="middle">{displayDate}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-lowest">
          <div className="flex items-center gap-space-sm">
            <div className="w-9 h-9 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[22px]">table_chart</span></div>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Daily Breakdown Records</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Appointment lifecycle log for Colombo Central Branch</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleExport('CSV')} className="h-9 px-3 rounded-lg bg-surface-container text-on-surface font-label-sm text-label-sm hover:bg-surface-container-high transition-colors flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">download</span>Export CSV</button>
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
                <th className="px-space-md py-2.5 font-semibold">Branch</th>
                <th className="px-space-md py-2.5 font-semibold">Date</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Scheduled</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Completed</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Cancelled</th>
                <th className="px-space-md py-2.5 font-semibold min-w-[200px]">Completion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-subtle">
              {(data?.daily_data || []).slice().reverse().map((d: any, i: number) => {
                const p = d.scheduled > 0 ? ((d.completed / d.scheduled) * 100).toFixed(1) : "0.0";
                const hi = parseFloat(p) >= 88 ? 'bg-status-completed-text' : 'bg-primary';
                const displayDate = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
                return (
                  <tr key={i} className="hover:bg-surface-subtle/70 transition-colors">
                    <td className="px-space-md py-3.5"><div className="flex items-center gap-1.5 text-on-surface-variant font-body-sm text-body-sm"><span className="material-symbols-outlined text-[16px] text-primary">apartment</span>Colombo Central Branch</div></td>
                    <td className="px-space-md py-3.5 font-mono-data text-mono-data text-on-surface-variant">{displayDate}</td>
                    <td className="px-space-md py-3.5 text-right font-mono-data text-mono-data font-semibold">{d.scheduled}</td>
                    <td className="px-space-md py-3.5 text-right"><span className="px-2 py-0.5 rounded bg-status-completed-bg text-status-completed-text font-mono-data text-mono-data font-semibold">{d.completed}</span></td>
                    <td className="px-space-md py-3.5 text-right font-mono-data text-mono-data text-secondary font-semibold">{d.cancelled}</td>
                    <td className="px-space-md py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="font-label-md text-label-md font-bold text-on-surface w-14">{p}%</span>
                        <div className="flex-1 h-2 rounded-full bg-surface-subtle overflow-hidden">
                          <div className={`h-full ${hi} rounded-full`} style={{ width: `${p}%` }}></div>
                        </div>
                      </div>
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
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md mt-1">Adjust your date interval or category parameters.</p>
            </div>
          )}
          {loading && (
            <div className="py-space-3xl px-space-md flex justify-center text-center text-secondary">
               <span className="material-symbols-outlined text-[32px]">hourglass_empty</span>
            </div>
          )}
        </div>
        <div className="p-space-md bg-surface-subtle flex flex-col sm:flex-row items-center justify-between gap-space-sm">
          <div className="text-body-sm font-body-sm text-secondary">Showing {data?.daily_data?.length || 0} entries</div>
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 rounded flex items-center justify-center text-outline bg-surface-card cursor-not-allowed opacity-50" disabled aria-label="Previous page"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
            <span className="w-8 h-8 rounded flex items-center justify-center font-label-sm text-label-sm bg-primary text-on-primary">1</span>
            <button className="w-8 h-8 rounded flex items-center justify-center text-outline bg-surface-card cursor-not-allowed opacity-50" disabled aria-label="Next page"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
          </div>
        </div>
      </div>
    </div>
  );
}