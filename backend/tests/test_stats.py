from app.routers.stats import StatsOverview, TodayAppointments, ActivityItem
from app.main import app

def test_stats_models_instantiation():
    today = TodayAppointments(scheduled=5, completed=10, cancelled=1)
    overview = StatsOverview(
        total_patients=120,
        total_doctors=15,
        total_staff=30,
        total_branches=3,
        today_appointments=today
    )
    assert overview.total_patients == 120
    assert overview.today_appointments.scheduled == 5

    activity = ActivityItem(
        id=1,
        action_type="INSERT",
        entity_type="patient",
        entity_id=101,
        description="Created new patient record",
        performed_by="User #2",
        created_at="2026-09-23T12:00:00Z"
    )
    assert activity.action_type == "INSERT"
    assert activity.entity_id == 101

def test_stats_routes_registered():
    routes = [route.path for route in app.routes]
    assert "/api/v1/stats/overview" in routes
    assert "/api/v1/stats/activity" in routes
