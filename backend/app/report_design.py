"""Presentation only: report figures come from the existing scoped report queries."""
from datetime import date, datetime
from html import escape
from math import ceil
from typing import Any
from markupsafe import Markup

BLUE = "#006b9c"
SKY = "#32bdf4"
RED = "#fb7185"


def money(value: float) -> str:
    return f"{value:,.0f}"


def percentage(part: float, whole: float) -> float:
    return part / whole * 100 if whole else 0


def short_date(value: Any) -> str:
    if isinstance(value, (date, datetime)):
        return value.strftime("%b %d, %Y")
    return str(value) if value is not None else "-"


def stacked_chart(groups: list, labels: list[str], colors: list[str], currency: bool = False) -> Markup:
    # Each batch is bounded so a long period stays legible on additional pages.
    width, height, left, top, bottom = 700, 275, 48, 28, 236
    peak = max((sum(values) for label, values in groups), default=0)
    step = 10 ** max(0, len(str(int(peak or 1))) - 2)
    limit = max(step, ceil(peak / step) * step)
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}">']
    def text(x, y, value, color="#64748b", size=10, anchor="middle", weight="normal"):
        parts.append(f'<text x="{x}" y="{y}" font-family="sans-serif" font-size="{size}" text-anchor="{anchor}" fill="{color}" font-weight="{weight}">{escape(str(value))}</text>')
    for i in range(6):
        y = bottom - (bottom - top) * i / 5
        parts.append(f'<line x1="{left}" y1="{y}" x2="690" y2="{y}" stroke="#d8e2ef" stroke-dasharray="3 3"/>')
        tick = limit * i / 5
        text(left - 8, y + 3, f"{tick/1000:.0f}K" if currency and tick else f"{tick:.0f}", anchor="end")
    if not groups:
        text(350, 125, "No data available for the selected criteria.", size=13)
    for i, (label, values) in enumerate(groups):
        cell = (width - left - 15) / max(len(groups), 1)
        bar_width = min(50, cell * .56)
        x, y = left + cell * (i + .5) - bar_width / 2, bottom
        for value, color in zip(values, colors):
            h = max(0, value) / limit * (bottom - top)
            y -= h
            parts.append(f'<rect x="{x}" y="{y}" width="{bar_width}" height="{h}" fill="{color}"/>')
            if h > 17:
                text(x + bar_width/2, y + h/2 + 3, f"{value/1000:.0f}K" if currency else f"{value:.0f}", "white" if color == BLUE else "#0f172a", 9, weight="bold")
        label_top = f"{percentage(values[0], sum(values)):.1f}%" if currency else f"{sum(values):,.0f}"
        text(x + bar_width/2, y - 8, label_top, BLUE, 11, weight="bold")
        text(x + bar_width/2, bottom + 19, label, "#52617a", 10, weight="bold")
    parts.append('</svg>')
    return Markup(''.join(parts))


def block(title: str, subtitle: str = "", **kwargs: Any) -> dict:
    return dict(title=title, subtitle=subtitle, **kwargs)


def table(title: str, subtitle: str, headers: list, rows: list, totals: list | None = None, note: str = "") -> dict:
    return block(title, subtitle, kind="table", headers=headers, rows=rows, totals=totals, note=note)


def bars(title: str, subtitle: str, rows: list, legend: list | None = None) -> dict:
    return block(title, subtitle, kind="bars", bars=rows, legend=legend or [])


def charts(title: str, subtitle: str, groups: list, labels: list, colors: list, currency: bool = False) -> list:
    chunks = [groups[i:i+10] for i in range(0, len(groups), 10)] or [[]]
    return [block(title + (f" (continued {i+1})" if i else ""), subtitle,
                  kind="chart", chart=stacked_chart(chunk, labels, colors, currency),
                  legend=list(zip(labels, colors))) for i, chunk in enumerate(chunks)]


