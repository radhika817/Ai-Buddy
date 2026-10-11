import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.meeting import Meeting
from app.schemas.chat import (
    ChatRequest,
    CrossMeetingChatResponse,
    ChatSource,
)
from app.services.embedding import hybrid_search_chunks
from app.services.chat import (
    chat_rate_limiter,
    rewrite_search_query_with_gemini,
    format_chunks_for_cross_meeting_llm,
    ask_cross_meeting_ai,
)
from app.services.summarization import GeminiRateLimitError

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Cross-Meeting Chat"])


@router.post("/chat", response_model=CrossMeetingChatResponse)
def cross_meeting_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cross-meeting conversational Q&A endpoint:
    1. Enforces 20 requests per minute rate limit per user.
    2. Checks if user has indexed meetings; returns friendly message if not.
    3. Rewrites question to standalone query if history exists.
    4. Runs hybrid search (semantic + ILIKE keyword) across logged-in user's meetings.
    5. Sorts chunks chronologically by meeting date.
    6. Calls Gemini with strict ground-truth prompt and sources citations.
    7. Returns answer and sources (with 150-char text preview).
    """
    # 1. Enforce rate limit (max 20 requests per user per minute)
    if not chat_rate_limiter.check_and_record(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many chat requests. Please wait a minute before asking more questions.",
        )

    # 2. Check if user has any indexed meetings or transcript chunks
    from app.models.transcript_chunk import TranscriptChunk

    indexed_count = (
        db.query(Meeting)
        .filter(Meeting.user_id == current_user.id, Meeting.indexed == True)
        .count()
    )
    chunks_count = (
        db.query(TranscriptChunk)
        .filter(TranscriptChunk.user_id == current_user.id)
        .count()
    )
    if indexed_count == 0 and chunks_count == 0:
        return CrossMeetingChatResponse(
            answer="You don't have any indexed meetings yet. Please upload and index a meeting first so I can search across your team discussions.",
            sources=[],
        )

    # 3. Rewrite query if history exists, otherwise use raw question
    raw_question = payload.question.strip()
    history = (payload.history or [])[-6:]
    if history:
        search_query = rewrite_search_query_with_gemini(raw_question, history)
        logger.info(f"Original question: '{raw_question}' -> Rewritten query: '{search_query}'")
    else:
        search_query = raw_question

    # 4. Hybrid search (semantic 8 chunks + keyword match 8 chunks, deduplicated)
    chunks = hybrid_search_chunks(
        db=db,
        user_id=current_user.id,
        query=search_query,
        semantic_limit=8,
        keyword_limit=8,
    )

    # If no chunks match at all, respond immediately without model call
    if not chunks:
        return CrossMeetingChatResponse(
            answer="I couldn't find that in your meetings.",
            sources=[],
        )

    # 5. Format sources for response (chunks actually provided to the model, max 150 chars preview)
    sources: List[ChatSource] = []
    for c in chunks:
        sources.append(
            ChatSource(
                meeting_id=c["meeting_id"],
                meeting_title=c.get("meeting_title") or "Untitled Meeting",
                start_time=float(c.get("start_time", 0.0)),
                text_preview=c["text"][:150],
            )
        )

    # 6. Assemble labeled chunk context for LLM:
    # [Meeting: Sprint Review | 2026-10-04 | 03:25] text
    formatted_context = format_chunks_for_cross_meeting_llm(chunks)

    # 7. Ask Gemini with rate limit retry
    try:
        answer = ask_cross_meeting_ai(
            context_chunks_text=formatted_context,
            question=raw_question,
            history=history,
        )
        return CrossMeetingChatResponse(
            answer=answer,
            sources=sources,
        )
    except GeminiRateLimitError as e:
        logger.warning(f"Rate limit hit during cross-meeting chat for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI Buddy is experiencing high demand right now. Please wait a few moments and try your question again.",
        )
    except ValueError as e:
        logger.error(f"Configuration error during cross-meeting chat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
    except Exception as e:
        logger.exception(f"Unexpected error in cross-meeting chat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process chat question. Please try again.",
        )
