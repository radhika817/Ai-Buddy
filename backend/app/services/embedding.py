import logging
from typing import List, Dict, Any, Optional
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastembed import TextEmbedding

from app.core.config import settings
from app.models.meeting import Meeting
from app.models.transcript import TranscriptSegment
from app.models.transcript_chunk import TranscriptChunk

logger = logging.getLogger(__name__)

# Global singleton embedding model instance (loaded once, reused across requests)
_embedding_model: Optional[TextEmbedding] = None


def get_embedding_model() -> TextEmbedding:
    """
    Returns the singleton TextEmbedding instance.
    Loads the model on first call and caches it in memory.
    """
    global _embedding_model
    if _embedding_model is None:
        logger.info(f"Loading FastEmbed model: '{settings.EMBEDDING_MODEL}' ({settings.EMBEDDING_DIM} dims)...")
        _embedding_model = TextEmbedding(model_name=settings.EMBEDDING_MODEL)
        logger.info(f"FastEmbed model '{settings.EMBEDDING_MODEL}' loaded successfully.")
    return _embedding_model


def chunk_transcript_segments(
    segments: List[Any],
    min_chars: int = 1000,
    max_chars: int = 1500,
) -> List[Dict[str, Any]]:
    """
    Groups consecutive transcript segments into chunks of about 1000-1500 characters,
    with one segment of overlap between consecutive chunks.
    Preserves start_time and end_time, and formats speaker name when set.
    """
    if not segments:
        return []

    # Clean and format individual segments
    valid_segments = []
    for s in segments:
        text_content = (s.text or "").strip()
        if not text_content:
            continue
        speaker_name = (s.speaker or "").strip() if getattr(s, "speaker", None) else None
        formatted_line = f"{speaker_name}: {text_content}" if speaker_name else text_content
        valid_segments.append({
            "start_time": float(s.start_time),
            "end_time": float(s.end_time),
            "speaker": speaker_name,
            "line": formatted_line,
        })

    if not valid_segments:
        return []

    chunks: List[Dict[str, Any]] = []
    i = 0
    n = len(valid_segments)

    while i < n:
        chunk_items = [valid_segments[i]]
        current_len = len(valid_segments[i]["line"])
        j = i + 1

        while j < n:
            next_seg = valid_segments[j]
            next_len = len(next_seg["line"]) + 1  # includes newline separator

            if current_len + next_len <= max_chars:
                chunk_items.append(next_seg)
                current_len += next_len
                j += 1
            elif current_len < min_chars:
                # Still below minimum target, include next segment to reach min_chars
                chunk_items.append(next_seg)
                current_len += next_len
                j += 1
                break
            else:
                # Reached acceptable chunk range (1000-1500 chars), close current chunk
                break

        # Assemble chunk metadata and text
        chunk_text = "\n".join(item["line"] for item in chunk_items)
        unique_speakers = []
        for item in chunk_items:
            if item["speaker"] and item["speaker"] not in unique_speakers:
                unique_speakers.append(item["speaker"])

        chunks.append({
            "start_time": round(chunk_items[0]["start_time"], 2),
            "end_time": round(chunk_items[-1]["end_time"], 2),
            "speakers": ", ".join(unique_speakers) if unique_speakers else None,
            "text": chunk_text,
        })

        # Overlap by exactly one segment for the next chunk:
        # If multiple segments were in this chunk, the next chunk starts at the last segment of this chunk.
        # If we reached the end of all segments (j == n), we are finished.
        if j >= n:
            break
        elif j > i + 1:
            i = j - 1
        else:
            i = j

    return chunks


