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
        
    # Patients
    if effective_branch is not None:
        patients_count = await db.fetchval("SELECT COUNT(*) FROM patient WHERE is_active = TRUE AND registered_branch = $1", effective_branch)
    else:
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
    apt_query = """
        SELECT a.status, COUNT(*) as count 
        FROM appointments a
        JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
        JOIN staff s ON das.doctor_id = s.user_id
        WHERE das.date = $1
    """
    apt_args: list[object] = [today]
    if effective_branch is not None:
        apt_query += " AND s.branch_id = $2"
        apt_args.append(effective_branch)
        
    apt_query += " GROUP BY a.status"
    appointments = await db.fetch(apt_query, *apt_args)
    
    scheduled = 0
    completed = 0
    cancelled = 0
    
    for row in appointments:
        if row['status'] == 'Scheduled': scheduled = row['count']
        elif row['status'] == 'Completed': completed = row['count']
        elif row['status'] == 'Cancelled': cancelled = row['count']
        
    return StatsOverview(
        total_patients=patients_count or 0,
        total_doctors=doctors_count or 0,
        total_staff=staff_count or 0,
        total_branches=branches_count or 0,
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
            audit_id as id,
            operation as action_type,
            table_name as entity_type,
            row_pk as entity_id,
            changed_by as performed_by,
            changed_at::text as created_at
        FROM audit_log
        ORDER BY changed_at DESC
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
        
        raw_entity_id = row['entity_id']
        entity_id_val = int(raw_entity_id) if raw_entity_id and str(raw_entity_id).isdigit() else None
        
        user_str = f"User #{row['performed_by']}" if row['performed_by'] else "System"

        items.append(ActivityItem(
            id=row['id'],
            action_type=row['action_type'],
            entity_type=row['entity_type'],
            entity_id=entity_id_val,
            description=desc,
            performed_by=user_str,
            created_at=row['created_at']
        ))
        
    return items
