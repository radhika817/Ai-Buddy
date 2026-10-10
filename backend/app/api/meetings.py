import os
import uuid
import logging
from typing import List, Optional
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    BackgroundTasks,
    status,
    Query,
    Body,
    Response,
)
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.meeting import Meeting
from app.models.transcript import TranscriptSegment
from app.models.action_item import ActionItem
from app.models.decision import Decision
from app.schemas.meeting import MeetingOut, MeetingUpdate
from app.schemas.transcript import (
    TranscriptSegmentOut,
    TranscriptSegmentUpdate,
    SpeakerRenameRequest,
)
from app.schemas.action_item import ActionItemOut
from app.schemas.decision import DecisionOut
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.email import FollowUpEmailRequest, FollowUpEmailResponse
from app.services.chat import build_meeting_context, ask_meeting_ai
from app.services.email_draft import generate_follow_up_email
from app.services.export import generate_meeting_markdown, sanitize_export_filename
from app.services.summarization import GeminiRateLimitError
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
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found.",
        )

    return meeting


@router.patch("/{meeting_id}", response_model=MeetingOut)
def update_meeting_title(
    meeting_id: int,
    payload: MeetingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Updates meeting title (non-empty, max 120 chars).
    Only permitted for the owner of the meeting (404 otherwise).
    """
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found.",
        )

    meeting.title = payload.title
    db.commit()
    db.refresh(meeting)
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
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found.",
        )

    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.meeting_id == meeting_id)
        .order_by(TranscriptSegment.start_time.asc())
        .all()
    )
    return segments


@router.patch("/{meeting_id}/transcript/{segment_id}", response_model=TranscriptSegmentOut)
def update_transcript_segment(
    meeting_id: int,
    segment_id: int,
    payload: TranscriptSegmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Updates text and/or speaker for a specific transcript segment.
    Sets edited=True when text changes.
    Only permitted for the owner of the meeting (404 otherwise).
    """
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found.",
        )

    segment = (
        db.query(TranscriptSegment)
        .filter(
            TranscriptSegment.id == segment_id,
            TranscriptSegment.meeting_id == meeting.id,
        )
        .first()
    )
    if not segment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transcript segment not found.",
        )

    # Check if text is being updated
    if payload.text is not None:
        new_text = payload.text.strip()
        if not new_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transcript text cannot be empty.",
            )
        if new_text != segment.text:
            segment.text = new_text
            segment.edited = True
            meeting.indexed = False

    # Check if speaker is being updated
    if payload.speaker is not None:
        cleaned_speaker = payload.speaker.strip()
        new_speaker_val = cleaned_speaker if cleaned_speaker else None
        if new_speaker_val != segment.speaker:
            segment.speaker = new_speaker_val
            meeting.indexed = False

    db.commit()
    db.refresh(segment)
    return segment


