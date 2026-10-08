from datetime import date
from app.report_design import build_design, stacked_chart


def test_appointment_statuses_and_zero_data():
    sections = [{"rows": [[4, 6, 2, 1]]}, {"rows": [[date(2026, 9, 1), 4, 6, 2]]}]
    result = build_design("Branch Appointments", sections, ["Period: All", "Appointment type: All"], "Test Branch")
    assert "12 appointments" in result["summary"]
    assert result["details"][0]["rows"][0][-1] == "50.0%"
    empty = build_design("Doctor Revenue", [{"rows": []}], ["Period: All", "Specialty: All"], "Test Branch")
    assert empty["kpis"][0][1] == "LKR 0"


def test_charts_escape_labels_and_handle_empty():
    chart = str(stacked_chart([('<script>alert(1)</script>', [2, 3])], ['A', 'B'], ['#006b9c', '#32bdf4']))
    assert '<script>' not in chart
    assert '&lt;script&gt;' in chart
    assert "No data available" in str(stacked_chart([], [], []))


def test_large_period_keeps_all_days_in_legible_charts():
    records = [[date(2026, 9, day), 1, 2, 0] for day in range(1, 31)]
    result = build_design("Branch Appointments", [{"rows": [[30, 60, 0, 0]]}, {"rows": records}], ["Period: September", "Appointment type: All"], "Test Branch")
    assert len(result["overview"]) == 3
    assert len(result["details"][0]["rows"]) == 30


def test_balance_aging_and_patient_fields():
    records = [["INV-1", "Test Patient", 100.0, 20.0, 80.0, 61, "Partially Paid", 7, None]]
    result = build_design("Outstanding Balances", [{"rows": records}], ["Aging: all", "Search: All"], "Test Branch")
    row = result["details"][0]["rows"][0]
    assert "PT-000007" in row[0] and row[-1] == "60+d" and row[5] == "-"
    assert result["kpis"][0][1] == "LKR 80"


def test_insurance_month_order_and_missing_sla():
    sections = [{"rows": [["Sep 2026", 60., 40., 100., 1], ["Apr 2026", 30., 20., 50., 1]]}, {"rows": []}, {"rows": [], "average": 4.2}, {"rows": []}]
    result = build_design("Insurance vs Cash", sections, ["Period: All", "Provider: all"], "Test Branch")
    assert result["details"][0]["rows"][0][0] == "Sep 2026"
    assert result["kpis"][0][1] == "60.0%"
    assert result["kpis"][3][1] == "4.2 days"
    assert "SLA" not in str(result["details"][1]["rows"])
