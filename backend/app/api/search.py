import logging
from typing import List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.embedding import search_transcript_chunks

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Search"])


class SearchResultItem(BaseModel):
    meeting_id: int
    meeting_title: str
    start_time: float
    end_time: float
    text: str
    similarity_score: float


@router.get("/search", response_model=List[SearchResultItem])
def search_transcripts(
    q: str = Query(..., min_length=1, description="Semantic search query text"),
    limit: int = Query(default=5, ge=1, le=50, description="Maximum number of similar chunks to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Embeds the search query and returns the most similar chunks across the
    logged-in user's meetings only.
    Each result includes meeting_id, meeting_title, start_time, end_time, text,
    and similarity_score.
    The user_id filter is applied in the database query itself.
    """
    cleaned_query = q.strip()
    if not cleaned_query:
        return []

    try:
        results = search_transcript_chunks(
            db=db,
            user_id=current_user.id,
            query=cleaned_query,
            limit=limit,
        )
        return results
    except Exception as e:
        logger.exception(f"Semantic search query error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to perform semantic search.",
        )