def build_design(title: str, sections: list, filters: list[str], branch_name: str) -> dict:
    data = dict(title=title, eyebrow="FINANCIAL OPERATIONS / BRANCH PERFORMANCE", subtitle="", kpis=[], summary="", overview=[], details=[], observations=[], filter_label="FILTER", filter_value="All", period=filters[0].removeprefix("Period: "), single_page=False)
    if title == "Branch Appointments":
        data.update(title="Branch Appointment Summary", eyebrow="OPERATIONAL ANALYTICS / APPOINTMENTS", subtitle="Scheduled, completed and cancelled appointments by branch and day", filter_label="CATEGORY", filter_value=filters[1].split(": ",1)[-1])
        scheduled, completed, cancelled, walkins = sections[0]['rows'][0]
        records = sorted(sections[1]['rows'], key=lambda r:r[0])
        count = scheduled + completed + cancelled
        data['kpis'] = [("TOTAL SCHEDULED", money(scheduled)),("TOTAL COMPLETED", money(completed)),("TOTAL CANCELLED", money(cancelled)),("WALK-IN INFLOW", money(walkins))]
        data['summary'] = f"{branch_name} has {count:,} appointments in the selected reporting scope: {scheduled:,} currently scheduled, {completed:,} completed and {cancelled:,} cancelled. Walk-in inflow is {walkins:,}."
        data['overview'] = charts("Daily Volume & Outcomes", "Daily appointment totals, split by current status", [(r[0].strftime('%b %d'), [r[2],r[1],r[3]]) for r in records], ["Completed","Scheduled","Cancelled"], [BLUE,SKY,RED])
        rows=[[branch_name,short_date(r[0]),money(r[1]),money(r[2]),money(r[3]),f"{percentage(r[2],sum(r[1:])):.1f}%"] for r in reversed(records)]
        data['details']=[table("Daily Breakdown Records", "Appointment lifecycle log (newest first)",["Branch","Date","Scheduled","Completed","Cancelled","Completion rate"],rows,[f"Total ({len(rows)} days)","",money(scheduled),money(completed),money(cancelled),f"{percentage(completed,count):.1f}%"],"Scheduled is the current Scheduled status. Completion rate = completed / all recorded appointment statuses; completed and cancelled are separate counts.")]
        if records:
            peak=max(records,key=lambda r:sum(r[1:]))
            data['observations']=[("Peak Day",f"{short_date(peak[0])} recorded {sum(peak[1:]):,} appointments.",f"{peak[2]:,} completed"),("Cancellations",f"{cancelled:,} appointments were cancelled in this reporting scope.",f"{percentage(cancelled,count):.1f}% of appointments"),("Daily Average",f"An average of {count/len(records):.1f} appointments were recorded per reporting day.",f"{completed/len(records):.1f} completed per day")]
    elif title == "Doctor Revenue":
        data.update(subtitle="Revenue generated per doctor over a date range",filter_label="SPECIALTY",filter_value=filters[1].split(": ",1)[-1])
        records=sorted(sections[0]['rows'],key=lambda r:r[6],reverse=True)
        total=sum(r[6] for r in records);consult=sum(r[4] for r in records);procedures=sum(r[5] for r in records);appts=sum(r[3] for r in records)
        specialties={}
        for r in records: specialties[r[1]]=specialties.get(r[1],0)+r[6]
        top=max(specialties,key=specialties.get) if specialties else "N/A"
        data['kpis']=[("TOTAL CLINICAL REVENUE",f"LKR {money(total)}"),("COMPLETED CONSULTS",money(appts)),("TOP EARNING SPECIALTY",top),("AVG REVENUE / DOCTOR",f"LKR {money(total/len(records) if records else 0)}")]
        data['summary']=f"The {len(records)} physicians in the selected scope generated LKR {money(total)} from {appts:,} completed appointments. Consultation charges represent {percentage(consult,total):.1f}% of revenue and procedures and diagnostics {percentage(procedures,total):.1f}%."
        benchmark=max((r[6] for r in records),default=1) or 1
        revenue_bars=[dict(name=r[0],description=r[1],value=f"LKR {money(r[6])}",share=f"{percentage(r[6],total):.1f}%",segments=[(percentage(r[4],benchmark),BLUE),(percentage(r[5],benchmark),SKY)]) for r in records]
        for i in range(0,len(revenue_bars),8): data['overview'].append(bars("Physician Revenue Contribution"+(" (continued)" if i else ""),f"Comparative performance; maximum LKR {money(benchmark)}",revenue_bars[i:i+8],[("Consultations",BLUE),("Procedures & Labs",SKY)]))
        data['overview'].append(bars("Service Revenue Mix","Branch-wide split of revenue by service type",[dict(name="Consultation Charges",value=f"LKR {money(consult)}",share=f"{percentage(consult,total):.1f}%",segments=[(percentage(consult,total),BLUE)]),dict(name="Procedures & Diagnostics",value=f"LKR {money(procedures)}",share=f"{percentage(procedures,total):.1f}%",segments=[(percentage(procedures,total),SKY)])]))
        rows=[[str(i+1),r[0],r[1],money(r[3]),money(r[4]),money(r[5]),money(r[6]),f"{percentage(r[6],total):.1f}%"] for i,r in enumerate(records)]
        data['details']=[table("Physician Financial Summary",f"{len(records)} physicians documented for this period",["#","Doctor","Specialty","Appts","Consultation","Procedures","Total revenue","Share"],rows,["Total","","",money(appts),money(consult),money(procedures),money(total),"100.0%" if total else "0.0%"],"All amounts in LKR. Only physicians matching the selected filters are included.")]
        per_appt=sorted([(r,r[6]/r[3] if r[3] else 0) for r in records],key=lambda pair:pair[1],reverse=True);max_avg=max((v for r,v in per_appt),default=1) or 1
        avg_bars=[dict(name=r[0],value=f"LKR {money(v)}",segments=[(percentage(v,max_avg),BLUE if i==0 else SKY)]) for i,(r,v) in enumerate(per_appt)]
        for i in range(0,len(avg_bars),8): data['details'].append(bars("Revenue per Completed Appointment"+(" (continued)" if i else ""),"Total revenue divided by completed appointments, ranked",avg_bars[i:i+8]))
        if records:
            lead=records[0];volume=max(records,key=lambda r:r[3]);mix=max(records,key=lambda r:percentage(r[5],r[6]))
            data['observations']=[("Top Contributor",f"{lead[0]} generated LKR {money(lead[6])} from {lead[3]} appointments.",f"{percentage(lead[6],total):.1f}% of revenue"),("Highest Volume",f"{volume[0]} completed {volume[3]} appointments.",f"LKR {money(volume[6]/volume[3] if volume[3] else 0)} per appointment"),("Procedure Mix",f"{mix[0]} has the largest procedure share ({percentage(mix[5],mix[6]):.1f}%).",f"LKR {money(mix[5])} procedures")]
    elif title == "Outstanding Balances":
        data.update(eyebrow="FINANCIAL OPERATIONS / COLLECTIONS",subtitle="Unpaid and partially paid invoices - collection risk and recovery status",single_page=True,filter_label="PATIENT SEARCH",filter_value=filters[1].split(": ",1)[-1],period=filters[0].replace('Aging: all','All Overdue').removeprefix('Aging: '))
        records=sections[0]['rows'];total=sum(r[4] for r in records);partial=sum(r[6]=='Partially Paid' for r in records);unpaid=sum(r[6]=='Unpaid' for r in records)
        data['kpis']=[("TOTAL OUTSTANDING",f"LKR {money(total)}"),("OVERDUE INVOICES",str(len(records))),("PARTIALLY PAID",str(partial)),("FULLY UNPAID",str(unpaid))]
        data['summary']=f"{branch_name} has {len(records)} unpaid or partially paid invoices in the selected scope, with LKR {money(total)} outstanding: {partial} partially paid and {unpaid} fully unpaid. All matching invoices are included in this export."
        status=bars("Collection Status",f"All {len(records)} matching invoices",[dict(name="Partially Paid",value=f"{partial} invoices",share=f"{percentage(partial,len(records)):.1f}%",segments=[(percentage(partial,len(records)),"#b45309")]),dict(name="Fully Unpaid",value=f"{unpaid} invoices",share=f"{percentage(unpaid,len(records)):.1f}%",segments=[(percentage(unpaid,len(records)),"#be123c")])])
        age=[]
        for label,color,condition in [("0-30 days",SKY,lambda d:d<=30),("31-60 days","#b45309",lambda d:30<d<=60),("60+ days","#be123c",lambda d:d>60)]:
            selected=[r for r in records if condition(r[5])];amount=sum(r[4] for r in selected)
            age.append(dict(name=label,description=f"{len(selected)} invoices",value=f"LKR {money(amount)}",segments=[(percentage(amount,total),color)]))
        data['overview']=[block("Collection Breakdown","Status and aging of the invoices included below",kind="columns",children=[status,bars("Aging of Listed Invoices",f"Outstanding balance of {len(records)} invoices",age)])]
        rows=[[r[1]+f"\nPT-{r[7]:06d}",r[0],money(r[2]),money(r[3]),money(r[4]),short_date(r[8]),r[6],"0-30d" if r[5]<=30 else "31-60d" if r[5]<=60 else "60+d"] for r in records]
        data['details']=[table("Invoice Ledger",f"All {len(records)} invoices matching the selected criteria",["Patient","Invoice #","Total","Paid","Outstanding","Last payment","Status","Aging"],rows,["Total","",money(sum(r[2] for r in records)),money(sum(r[3] for r in records)),money(total),"","",""],"Amounts in LKR. Additional ledger pages are included automatically when required.")]
    else:
        data.update(title="Insurance vs. Out-of-Pocket",subtitle="Coverage split between insurance and patient payments over a period",filter_label="INSURANCE PROVIDER",filter_value=filters[1].split(": ",1)[-1])
        records=sorted(sections[0]['rows'],key=lambda r:datetime.strptime(r[0],'%b %Y'))
        ins=sum(r[1] for r in records);oop=sum(r[2] for r in records);total=sum(r[3] for r in records);volume=sum(r[4] for r in records)
        providers=sections[1]['rows'];slas=sections[2]['rows'];modes=sections[3]['rows'];avg=sections[2].get('average')
        data['kpis']=[("INSURANCE COVERAGE",f"{percentage(ins,total):.1f}%"),("OUT-OF-POCKET RATIO",f"{percentage(oop,total):.1f}%"),("TOTAL GROSS BILLED",f"LKR {money(total)}"),("AVG CLAIM SETTLEMENT",f"{avg:.1f} days" if avg is not None else "N/A")]
        data['summary']=f"Across the selected periods, {branch_name} invoiced LKR {money(total)} over {volume:,} invoices. Insurers covered LKR {money(ins)} ({percentage(ins,total):.1f}%) and the patient out-of-pocket amount was LKR {money(oop)} ({percentage(oop,total):.1f}%). Provider selection applies to the provider and settlement panels; the monthly ledger represents the full branch scope."
        data['overview']=charts("Monthly Settlement Progression", "Insurance vs. out-of-pocket amounts; percentages above bars show insurance coverage",[(r[0],[r[1],r[2]]) for r in records],["Insurance","Out-of-Pocket"],[BLUE,SKY],True)
        provider_rows=[dict(name=r[0],value=f"LKR {money(r[1])}",share=f"{r[2]:.1f}%",segments=[(min(100,max(0,r[2])),BLUE if i<2 else SKY)]) for i,r in enumerate(providers)]
        data['overview'].append(bars("Top Provider Split","Claims by contracted insurer",provider_rows))
        rows=[[r[0],money(r[1]),money(r[2]),money(r[3]),f"{percentage(r[1],r[3]):.1f}%",money(r[4])] for r in reversed(records)]
        data['details']=[table("Monthly Settlement Ledger","Billing amounts per monthly cycle (newest first)",["Billing period","Insurance (LKR)","Out-of-pocket (LKR)","Total invoiced","% Covered","Volume"],rows,[f"Total ({len(records)} months)",money(ins),money(oop),money(total),f"{percentage(ins,total):.1f}%",money(volume)],"% Covered = insurance / total invoiced. All amounts in LKR.")]
        data['details'].append(table("Insurer Claim Turnaround","Average settlement time by insurer",["Provider","Average settlement"],[[r[0],f"{r[1]:.1f} days"] for r in slas],note="Settlement times are derived from recorded claims; no assumed SLA or policy is applied."))
        data['details'].append(block("Out-of-Pocket Payment Modes","Share of recorded patient payments by mode",kind="cards",cards=[(r[0],f"{r[2]:.1f}%",f"LKR {money(r[1])}") for r in modes]))
    if not data['single_page']:
        try:
            start, end = data['period'].split(' to ')
            data['period'] = f"{date.fromisoformat(start).strftime('%d %b %Y')} - {date.fromisoformat(end).strftime('%d %b %Y')}"
        except ValueError:
            pass
    if data['filter_value'] in ('All', 'all'):
        data['filter_value'] = {'CATEGORY': 'All Categories', 'SPECIALTY': 'All Specialties', 'INSURANCE PROVIDER': 'All Providers', 'PATIENT SEARCH': 'None applied'}.get(data['filter_label'], 'All')
    data['extra_filters']=[value for value in filters[2:] if not value.endswith(': All')]

    return data
