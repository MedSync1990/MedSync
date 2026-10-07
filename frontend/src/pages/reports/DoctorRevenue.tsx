import { useState, useEffect } from 'react';
import { getDoctorRevenue, exportToCSV } from '../../api/reports';
import type { DoctorRevenueResponse, DoctorRevenueItem, BranchResponse } from '../../api/types';
import { useAuth } from '../../context/AuthContext';
import { listBranches } from '../../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function DoctorRevenueReport() {
  const [data, setData] = useState<DoctorRevenueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
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
  const [specialtyFilter, setSpecialtyFilter] = useState('All Specialties');
  const [searchDoctor, setSearchDoctor] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DoctorRevenueItem | null>(null);

  const fetchReport = () => {
    setLoading(true);
    getDoctorRevenue({
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

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSpecialtyFilter('All Specialties');
    setSearchDoctor('');
    setTimeout(() => {
      setLoading(true);
      getDoctorRevenue({}).then(res => { setData(res); setLoading(false); });
    }, 0);
  };

  const handleOpenModal = (doc: DoctorRevenueItem) => {
    setSelectedDoc(doc);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDoc(null);
  };

  // Filter Data
  const filteredDocs = (data?.data || []).filter((doc) => {
    const sMatch = specialtyFilter === 'All Specialties' || doc.specialty.toLowerCase().includes(specialtyFilter.toLowerCase());
    const qMatch = !searchDoctor || doc.doctor_name.toLowerCase().includes(searchDoctor.toLowerCase());
    return sMatch && qMatch;
  }) || [];
  
  // KPIs
  const totalClinicalRevenue = filteredDocs.reduce((sum: number, d: any) => sum + d.total_revenue, 0) || 0;
  const completedConsults = filteredDocs.reduce((sum: number, d: any) => sum + d.total_appointments, 0) || 0;
  const totalConsultRevenue = filteredDocs.reduce((sum: number, d: any) => sum + d.consult_revenue, 0) || 0;
  const totalProcRevenue = filteredDocs.reduce((sum: number, d: any) => sum + d.procedure_revenue, 0) || 0;
  const avgRevenue = filteredDocs.length ? totalClinicalRevenue / filteredDocs.length : 0;
  
  // Find top earning specialty
  let topSpecialty = 'N/A';
  let maxRev = 0;
  const specMap: Record<string, number> = {};
  filteredDocs.forEach((d: any) => {
    specMap[d.specialty] = (specMap[d.specialty] || 0) + d.total_revenue;
    if (specMap[d.specialty] > maxRev) {
      maxRev = specMap[d.specialty];
      topSpecialty = d.specialty;
    }
  });

  const handleExport = async (type: string) => {
    if (type === 'CSV') {
      exportToCSV(filteredDocs, 'Doctor_Revenue');
    } else if (type === 'PDF') {
      try {
        setIsExporting(true);
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 14;
        const contentWidth = pageWidth - (margin * 2);

        // Data Formatting
        const branchName = selectedBranch ? branches.find(b => b.branch_id === selectedBranch)?.name || 'Colombo Central Branch' : 'Colombo Central Branch';
        const userName = user?.firstName ? `${user.firstName}, ${user.role}` : 'Chaminda, Branch Manager';
        
        let dateInterval = 'All Time';
        if (startDate && endDate) {
            const sD = new Date(startDate);
            const eD = new Date(endDate);
            dateInterval = `${sD.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${eD.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
        }
        const genDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        // ================= PAGE 1 =================
        
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
        doc.text("FINANCIAL OPERATIONS / BRANCH PERFORMANCE", margin, 15);
        
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
        doc.text("Doctor Revenue", margin, 42);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text("Revenue generated per doctor over a date range", margin, 48);

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
        const c3 = margin + colW * 2;
        const c4 = margin + colW * 3;
        const c5 = margin + colW * 4 + 10;

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42); 
        doc.text("REPORTING SCOPE", c1, metaY);
        doc.text("DATE RANGE", c2, metaY);
        doc.text("SPECIALTY", c3, metaY);
        doc.text("PREPARED FOR", c4, metaY);
        doc.text("GENERATED", c5, metaY);
        
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105); 
        doc.setFont('helvetica', 'normal');
        const trunc = (str: string, max: number) => str.length > max ? str.substring(0, max) + '...' : str;
        doc.text(doc.splitTextToSize(branchName, colW - 5), c1, metaY + 4);
        doc.text(doc.splitTextToSize(dateInterval, colW - 5), c2, metaY + 4);
        doc.text(doc.splitTextToSize(specialtyFilter, colW - 5), c3, metaY + 4);
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
            { label: "TOTAL CLINICAL REVENUE", val: `LKR ${(totalClinicalRevenue/1000).toFixed(0)}K` },
            { label: "COMPLETED CONSULTS", val: completedConsults.toString() },
            { label: "TOP EARNING SPECIALTY", val: topSpecialty },
            { label: "AVG REVENUE/DOCTOR", val: `LKR ${(Math.round(avgRevenue)/1000).toFixed(0)}K` }
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
            
            // Dynamic font scaling for long values (like "General Medicine")
            let valFontSize = 18;
            doc.setFontSize(valFontSize);
            doc.setFont('helvetica', 'bold');
            while (doc.getTextWidth(kpi.val) > kpiW - 8 && valFontSize > 8) {
                valFontSize -= 1;
                doc.setFontSize(valFontSize);
            }
            
            doc.setTextColor(15, 23, 42); 
            doc.text(kpi.val, x + 4, kpiY + 18);
        });

        // Summary Paragraph
        const topDoc = [...filteredDocs].sort((a, b) => b.total_revenue - a.total_revenue)[0];
        const consultShare = totalClinicalRevenue > 0 ? ((totalConsultRevenue / totalClinicalRevenue) * 100).toFixed(1) : "0.0";
        const procShare = totalClinicalRevenue > 0 ? ((totalProcRevenue / totalClinicalRevenue) * 100).toFixed(1) : "0.0";
        
        const summaryPara = `In this reporting period, the ${filteredDocs.length} practicing physicians at ${branchName} generated LKR ${totalClinicalRevenue.toLocaleString()} from ${completedConsults} completed appointments. ${topDoc ? `${topDoc.doctor_name} (${topDoc.specialty}) led with LKR ${topDoc.total_revenue.toLocaleString()}` : 'No revenue was recorded'}. Consultation charges made up ${consultShare}% of revenue and procedures & diagnostics ${procShare}%.`;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105); 
        const splitSummary = doc.splitTextToSize(summaryPara, contentWidth);
        doc.text(splitSummary, margin, kpiY + 32);

        // 6. Native JS Chart Section
        let currentY = kpiY + 32 + (splitSummary.length * 5) + 6;
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("Physician Revenue Contribution", margin, currentY);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        
        // Calculate dynamic benchmark
        const maxDocRev = topDoc?.total_revenue || 100000;
        const chartMax = Math.ceil(maxDocRev / 100000) * 100000; // Round up to nearest 100k
        doc.text(`Comparative performance against the branch benchmark (LKR ${chartMax.toLocaleString()} maximum)`, margin, currentY + 5);

        // Chart Legend
        const lgX = margin;
        const lgY = currentY + 12;
        doc.setFillColor(15, 23, 42);
        doc.rect(lgX, lgY, 3, 3, 'F');
        doc.text("Consultations", lgX + 5, lgY + 3);
        
        doc.setFillColor(56, 189, 248);
        doc.rect(lgX + 28, lgY, 3, 3, 'F');
        doc.text("Procedures & Labs", lgX + 33, lgY + 3);

        const barMaxWidth = contentWidth - 75; // Leave room for names and values
        currentY += 24;

        const top6Docs = [...filteredDocs].sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 6);

        top6Docs.forEach((docData, idx) => {
            // Labels
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(`${idx + 1}`, margin, currentY);
            doc.text(trunc(docData.doctor_name, 25), margin + 6, currentY);
            
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text(trunc(docData.specialty, 30), margin + 6, currentY + 4);

            // Bars
            const cW = (docData.consult_revenue / chartMax) * barMaxWidth;
            const pW = (docData.procedure_revenue / chartMax) * barMaxWidth;
            
            doc.setFillColor(15, 23, 42); // Navy
            doc.rect(margin + 50, currentY - 3, cW, 6, 'F');
            doc.setFillColor(56, 189, 248); // Sky
            doc.rect(margin + 50 + cW, currentY - 3, pW, 6, 'F');

            // Values
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(`LKR ${docData.total_revenue.toLocaleString()}`, margin + 55 + cW + pW, currentY);
            
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            const pct = totalClinicalRevenue > 0 ? ((docData.total_revenue / totalClinicalRevenue) * 100).toFixed(1) : "0.0";
            doc.text(`(${pct}%)`, margin + 55 + cW + pW, currentY + 4);

            currentY += 12;
        });

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
        doc.text("| Doctor Revenue", margin + 22, 12);
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("Physician Financial Summary", margin, 32);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`${filteredDocs.length} practicing physicians documented for this period`, margin, 37);

        // 8. Formatted Data Table 
        const tableColumn = ["#", "DOCTOR", "SPECIALTY", "APPTS", "CONSULTATION", "PROCEDURES", "TOTAL REVENUE", "SHARE"];
        const tableRows = filteredDocs.map((d: any, i: number) => {
            const share = totalClinicalRevenue > 0 ? ((d.total_revenue / totalClinicalRevenue) * 100).toFixed(1) + '%' : "0.0%";
            return [
              (i + 1).toString(), 
              d.doctor_name, 
              d.specialty, 
              d.total_appointments.toString(), 
              d.consult_revenue.toLocaleString(), 
              d.procedure_revenue.toLocaleString(), 
              d.total_revenue.toLocaleString(), 
              share
            ];
        });
        
        // Total Row
        tableRows.push([
            `Total (${filteredDocs.length} physicians)`, "", "", completedConsults.toString(), totalConsultRevenue.toLocaleString(), totalProcRevenue.toLocaleString(), totalClinicalRevenue.toLocaleString(), "100.0%"
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 42,
            theme: 'plain', 
            styles: { fontSize: 8, textColor: [71, 85, 105], cellPadding: { top: 5, right: 3, bottom: 5, left: 3 } },
            headStyles: { textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7 },
            columnStyles: {
                0: { cellWidth: 8 },
                3: { halign: 'right' },
                4: { halign: 'right' },
                5: { halign: 'right' },
                6: { halign: 'right' },
                7: { halign: 'right' }
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

        // Table Footer Caption
        const finalY = (doc as any).lastAutoTable.finalY || 150;
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');
        doc.text(`Showing ${tableRows.length > 1 ? tableRows.length - 1 : 0} active branch doctors. Average revenue per doctor = total clinical revenue / ${tableRows.length > 1 ? tableRows.length - 1 : 1} physicians. All amounts in LKR.`, margin, finalY + 5);

        // 9. Key Observations Section
        const obsY = finalY + 20;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("Key Observations", margin, obsY);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text("Derived from the physician figures above", margin, obsY + 5);

        const obsW = (contentWidth - 10) / 3;
        
        // Dynamic Observation Calculations
        const highestVolDoc = [...filteredDocs].sort((a, b) => b.total_appointments - a.total_appointments)[0];
        const highestProcDoc = [...filteredDocs].sort((a, b) => (b.procedure_revenue/b.total_revenue || 0) - (a.procedure_revenue/a.total_revenue || 0))[0];
        
        const topDocShare = totalClinicalRevenue > 0 && topDoc ? ((topDoc.total_revenue/totalClinicalRevenue)*100).toFixed(1) : "0.0";
        const topDocRevPerAppt = topDoc && topDoc.total_appointments > 0 ? (topDoc.total_revenue / topDoc.total_appointments).toFixed(0) : 0;
        
        const volDocRevPerAppt = highestVolDoc && highestVolDoc.total_appointments > 0 ? (highestVolDoc.total_revenue / highestVolDoc.total_appointments).toFixed(0) : 0;
        
        const procDocShare = highestProcDoc && highestProcDoc.total_revenue > 0 ? ((highestProcDoc.procedure_revenue / highestProcDoc.total_revenue)*100).toFixed(1) : "0.0";

        const observations = [
            {
                title: "Top Contributor",
                desc: `${topDoc?.doctor_name || 'N/A'} generated LKR ${topDoc?.total_revenue?.toLocaleString() || 0}, ${topDocShare}% of branch revenue, from ${topDoc?.total_appointments || 0} completed appointments.`,
                metric: `LKR ${Number(topDocRevPerAppt).toLocaleString()} per appt`
            },
            {
                title: "Highest Volume",
                desc: `${highestVolDoc?.doctor_name || 'N/A'} completed the most appointments (${highestVolDoc?.total_appointments || 0}) across the reporting period.`,
                metric: `LKR ${Number(volDocRevPerAppt).toLocaleString()} per appt`
            },
            {
                title: "Procedure Mix",
                desc: `${highestProcDoc?.doctor_name || 'N/A'} earns the largest share from procedures (${procDocShare}% of their revenue); branch-wide, procedures are ${procShare}%.`,
                metric: `LKR ${highestProcDoc?.procedure_revenue?.toLocaleString() || 0} procedures`
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

        doc.save(`MedSync_Doctor_Revenue.pdf`);
      } catch (err) {
        console.error("PDF generation failed:", err);
      } finally {
        setIsExporting(false);
      }
    }
  };

  const hasData = filteredDocs.length > 0;
  
  // Helper to format currency
  const fmt = (v: number) => `LKR ${(Number(v) || 0).toLocaleString('en-US')}`;

  return (
    <div className="flex flex-col w-full py-space-xl max-w-content-max-width mx-auto gap-space-xl">
      {/* Locked Context & Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div className="flex flex-col gap-space-2xs">
          <div className="flex items-center gap-space-xs text-primary font-label-md text-label-md uppercase tracking-wider">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>Financial Operations</span>
            <span className="text-outline">/</span>
            <span className="text-secondary font-medium">Branch Performance</span>
          </div>
          <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">Doctor Revenue</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Revenue generated per doctor over a date range.</p>
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

      {/* Operational Filter Toolbar */}
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
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-secondary" htmlFor="specialty-filter">Specialty</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined text-secondary text-[18px] absolute left-3 pointer-events-none">medical_services</span>
              <select value={specialtyFilter} onChange={e => setSpecialtyFilter(e.target.value)} className="w-full h-10 pl-9 pr-8 rounded-lg bg-surface-subtle font-body-md text-body-md text-on-surface outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 appearance-none transition-all cursor-pointer" id="specialty-filter">
                <option value="All Specialties">All Specialties</option>
                <option value="Cardiology">Cardiology</option>
                <option value="General OPD">General OPD</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Orthopedics">Orthopedics</option>
                <option value="Dermatology">Dermatology</option>
                <option value="ENT">ENT</option>
              </select>
              <span className="material-symbols-outlined text-secondary text-[18px] absolute right-3 pointer-events-none">expand_more</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-[220px]">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-secondary" htmlFor="search-doctor-input">Search Physician</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined text-secondary text-[18px] absolute left-3 pointer-events-none">search</span>
              <input value={searchDoctor} onChange={e => setSearchDoctor(e.target.value)} className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-subtle font-body-md text-body-md text-on-surface outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 transition-all" id="search-doctor-input" placeholder="Filter by doctor name..." type="text"/>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-space-xs self-end lg:self-center">
          <button onClick={handleResetFilters} className="h-10 px-4 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center gap-1.5" id="reset-filters-btn">
            <span className="material-symbols-outlined text-[18px]">restart_alt</span> Reset
          </button>
          <button onClick={fetchReport} disabled={loading} className="h-10 px-5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-tertiary shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed" id="apply-filters-btn">
            {loading ? (
              <span className="material-symbols-outlined text-[18px] ">hourglass_empty</span>
            ) : (
              <span className="material-symbols-outlined text-[18px]">filter_alt</span>
            )}
            {loading ? 'Applying...' : 'Apply Filters'}
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Total Clinical Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </div>
          </div>
          <div><div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{fmt(totalClinicalRevenue)}</div></div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">payments</span></div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Completed Consults</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">event_available</span>
            </div>
          </div>
          <div><div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{completedConsults}</div></div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">calendar_today</span></div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Top Earning Specialty</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">cardiology</span>
            </div>
          </div>
          <div><div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{topSpecialty}</div></div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">ecg_heart</span></div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Avg Revenue / Doctor</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">groups</span>
            </div>
          </div>
          <div><div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{fmt(avgRevenue)}</div></div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">stacked_bar_chart</span></div>
        </div>
      </div>

      {/* Visual Bar Comparison Section */}
      <div className="bg-surface-card rounded-xl p-space-lg shadow-sm flex flex-col gap-space-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">Physician Revenue Contribution</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Comparative performance against branch target (LKR 500,000 max benchmark)</p>
          </div>
          <div className="flex items-center gap-space-sm text-label-sm font-label-sm">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-primary"></div><span className="text-on-surface-variant">Consultations</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-brand-teal-light"></div><span className="text-on-surface-variant">Procedures &amp; Labs</span></div>
          </div>
        </div>
        <div className="flex flex-col gap-space-md">
          {filteredDocs.length === 0 && !loading && <div className="text-center text-secondary py-4">No data available</div>}
          {filteredDocs.map((doc: any, i: number) => {
            const consultRev = doc.consult_revenue || 0;
            const procRev = doc.procedure_revenue || 0;
            const maxBenchmark = 500000;
            const consultPct = (consultRev / maxBenchmark) * 100;
            const procPct = (procRev / maxBenchmark) * 100;
            const overallPct = ((doc.total_revenue / totalClinicalRevenue) * 100) || 0;
            return (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-body-sm font-body-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold ${i === 0 ? 'bg-surface-container-high text-primary' : 'bg-surface-container text-secondary'}`}>{i + 1}</span>
                    <span className="font-label-lg text-label-lg text-on-surface font-semibold">{doc.doctor_name}</span>
                    <span className="text-secondary">· {doc.specialty}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-data text-mono-data font-semibold text-on-surface">{fmt(doc.total_revenue)}</span>
                    <span className={`text-label-sm font-label-sm ${i === 0 ? 'text-status-completed-text font-bold' : 'text-secondary'}`}>({overallPct.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="h-3 w-full bg-surface-subtle rounded-full overflow-hidden flex">
                  <div className="bg-primary h-full rounded-l-full transition-all duration-500" style={{ width: `${Math.min(consultPct, 100)}%` }}></div>
                  <div className="bg-brand-teal-light h-full rounded-r-full transition-all duration-500" style={{ width: `${Math.min(procPct, 100 - consultPct)}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Doctor Revenue Table */}
      <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-lowest">
          <div className="flex items-center gap-space-sm">
            <div className="w-9 h-9 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">table_chart</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Physician Financial Summary</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{filteredDocs.length || 0} practicing physicians documented for this period</p>
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
                <th className="px-space-md py-2.5 font-semibold">Doctor</th>
                <th className="px-space-md py-2.5 font-semibold">Specialty</th>
                <th className="px-space-md py-2.5 font-semibold">Branch</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Appointments Completed</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Revenue (LKR)</th>
                <th className="px-space-md py-2.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-subtle font-body-md text-body-md text-on-surface">
              {filteredDocs.map((doc: any, i: number) => {
                const initials = doc.doctor_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2);
                return (
                  <tr key={i} className="hover:bg-surface-subtle/70 transition-colors">
                    <td className="px-space-md py-3.5">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[14px]">{initials}</div>
                        <div>
                          <div className="font-label-lg text-label-lg font-semibold text-on-surface">{doc.doctor_name}</div>
                          <div className="font-body-sm text-body-sm text-secondary">ID: {doc.doctor_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-space-md py-3.5">
                      <span className="px-2.5 py-1 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm font-semibold">{doc.specialty}</span>
                    </td>
                    <td className="px-space-md py-3.5">
                      <div className="flex items-center gap-1.5 text-on-surface-variant font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-[16px] text-primary">apartment</span>
                        <span>{doc.branch_name}</span>
                      </div>
                    </td>
                    <td className="px-space-md py-3.5 text-right font-mono-data text-mono-data">
                      <span className="px-2 py-0.5 rounded bg-status-scheduled-bg text-status-scheduled-text font-semibold">{doc.total_appointments}</span>
                    </td>
                    <td className="px-space-md py-3.5 text-right font-mono-data text-mono-data font-bold text-on-surface">
                      {fmt(doc.total_revenue)}
                    </td>
                    <td className="px-space-md py-3.5 text-center">
                      <button onClick={() => handleOpenModal(doc)} className="px-3 py-1.5 rounded-lg bg-surface-container text-primary font-label-sm text-label-sm hover:bg-primary hover:text-on-primary transition-all flex items-center gap-1 mx-auto">
                        <span className="material-symbols-outlined text-[16px]">visibility</span> View Breakdown
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {!hasData && !loading && (
            <div className="py-space-3xl px-space-md flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center text-secondary mb-space-sm">
                <span className="material-symbols-outlined text-[32px]">folder_off</span>
              </div>
              <h4 className="font-headline-sm text-headline-sm text-on-surface">No data available for the selected criteria.</h4>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md mt-1">
                Try expanding your date range, resetting specialty filters, or searching for another physician name.
              </p>
              <button onClick={handleResetFilters} className="mt-space-md px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-tertiary transition-colors">
                Clear Filters
              </button>
            </div>
          )}
          {loading && (
            <div className="py-space-3xl px-space-md flex justify-center text-center text-secondary">
               <span className="material-symbols-outlined  text-[32px]">hourglass_empty</span>
            </div>
          )}
        </div>
        
        <div className="p-space-md bg-surface-subtle flex flex-col sm:flex-row items-center justify-between gap-space-sm">
          <div className="text-body-sm font-body-sm text-secondary">
            Showing {filteredDocs.length} of {(data?.data || []).length || 0} active branch doctors · Period locked: Sep 01 – Sep 30, 2026
          </div>
          <div className="flex items-center gap-space-lg">
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Total Appts:</span>
              <span className="font-mono-data text-mono-data font-bold text-on-surface">{completedConsults}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Aggregate:</span>
              <span className="font-headline-sm text-headline-sm font-bold text-primary">{fmt(totalClinicalRevenue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Drawer / Modal Backdrop */}
      {isModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-[100] bg-brand-navy-deep/40 backdrop-blur-sm flex items-center justify-center p-space-md" onClick={handleCloseModal}>
          <div className="bg-surface-card rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col transform transition-transform" onClick={e => e.stopPropagation()}>
            <div className="p-space-lg bg-surface-container-low flex items-start justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[26px]">analytics</span>
                </div>
                <div>
                  <div className="font-headline-sm text-headline-sm text-on-surface">{selectedDoc.doctor_name}</div>
                  <div className="font-body-sm text-body-sm text-primary font-medium">{selectedDoc.specialty}</div>
                </div>
              </div>
              <button onClick={handleCloseModal} className="w-8 h-8 rounded-lg bg-surface-card text-secondary hover:text-on-surface flex items-center justify-center transition-colors shadow-sm">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-space-lg flex flex-col gap-space-md">
              <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm bg-surface-subtle px-3 py-2 rounded-lg inline-flex self-start">
                <span className="material-symbols-outlined text-[16px] text-secondary">apartment</span>
                <span>{selectedDoc.branch_name}</span>
              </div>
              <div className="grid grid-cols-2 gap-space-sm">
                <div className="p-space-sm rounded-lg bg-surface-subtle flex flex-col">
                  <span className="font-label-sm text-label-sm uppercase text-secondary">Completed Sessions</span>
                  <span className="font-headline-md text-headline-md font-bold text-on-surface">{selectedDoc.total_appointments}</span>
                </div>
                <div className="p-space-sm rounded-lg bg-surface-subtle flex flex-col">
                  <span className="font-label-sm text-label-sm uppercase text-secondary">Gross Revenue</span>
                  <span className="font-headline-md text-headline-md font-bold text-primary">{fmt(selectedDoc.total_revenue)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-space-xs mt-space-2xs">
                <div className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Service Breakdown</div>
                <div className="p-space-sm rounded-xl bg-surface-subtle flex items-center justify-between">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">stethoscope</span>
                    </div>
                    <div>
                      <div className="font-label-md text-label-md text-on-surface">Consultation Charges</div>
                      <div className="font-body-sm text-body-sm text-secondary">Regular clinic visit fees</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono-data text-mono-data font-bold text-on-surface">{fmt(selectedDoc.consult_revenue || 0)}</div>
                    <div className="font-label-sm text-label-sm text-secondary">{(((selectedDoc.consult_revenue || 0) / selectedDoc.total_revenue) * 100 || 0).toFixed(1)}%</div>
                  </div>
                </div>
                <div className="p-space-sm rounded-xl bg-surface-subtle flex items-center justify-between">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-8 h-8 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">biotech</span>
                    </div>
                    <div>
                      <div className="font-label-md text-label-md text-on-surface">Procedures &amp; Diagnostics</div>
                      <div className="font-body-sm text-body-sm text-secondary">In-clinic testing &amp; minor surgery</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono-data text-mono-data font-bold text-on-surface">{fmt(selectedDoc.procedure_revenue || 0)}</div>
                    <div className="font-label-sm text-label-sm text-secondary">{(((selectedDoc.procedure_revenue || 0) / selectedDoc.total_revenue) * 100 || 0).toFixed(1)}%</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 mt-space-2xs">
                <div className="flex justify-between text-label-sm font-label-sm text-secondary">
                  <span>Consultations Split</span>
                  <span>Procedures Split</span>
                </div>
                <div className="h-2.5 w-full bg-surface-subtle rounded-full overflow-hidden flex">
                  <div className="bg-primary h-full rounded-l-full" style={{ width: `${(selectedDoc.consult_revenue / selectedDoc.total_revenue) * 100 || 0}%` }}></div>
                  <div className="bg-brand-teal-light h-full rounded-r-full" style={{ width: `${(selectedDoc.procedure_revenue / selectedDoc.total_revenue) * 100 || 0}%` }}></div>
                </div>
              </div>
            </div>
            <div className="p-space-md bg-surface-container-low flex justify-end gap-space-sm">
              <button onClick={handleCloseModal} className="h-10 px-5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-tertiary transition-colors">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}