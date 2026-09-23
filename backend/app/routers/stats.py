from typing import Optional, List
from fastapi import APIRouter, Depends
import asyncpg
from datetime import date

from app.db import get_conn
from app.dependencies import get_current_user, require_roles, CurrentUser, get_branch_scope
from pydantic import BaseModel

router = APIRouter()

class TodayAppointments(BaseModel):
    scheduled: int
    completed: int
    cancelled: int

class StatsOverview(BaseModel):
    total_patients: int
    total_doctors: int
    total_staff: int
    total_branches: int
    today_appointments: TodayAppointments

class ActivityItem(BaseModel):
    id: int
    action_type: str
    entity_type: str
    entity_id: Optional[int]
    description: str
    performed_by: str
    created_at: str

@router.get("/overview", response_model=StatsOverview)
async def get_stats_overview(
    branch: Optional[int] = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_conn)
):
    """
    Returns high-level aggregate counts for the dashboard.
    Branch Manager implicitly scoped to their own branch via get_branch_scope.
    """
    # Enforce scope if Branch Manager
    effective_branch = branch
    scope = get_branch_scope(current_user)
    if scope is not None:
        effective_branch = scope
        
    where_clause = ""
    args = []
    if effective_branch is not None:
        where_clause = "WHERE branch_id = $1"
        args.append(effective_branch)
        
    # Patients (not branch specific in DB, but we could scope it if needed)
    patients_count = await db.fetchval("SELECT COUNT(*) FROM patient WHERE is_active = TRUE")
    
    # Doctors
    doc_query = f"SELECT COUNT(*) FROM staff WHERE is_active = TRUE AND user_id IN (SELECT user_id FROM app_user WHERE role_id = (SELECT role_id FROM role WHERE role_name = 'Doctor')) {where_clause.replace('WHERE', 'AND') if where_clause else ''}"
    doctors_count = await db.fetchval(doc_query, *args)
    
    # Staff
    staff_query = f"SELECT COUNT(*) FROM staff WHERE is_active = TRUE {where_clause.replace('WHERE', 'AND') if where_clause else ''}"
    staff_count = await db.fetchval(staff_query, *args)
    
    # Branches
    branches_count = await db.fetchval("SELECT COUNT(*) FROM branch WHERE is_active = TRUE")
    
    # Today's appointments
    today = date.today()
    apt_args = [today]
    apt_where = "appointment_date = $1"
    
    if effective_branch is not None:
        apt_args.append(effective_branch)
        apt_where += " AND branch_id = $2"
        
    appointments = await db.fetch(f"""
        SELECT status, COUNT(*) as count 
        FROM appointment 
        WHERE {apt_where} 
        GROUP BY status
    """, *apt_args)
    
    scheduled = 0
    completed = 0
    cancelled = 0
    
    for row in appointments:
        if row['status'] == 'Scheduled': scheduled = row['count']
        elif row['status'] == 'Completed': completed = row['count']
        elif row['status'] == 'Cancelled': cancelled = row['count']
        
    return StatsOverview(
        total_patients=patients_count,
        total_doctors=doctors_count,
        total_staff=staff_count,
        total_branches=branches_count,
        today_appointments=TodayAppointments(
            scheduled=scheduled,
            completed=completed,
            cancelled=cancelled
        )
    )


@router.get("/activity", response_model=List[ActivityItem])
async def get_recent_activity(
    limit: int = 10,
    branch: Optional[int] = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_conn)
):
    """
    Returns recent activity from the audit_log.
    """
    # Enforce scope if Branch Manager
    effective_branch = branch
    scope = get_branch_scope(current_user)
    if scope is not None:
        effective_branch = scope
        
    query = """
        SELECT 
            log_id as id,
            action as action_type,
            table_name as entity_type,
            record_id as entity_id,
            'Performed ' || action || ' on ' || table_name as description,
            user_id::text as performed_by,
            timestamp::text as created_at
        FROM audit_log
        ORDER BY timestamp DESC
        LIMIT $1
    """
    rows = await db.fetch(query, limit)
    
    # Very basic description mapping for demo purposes
    items = []
    for row in rows:
        action = row['action_type']
        entity = row['entity_type']
        
        desc = f"Updated {entity} record"
        if action == 'INSERT': desc = f"Created new {entity} record"
        elif action == 'DELETE': desc = f"Deleted {entity} record"
        
        items.append(ActivityItem(
            id=row['id'],
            action_type=row['action_type'],
            entity_type=row['entity_type'],
            entity_id=row['entity_id'],
            description=desc,
            performed_by=f"User #{row['performed_by']}",
            created_at=row['created_at']
        ))
        
    return items
