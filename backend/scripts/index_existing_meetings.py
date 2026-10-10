#!/usr/bin/env python3
"""
One-time script to index transcripts of existing meetings into pgvector.
Usage:
    python scripts/index_existing_meetings.py [--force] [--meeting-id ID]

Options:
    --force         Reindex meetings even if already marked as indexed.
    --meeting-id    Index only a specific meeting by ID.
"""

import os
import sys
import argparse
import logging

# Ensure backend root is on Python sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.core.database import SessionLocal, engine, Base
from app.models.meeting import Meeting
from app.models.transcript_chunk import TranscriptChunk
from app.services.embedding import index_meeting_transcript, get_embedding_model

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("index_existing_meetings")


def main():
    parser = argparse.ArgumentParser(description="Index existing meeting transcripts for semantic search.")
    parser.add_argument("--force", action="store_true", help="Reindex meetings even if already marked as indexed.")
    parser.add_argument("--meeting-id", type=int, default=None, help="Index only a specific meeting ID.")
    args = parser.parse_args()

    logger.info("Initializing database and models...")
    Base.metadata.create_all(bind=engine)

    logger.info("Pre-warming FastEmbed model...")
    get_embedding_model()

    db = SessionLocal()
    try:
        query = db.query(Meeting).filter(Meeting.status == "ready")
        if args.meeting_id:
            query = query.filter(Meeting.id == args.meeting_id)
        elif not args.force:
            query = query.filter(Meeting.indexed == False)  # noqa: E712

        meetings = query.order_by(Meeting.id.asc()).all()

        if not meetings:
            logger.info("No ready meetings found to index. Everything is already up-to-date!")
            return

        logger.info(f"Found {len(meetings)} meeting(s) to index.")
        total_chunks = 0
        success_count = 0
        failed_count = 0

        for idx, m in enumerate(meetings, start=1):
            logger.info(f"[{idx}/{len(meetings)}] Indexing meeting id={m.id} ('{m.title}')...")
            try:
                chunk_count = index_meeting_transcript(m.id, db)
                total_chunks += chunk_count
                success_count += 1
                logger.info(f"  -> Successfully generated {chunk_count} chunk(s).")
            except Exception as e:
                failed_count += 1
                logger.error(f"  -> Failed to index meeting id={m.id}: {e}")

        logger.info("==========================================")
        logger.info("Semantic Indexing Summary:")
        logger.info(f"  Total meetings processed: {len(meetings)}")
        logger.info(f"  Successfully indexed:     {success_count}")
        logger.info(f"  Failed:                   {failed_count}")
        logger.info(f"  Total chunks created:     {total_chunks}")
        logger.info("==========================================")
    finally:
        db.close()


if __name__ == "__main__":
    main()