def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generates embedding vectors for a list of texts using FastEmbed.
    """
    if not texts:
        return []
    model = get_embedding_model()
    embeddings_gen = model.embed(texts)
    return [vec.tolist() for vec in embeddings_gen]


def generate_query_embedding(query: str) -> List[float]:
    """
    Generates an embedding vector for a single search query.
    """
    model = get_embedding_model()
    embeddings = list(model.embed([query]))
    return embeddings[0].tolist()


def index_meeting_transcript(meeting_id: int, db: Session) -> int:
    """
    Deletes existing chunks for the meeting, extracts transcript segments,
    chunks them with 1-segment overlap, embeds them, saves them to the DB,
    and marks the meeting as indexed.
    Returns the number of chunks created.
    """
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise ValueError(f"Meeting {meeting_id} not found.")

    # 1. Delete old chunks for this meeting
    db.query(TranscriptChunk).filter(TranscriptChunk.meeting_id == meeting.id).delete()
    db.flush()

    # 2. Retrieve transcript segments
    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.meeting_id == meeting.id)
        .order_by(TranscriptSegment.start_time.asc())
        .all()
    )

    if not segments:
        meeting.indexed = True
        db.commit()
        return 0

    # 3. Create chunks
    chunk_dicts = chunk_transcript_segments(segments)
    if not chunk_dicts:
        meeting.indexed = True
        db.commit()
        return 0

    # 4. Generate embeddings in batch
    texts_to_embed = [c["text"] for c in chunk_dicts]
    vectors = generate_embeddings(texts_to_embed)

    # 5. Save chunk records
    for c_data, vec in zip(chunk_dicts, vectors):
        chunk_record = TranscriptChunk(
            user_id=meeting.user_id,
            meeting_id=meeting.id,
            start_time=c_data["start_time"],
            end_time=c_data["end_time"],
            speakers=c_data["speakers"],
            text=c_data["text"],
            embedding=vec,
        )
        db.add(chunk_record)

    # 6. Mark meeting as indexed
    meeting.indexed = True
    db.commit()
    logger.info(f"Indexed {len(chunk_dicts)} chunks for meeting {meeting_id}.")
    return len(chunk_dicts)


def search_transcript_chunks(
    db: Session,
    user_id: int,
    query: str,
    limit: int = 5,
) -> List[Dict[str, Any]]:
    """
    Embeds the search query and finds the most similar chunks across the logged-in user's meetings.
    The user_id filter is applied directly in the database query.
    In PostgreSQL, pgvector's cosine_distance operator is used in SQL.
    In SQLite (unit tests), chunks are filtered by user_id in SQL and similarity is computed.
    """
    cleaned_query = (query or "").strip()
    if not cleaned_query:
        return []

    query_vector = generate_query_embedding(cleaned_query)

    is_postgres = bool(db.bind and db.bind.dialect.name == "postgresql")

    if is_postgres:
        # Native pgvector cosine distance: distance ranges from 0 (identical) to 2 (opposite)
        distance_col = TranscriptChunk.embedding.cosine_distance(query_vector).label("distance")
        query_stmt = (
            db.query(
                TranscriptChunk,
                Meeting.title.label("meeting_title"),
                Meeting.created_at.label("meeting_created_at"),
                distance_col,
            )
            .join(Meeting, TranscriptChunk.meeting_id == Meeting.id)
            .filter(TranscriptChunk.user_id == user_id)
            .order_by(distance_col.asc())
            .limit(limit)
        )
        results = query_stmt.all()

        output = []
        for chunk, meeting_title, meeting_created_at, distance in results:
            dist_val = float(distance) if distance is not None else 1.0
            # Cosine similarity score = 1.0 - cosine_distance
            similarity = max(0.0, 1.0 - dist_val)
            output.append({
                "chunk_id": chunk.id,
                "meeting_id": chunk.meeting_id,
                "meeting_title": meeting_title,
                "meeting_date": meeting_created_at,
                "start_time": chunk.start_time,
                "end_time": chunk.end_time,
                "text": chunk.text,
                "similarity_score": round(similarity, 4),
            })
        return output
    else:
        # SQLite test environment fallback: filter by user_id in SQL query
        candidates = (
            db.query(
                TranscriptChunk,
                Meeting.title.label("meeting_title"),
                Meeting.created_at.label("meeting_created_at"),
            )
            .join(Meeting, TranscriptChunk.meeting_id == Meeting.id)
            .filter(TranscriptChunk.user_id == user_id)
            .all()
        )

        scored = []
        q_vec = np.array(query_vector, dtype=float)
        q_norm = np.linalg.norm(q_vec)

        for chunk, meeting_title, meeting_created_at in candidates:
            c_vec = np.array(chunk.embedding, dtype=float)
            c_norm = np.linalg.norm(c_vec)
            if q_norm == 0 or c_norm == 0:
                sim = 0.0
            else:
                sim = float(np.dot(q_vec, c_vec) / (q_norm * c_norm))
            similarity = max(0.0, sim)
            scored.append({
                "chunk_id": chunk.id,
                "meeting_id": chunk.meeting_id,
                "meeting_title": meeting_title,
                "meeting_date": meeting_created_at,
                "start_time": chunk.start_time,
                "end_time": chunk.end_time,
                "text": chunk.text,
                "similarity_score": round(similarity, 4),
            })

        scored.sort(key=lambda x: x["similarity_score"], reverse=True)
        return scored[:limit]


def keyword_search_chunks(
    db: Session,
    user_id: int,
    query: str,
    limit: int = 8,
) -> List[Dict[str, Any]]:
    """
    Performs keyword matching (using SQL ILIKE) on chunk text across the user's meetings.
    The user_id filter is strictly applied at the database query level.
    """
    import re
    from sqlalchemy import or_

    cleaned_query = (query or "").strip()
    if not cleaned_query:
        return []

    # Tokenize words, ticket numbers (e.g. PR-102, ABC-123), and names
    tokens = [t for t in re.split(r"[^\w\-]+", cleaned_query) if len(t) >= 2]
    terms = []
    if len(cleaned_query) >= 3 and len(tokens) > 1:
        terms.append(cleaned_query)
    for t in tokens:
        if t not in terms:
            terms.append(t)

    search_terms = terms[:6]
    if not search_terms:
        search_terms = [cleaned_query]

    filters = [TranscriptChunk.text.ilike(f"%{term}%") for term in search_terms]

    query_stmt = (
        db.query(
            TranscriptChunk,
            Meeting.title.label("meeting_title"),
            Meeting.created_at.label("meeting_created_at"),
        )
        .join(Meeting, TranscriptChunk.meeting_id == Meeting.id)
        .filter(TranscriptChunk.user_id == user_id)
        .filter(or_(*filters))
        .order_by(TranscriptChunk.id.desc())
        .limit(limit)
    )

    results = query_stmt.all()
    output = []
    for chunk, meeting_title, meeting_created_at in results:
        output.append({
            "chunk_id": chunk.id,
            "meeting_id": chunk.meeting_id,
            "meeting_title": meeting_title,
            "meeting_date": meeting_created_at,
            "start_time": chunk.start_time,
            "end_time": chunk.end_time,
            "text": chunk.text,
            "similarity_score": 1.0,
        })
    return output


def hybrid_search_chunks(
    db: Session,
    user_id: int,
    query: str,
    semantic_limit: int = 8,
    keyword_limit: int = 8,
) -> List[Dict[str, Any]]:
    """
    Runs semantic search (top 6-8 chunks) + keyword match (ILIKE) on chunk text,
    merges them removing duplicates, and sorts the final chunks by meeting date
    and start_time so the model can observe chronological progression.
    """
    from datetime import datetime, timezone

    semantic_results = search_transcript_chunks(
        db=db,
        user_id=user_id,
        query=query,
        limit=semantic_limit,
    )
    keyword_results = keyword_search_chunks(
        db=db,
        user_id=user_id,
        query=query,
        limit=keyword_limit,
    )

    seen_ids = set()
    merged = []

    for item in semantic_results:
        cid = item.get("chunk_id")
        if cid is not None:
            if cid not in seen_ids:
                seen_ids.add(cid)
                merged.append(item)
        else:
            merged.append(item)

    for item in keyword_results:
        cid = item.get("chunk_id")
        if cid is not None:
            if cid not in seen_ids:
                seen_ids.add(cid)
                merged.append(item)
        else:
            merged.append(item)

    def sort_key(item):
        dt = item.get("meeting_date")
        if dt is None:
            dt = datetime.min
        if hasattr(dt, "tzinfo") and dt.tzinfo is not None:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return (dt, float(item.get("start_time", 0.0)))

    merged.sort(key=sort_key)
    return merged
