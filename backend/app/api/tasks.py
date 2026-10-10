from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, case

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.meeting import Meeting
from app.models.action_item import ActionItem
from app.schemas.action_item import TaskItemOut, TasksStatsOut

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("", response_model=List[TaskItemOut])
@router.get("/", response_model=List[TaskItemOut], include_in_schema=False)
def get_user_tasks(
    status: str = Query("all", description="Filter by status: pending, done, or all"),
    assignee: Optional[str] = Query(None, description="Filter by assignee name"),
    sort: str = Query("newest", description="Sort order: deadline or newest"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns the logged-in user's action items across all meetings.
    The user_id filter is enforced directly in the database query.
    """
    query = (
        db.query(
            ActionItem.id,
            ActionItem.meeting_id,
            ActionItem.task,
            ActionItem.assigned_to,
            ActionItem.deadline_text,
            ActionItem.deadline_date,
            ActionItem.status,
            ActionItem.created_at,
            Meeting.title.label("meeting_title"),
        )
        .join(Meeting, ActionItem.meeting_id == Meeting.id)
        .filter(Meeting.user_id == current_user.id)
    )

    # Status filter
    status_clean = (status or "all").strip().lower()
    if status_clean == "pending":
        query = query.filter(ActionItem.status == "pending")
    elif status_clean == "done":
        query = query.filter(ActionItem.status == "done")

    # Assignee filter
    if assignee and assignee.strip():
        assignee_clean = assignee.strip()
        if assignee_clean.lower() == "unassigned":
            query = query.filter(
                or_(
                    ActionItem.assigned_to.is_(None),
                    ActionItem.assigned_to == "",
                )
            )
        else:
            query = query.filter(
                ActionItem.assigned_to.ilike(f"%{assignee_clean}%")
            )

    # Sort
    sort_clean = (sort or "newest").strip().lower()
    if sort_clean == "deadline":
        # Items with deadlines first (ascending date), null deadlines last
        query = query.order_by(
            ActionItem.deadline_date.is_(None).asc(),
            ActionItem.deadline_date.asc(),
            ActionItem.id.desc(),
        )
    else:
        # Default newest first
        query = query.order_by(ActionItem.id.desc())

    rows = query.all()

    return [
        TaskItemOut(
            id=row.id,
            meeting_id=row.meeting_id,
            meeting_title=row.meeting_title,
            task=row.task,
            assigned_to=row.assigned_to,
            deadline_text=row.deadline_text,
            deadline_date=row.deadline_date,
            status=row.status,
            created_at=row.created_at,
        )
        for row in rows
    ]


@router.get("/stats", response_model=TasksStatsOut)
def get_user_tasks_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns aggregate stats for the logged-in user:
    - total_meetings
    - total_action_items
    - pending_count
    - done_count
    - overdue_count (pending items whose deadline_date is before today)
    """
    today = date.today()

    total_meetings = (
        db.query(func.count(Meeting.id))
        .filter(Meeting.user_id == current_user.id)
        .scalar()
        or 0
    )

    stats_row = (
        db.query(
            func.count(ActionItem.id).label("total_action_items"),
            func.count(case((ActionItem.status == "pending", 1))).label("pending_count"),
            func.count(case((ActionItem.status == "done", 1))).label("done_count"),
            func.count(
                case(
                    (
                        (ActionItem.status == "pending") & (ActionItem.deadline_date < today),
                        1,
                    )
                )
            ).label("overdue_count"),
        )
        .join(Meeting, ActionItem.meeting_id == Meeting.id)
        .filter(Meeting.user_id == current_user.id)
        .first()
    )

    total_action_items = stats_row.total_action_items if stats_row else 0
    pending_count = stats_row.pending_count if stats_row else 0
    done_count = stats_row.done_count if stats_row else 0
    overdue_count = stats_row.overdue_count if stats_row else 0

    return TasksStatsOut(
        total_meetings=total_meetings,
        total_action_items=total_action_items,
        pending_count=pending_count,
        done_count=done_count,
        overdue_count=overdue_count,
    )
