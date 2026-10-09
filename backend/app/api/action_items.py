from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.meeting import Meeting
from app.models.action_item import ActionItem
from app.schemas.action_item import ActionItemOut, ActionItemUpdate

router = APIRouter(prefix="/action-items", tags=["Action Items"])


@router.patch("/{action_item_id}", response_model=ActionItemOut)
def update_action_item_status(
    action_item_id: int,
    payload: ActionItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Updates the status of an action item ('pending' or 'done').
    Only permitted for the owner of the associated meeting.
    """
    action_item = db.query(ActionItem).filter(ActionItem.id == action_item_id).first()
    if not action_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action item not found.",
        )

    meeting = db.query(Meeting).filter(Meeting.id == action_item.meeting_id, Meeting.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action item not found.",
        )

    action_item.status = payload.status
    db.commit()
    db.refresh(action_item)
    return action_item
