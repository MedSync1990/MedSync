from typing import Optional, List
from fastapi import APIRouter, Depends
import asyncpg
from datetime import date

from app.db import get_conn
from app.dependencies import get_current_user, require_roles, CurrentUser, get_effective_branch_id
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
    # Enforce scope if Branch Manager; ignore any conflicting client-supplied branch.
    effective_branch = get_effective_branch_id(current_user, branch)
    today = date.today()

    query = """
        WITH params AS (
            SELECT $1::int AS branch_id, $2::date AS today_date
        ),
        patient_cnt AS (
            SELECT COUNT(*)::int AS cnt
            FROM patient p, params
            WHERE p.is_active = TRUE
              AND (params.branch_id IS NULL OR p.registered_branch = params.branch_id)
        ),
        doctor_cnt AS (
            SELECT COUNT(*)::int AS cnt
            FROM staff s
            JOIN app_user u ON s.user_id = u.user_id
            JOIN role r ON u.role_id = r.role_id
            CROSS JOIN params
            WHERE s.is_active = TRUE
              AND r.role_name = 'Doctor'
              AND (params.branch_id IS NULL OR s.branch_id = params.branch_id)
        ),
        staff_cnt AS (
            SELECT COUNT(*)::int AS cnt
            FROM staff s, params
            WHERE s.is_active = TRUE
              AND (params.branch_id IS NULL OR s.branch_id = params.branch_id)
        ),
        branch_cnt AS (
            SELECT COUNT(*)::int AS cnt
            FROM branch b
            WHERE b.is_active = TRUE
        ),
        appt_counts AS (
            SELECT
                COUNT(*) FILTER (WHERE a.status = 'Scheduled')::int AS scheduled,
                COUNT(*) FILTER (WHERE a.status = 'Completed')::int AS completed,
                COUNT(*) FILTER (WHERE a.status = 'Cancelled')::int AS cancelled
            FROM appointments a
            JOIN doctor_availability_slots das ON a.slot_id = das.slot_id
            JOIN staff s ON das.doctor_id = s.user_id
            CROSS JOIN params
            WHERE das.date = params.today_date
              AND (params.branch_id IS NULL OR s.branch_id = params.branch_id)
        )
        SELECT 
            (SELECT cnt FROM patient_cnt) AS total_patients,
            (SELECT cnt FROM doctor_cnt) AS total_doctors,
            (SELECT cnt FROM staff_cnt) AS total_staff,
            (SELECT cnt FROM branch_cnt) AS total_branches,
            COALESCE((SELECT scheduled FROM appt_counts), 0) AS scheduled,
            COALESCE((SELECT completed FROM appt_counts), 0) AS completed,
            COALESCE((SELECT cancelled FROM appt_counts), 0) AS cancelled;
    """
    row = await db.fetchrow(query, effective_branch, today)
    r = dict(row) if row else {}

    return StatsOverview(
        total_patients=r.get("total_patients", 0),
        total_doctors=r.get("total_doctors", 0),
        total_staff=r.get("total_staff", 0),
        total_branches=r.get("total_branches", 0),
        today_appointments=TodayAppointments(
            scheduled=r.get("scheduled", 0),
            completed=r.get("completed", 0),
            cancelled=r.get("cancelled", 0),
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
    # Enforce scope if Branch Manager; ignore any conflicting client-supplied branch.
    effective_branch = get_effective_branch_id(current_user, branch)
    
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