@router.post("/{meeting_id}/speakers/rename")
def rename_meeting_speaker(
    meeting_id: int,
    payload: SpeakerRenameRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Renames a speaker across all transcript segments in the meeting.
    Only permitted for the owner of the meeting (404 otherwise).
    """
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found.",
        )

    old_name = payload.old_name.strip()
    new_name = payload.new_name.strip()

    updated_count = (
        db.query(TranscriptSegment)
        .filter(
            TranscriptSegment.meeting_id == meeting.id,
            TranscriptSegment.speaker == old_name,
        )
        .update({TranscriptSegment.speaker: new_name}, synchronize_session=False)
    )
    db.commit()

    return {
        "message": f"Renamed speaker '{old_name}' to '{new_name}' across {updated_count} segment(s).",
        "updated_count": updated_count,
        "old_name": old_name,
        "new_name": new_name,
    }


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
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found.",
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
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found.",
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
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found.",
        )

    decisions = (
        db.query(Decision)
        .filter(Decision.meeting_id == meeting_id)
        .order_by(Decision.id.asc())
        .all()
    )
    return decisions


@router.post("/{meeting_id}/chat", response_model=ChatResponse)
def chat_with_meeting(
    meeting_id: int,
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Answers questions about a specific meeting using AI Buddy grounded on its transcript,
    summary, action items, and decisions.
    Only available to the owner of the meeting and only when status is 'ready'.
    """
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found.",
        )

    if meeting.status != "ready":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Meeting is not ready for AI chat. Current status: '{meeting.status}'. Please wait until processing completes.",
        )

    # Fetch transcript segments
    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.meeting_id == meeting.id)
        .order_by(TranscriptSegment.start_time.asc())
        .all()
    )

    # Fetch action items
    action_items = (
        db.query(ActionItem)
        .filter(ActionItem.meeting_id == meeting.id)
        .order_by(ActionItem.id.asc())
        .all()
    )

    # Fetch decisions
    decisions = (
        db.query(Decision)
        .filter(Decision.meeting_id == meeting.id)
        .order_by(Decision.id.asc())
        .all()
    )

    meeting_context = build_meeting_context(meeting, segments, action_items, decisions)

    try:
        answer = ask_meeting_ai(
            meeting_context=meeting_context,
            question=payload.question,
            history=payload.history,
        )
        return ChatResponse(answer=answer)
    except GeminiRateLimitError as e:
        logger.warning(f"Rate limit hit during chat for meeting {meeting_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI Buddy is experiencing high demand right now. Please wait a few moments and try your question again.",
        )
    except ValueError as e:
        logger.error(f"Configuration error during chat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
    except Exception as e:
        logger.exception(f"Unexpected error during chat for meeting {meeting_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate an answer from AI Buddy. Please try again.",
        )


@router.get("/{meeting_id}/export")
def export_meeting(
    meeting_id: int,
    format: str = Query("md", description="Export format, currently 'md' is supported."),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Exports a meeting to a downloadable Markdown file (.md).
    Only available to the owner of the meeting and only when status is 'ready'.
    """
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found.",
        )

    if meeting.status != "ready":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Meeting is not ready for export. Current status: '{meeting.status}'. Please wait until processing completes.",
        )

    if format.lower() != "md":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported export format '{format}'. Supported formats: 'md'.",
        )

    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.meeting_id == meeting.id)
        .order_by(TranscriptSegment.start_time.asc())
        .all()
    )
    action_items = (
        db.query(ActionItem)
        .filter(ActionItem.meeting_id == meeting.id)
        .order_by(ActionItem.id.asc())
        .all()
    )
    decisions = (
        db.query(Decision)
        .filter(Decision.meeting_id == meeting.id)
        .order_by(Decision.id.asc())
        .all()
    )

    markdown_content = generate_meeting_markdown(meeting, segments, action_items, decisions)
    filename = sanitize_export_filename(meeting.title, meeting.id)

    return Response(
        content=markdown_content,
        media_type="text/markdown",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.post("/{meeting_id}/follow-up-email", response_model=FollowUpEmailResponse)
def create_follow_up_email(
    meeting_id: int,
    payload: FollowUpEmailRequest = Body(default_factory=FollowUpEmailRequest),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generates a follow-up email recap using Google Gemini based on the meeting's
    summary, action items, and decisions.
    Only available to the owner of the meeting and only when status is 'ready'.
    """
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found.",
        )

    if meeting.status != "ready":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Meeting is not ready for follow-up email. Current status: '{meeting.status}'. Please wait until processing completes.",
        )

    action_items = (
        db.query(ActionItem)
        .filter(ActionItem.meeting_id == meeting.id)
        .order_by(ActionItem.id.asc())
        .all()
    )
    decisions = (
        db.query(Decision)
        .filter(Decision.meeting_id == meeting.id)
        .order_by(Decision.id.asc())
        .all()
    )

    try:
        result = generate_follow_up_email(
            meeting=meeting,
            action_items=action_items,
            decisions=decisions,
            tone=payload.tone,
        )
        return FollowUpEmailResponse(
            subject=result["subject"],
            body=result["body"],
        )
    except GeminiRateLimitError as e:
        logger.warning(f"Rate limit hit during follow-up email for meeting {meeting_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI Buddy is experiencing high demand right now. Please wait a few moments and try generating the email again.",
        )
    except ValueError as e:
        logger.error(f"Configuration error during follow-up email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
    except Exception as e:
        logger.exception(f"Unexpected error generating follow-up email for meeting {meeting_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate follow-up email. Please try again.",
        )


@router.post("/{meeting_id}/reindex")
def reindex_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Deletes the old chunks for that meeting and rebuilds them (needed after transcript edits).
    Owner only.
    """
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found.",
        )

    if meeting.status != "ready":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Meeting is not ready for indexing. Current status: '{meeting.status}'.",
        )

    try:
        from app.services.embedding import index_meeting_transcript
        chunks_count = index_meeting_transcript(meeting.id, db)
        return {
            "message": "Meeting reindexed successfully.",
            "meeting_id": meeting.id,
            "chunks_count": chunks_count,
            "indexed": True,
        }
    except Exception as e:
        logger.exception(f"Failed to reindex meeting {meeting_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reindex meeting: {str(e)}",
        )


@router.post("/index-all")
def index_all_meetings(
    force: bool = Query(default=False, description="If true, reindexes all ready meetings; if false, only indexes meetings where indexed is false"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    One-time or batch indexing endpoint for ready meetings belonging to the current user.
    """
    query = db.query(Meeting).filter(Meeting.user_id == current_user.id, Meeting.status == "ready")
    if not force:
        query = query.filter(Meeting.indexed == False)  # noqa: E712

    meetings = query.order_by(Meeting.id.asc()).all()
    results = []
    total_chunks = 0
    from app.services.embedding import index_meeting_transcript
    for m in meetings:
        try:
            count = index_meeting_transcript(m.id, db)
            total_chunks += count
            results.append({"id": m.id, "title": m.title, "chunks_count": count, "status": "success"})
        except Exception as e:
            logger.error(f"Failed to index meeting {m.id}: {e}")
            results.append({"id": m.id, "title": m.title, "error": str(e), "status": "failed"})

    return {
        "message": f"Processed {len(meetings)} meeting(s).",
        "indexed_meetings_count": len([r for r in results if r["status"] == "success"]),
        "total_chunks_created": total_chunks,
        "results": results,
    }


