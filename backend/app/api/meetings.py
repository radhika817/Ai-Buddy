import os
import uuid
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.meeting import Meeting
from app.models.transcript import TranscriptSegment
from app.models.action_item import ActionItem
from app.models.decision import Decision
from app.schemas.meeting import MeetingOut
from app.schemas.transcript import TranscriptSegmentOut
from app.schemas.action_item import ActionItemOut
from app.schemas.decision import DecisionOut
from app.services.transcription import process_meeting_transcription

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/meetings", tags=["Meetings"])

# Allowed audio/video formats and size limits
ALLOWED_EXTENSIONS = {"mp3", "wav", "m4a", "mp4", "mkv", "webm"}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB

# Resolve backend uploads directory
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BACKEND_DIR, "uploads")


@router.post("", response_model=MeetingOut, status_code=status.HTTP_201_CREATED)
async def upload_meeting(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Accepts meeting title and file (multipart/form-data).
    Validates file type (mp3, wav, m4a, mp4, mkv, webm) and max size 100MB.
    Saves file to backend/uploads with a unique filename and creates a meeting record.
    Queues asynchronous transcription via background task.
    """
    cleaned_title = title.strip()
    if not cleaned_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title cannot be empty.",
        )

    # Validate file extension
    original_filename = file.filename or ""
    ext = original_filename.split(".")[-1].lower() if "." in original_filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type .{ext}. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Ensure uploads directory exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Generate unique filename
    safe_basename = "".join(c for c in original_filename if c.isalnum() or c in "._- ")
    unique_filename = f"{uuid.uuid4().hex}_{safe_basename}"
    destination_path = os.path.join(UPLOAD_DIR, unique_filename)

    total_bytes = 0
    chunk_size = 1024 * 1024  # 1MB chunk

    try:
        with open(destination_path, "wb") as buffer:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_FILE_SIZE:
                    buffer.close()
                    if os.path.exists(destination_path):
                        os.remove(destination_path)
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="File size exceeds maximum allowed limit of 100 MB.",
                    )
                buffer.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(destination_path):
            os.remove(destination_path)
        logger.error(f"Error saving uploaded file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save uploaded file.",
        )

    # Relative path stored in database
    relative_path = os.path.join("uploads", unique_filename)

    new_meeting = Meeting(
        user_id=current_user.id,
        title=cleaned_title,
        file_path=relative_path,
        status="uploaded",
    )
    db.add(new_meeting)
    db.commit()
    db.refresh(new_meeting)

    # Start asynchronous background transcription
    background_tasks.add_task(process_meeting_transcription, new_meeting.id)

    return new_meeting


@router.get("", response_model=List[MeetingOut])
def get_user_meetings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns only the logged-in user's meetings, sorted newest first.
    """
    return (
        db.query(Meeting)
        .filter(Meeting.user_id == current_user.id)
        .order_by(Meeting.created_at.desc())
        .all()
    )


@router.get("/{meeting_id}", response_model=MeetingOut)
def get_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns one meeting only if it belongs to the logged-in user.
    """
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found.",
        )

    if meeting.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this meeting.",
        )

    return meeting


@router.get("/{meeting_id}/transcript", response_model=List[TranscriptSegmentOut])
def get_meeting_transcript(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns all transcript segments for a meeting, ordered by start_time.
    """
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found.",
        )

    if meeting.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this meeting's transcript.",
        )

    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.meeting_id == meeting_id)
        .order_by(TranscriptSegment.start_time.asc())
        .all()
    )
    return segments


@router.delete("/{meeting_id}", status_code=status.HTTP_200_OK)
def delete_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Deletes the meeting record and its associated uploaded file,
    only if it belongs to the logged-in user.
    """
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found.",
        )

    if meeting.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this meeting.",
        )

    # Delete physical file
    file_path = os.path.join(BACKEND_DIR, meeting.file_path)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            logger.warning(f"Could not remove physical file {file_path}: {e}")

    db.delete(meeting)
    db.commit()

    return {"detail": "Meeting deleted successfully."}


@router.get("/{meeting_id}/action-items", response_model=List[ActionItemOut])
def get_meeting_action_items(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns all action items for a meeting, ordered by id.
    Only permitted for the owner of the meeting.
    """
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found.",
        )

    if meeting.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this meeting's action items.",
        )

    items = (
        db.query(ActionItem)
        .filter(ActionItem.meeting_id == meeting_id)
        .order_by(ActionItem.id.asc())
        .all()
    )
    return items


@router.get("/{meeting_id}/decisions", response_model=List[DecisionOut])
def get_meeting_decisions(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns all decisions logged for a meeting, ordered by id.
    Only permitted for the owner of the meeting.
    """
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found.",
        )

    if meeting.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this meeting's decisions.",
        )

    decisions = (
        db.query(Decision)
        .filter(Decision.meeting_id == meeting_id)
        .order_by(Decision.id.asc())
        .all()
    )
    return decisions
