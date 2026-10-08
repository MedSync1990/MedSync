import asyncio
from datetime import date
from pathlib import Path
from app.routers import reports
from app.dependencies import CurrentUser
from app.schemas.reports import AppointmentsSummaryResponse, AppointmentDailySummaryItem, DoctorRevenueResponse, DoctorRevenueItem, OutstandingBalancesResponse, OutstandingBalanceItem, InsuranceVsOutOfPocketResponse, MonthlyLedgerItem, ProviderSplitItem, ClaimSlaItem, PaymentModeItem

class Connection:
    async def fetchval(self, query, *args): return "Colombo Central Branch"
    async def fetchrow(self, query, *args): return {"first_name": "Preview", "last_name": "Manager"}

async def appointments(*args):
    return AppointmentsSummaryResponse(daily_data=[AppointmentDailySummaryItem(date=date(2026,9,i+1),scheduled=s,completed=c,cancelled=x) for i,(s,c,x) in enumerate([(4,24,2),(5,31,3),(2,41,2),(3,35,3),(4,30,1),(4,32,2),(3,36,3)])],total_scheduled=25,total_completed=229,total_cancelled=16,total_walkins=32)
async def doctors(*args):
    names=[("Dr. K. Bandara","Cardiology",64,310000,175000),("Dr. Sarah Jayasinghe","General Physician",82,260000,68000),("Dr. Priyantha Alwis","Pediatrician",58,220000,70000),("Dr. Nimal Fonseka","Orthopedic Surgeon",45,160000,115000),("Dr. Anoma Silva","Dermatologist",52,175000,70000),("Dr. Ruwan Perera","ENT Specialist",41,150000,72000)]
    return DoctorRevenueResponse(data=[DoctorRevenueItem(doctor_id=i,doctor_name=n,specialty=s,branch_name="Colombo Central Branch",total_appointments=a,consult_revenue=c,procedure_revenue=p,total_revenue=c+p) for i,(n,s,a,c,p) in enumerate(names,1)],total=6)
async def balances(*args):
    rows=[("Sarath Jayasinghe",24000,9000,45),("Kumari Perera",18500,0,65),("Malini De Silva",32000,12000,25),("Dinesh Fernando",15000,5000,20),("Anula Wickramasinghe",45000,0,35)]
    return OutstandingBalancesResponse(data=[OutstandingBalanceItem(invoice_id=f"INV-2026-{864+i:04d}",patient_id=1882+i,patient_name=n,contact_number="",total_amount=t,paid_amount=p,due_amount=t-p,last_payment_date=date(2026,8,30) if p else None,aging_days=d,status="Partially Paid" if p else "Unpaid") for i,(n,t,p,d) in enumerate(rows)],total=5)
async def insurance(*args):
    rows=[("Apr 2026",600000,350000,91),("May 2026",595000,355000,89),("Jun 2026",610000,345000,92),("Jul 2026",640000,350000,98),("Aug 2026",685000,365000,114),("Sep 2026",720000,380000,108)]
    providers=[("Sri Lanka Insurance (SLIC)",1580000,41.0),("Ceylinco General",1120000,29.1),("AIA Health",690000,17.9),("Softlogic Life & Others",460000,12.0)]
    return InsuranceVsOutOfPocketResponse(ledger=[MonthlyLedgerItem(period=m,total_insurance_covered=i,total_out_of_pocket=o,total_revenue=i+o,volume=v) for m,i,o,v in rows],provider_split=[ProviderSplitItem(provider_name=n,amount=a,percentage=p) for n,a,p in providers],claim_slas=[ClaimSlaItem(provider_name=n,avg_days=d) for n,d in [("Sri Lanka Insurance (SLIC)",3.4),("Ceylinco General",4.1),("AIA Health & Softlogic",5.2)]],payment_modes=[PaymentModeItem(payment_type=n,amount=a,percentage=p) for n,a,p in [("Credit / Debit",1467000,68.4),("Cash",489000,22.8),("LankaQR / App",189000,8.8)]],avg_claim_days=4.2)
async def main():
    reports.get_appointments_summary=appointments;reports.get_doctor_revenue=doctors;reports.get_outstanding_balances=balances;reports.get_insurance_vs_out_of_pocket=insurance
    out=Path('/app/tmp/pdfs');out.mkdir(parents=True,exist_ok=True)
    user=CurrentUser(user_id=1,role="Branch Manager",branch_id=1,username="preview")
    kw=dict(current_user=user,conn=Connection(),branch_id=1)
    for name,func,params in [('appointments',reports.appointments_summary_pdf,dict(start_date=date(2026,9,1),end_date=date(2026,9,7))),('doctor-revenue',reports.doctor_revenue_pdf,dict(start_date=date(2026,9,1),end_date=date(2026,9,30))),('outstanding-balances',reports.outstanding_balances_pdf,{}),('insurance',reports.insurance_cash_pdf,dict(start_date=date(2026,4,1),end_date=date(2026,9,30)))]:
        response=await func(**kw,**params)
        (out/f'{name}-preview.pdf').write_bytes(response.body)
        print(name,len(response.body),'bytes')
asyncio.run(main())
