import os
import shutil
import subprocess
import logging
from app.core.database import SessionLocal
from app.models.meeting import Meeting
from app.models.transcript import TranscriptSegment

logger = logging.getLogger(__name__)

# Compatibility patch for PyAV where metadata_errors keyword argument was removed in newer versions
try:
    import av
    _orig_av_open = av.open

    def _safe_av_open(*args, **kwargs):
        kwargs.pop("metadata_errors", None)
        return _orig_av_open(*args, **kwargs)

    av.open = _safe_av_open
except Exception:
    pass

# Base directory for resolving file paths
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

_whisper_model = None


def get_ffmpeg_path() -> str:
    """Finds ffmpeg binary from system PATH or imageio_ffmpeg."""
    path = shutil.which("ffmpeg")
    if path:
        return path
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        pass
    raise RuntimeError("ffmpeg binary not found. Please install ffmpeg.")


def convert_to_wav(input_path: str, output_path: str) -> None:
    """
    Converts audio/video to mono 16kHz 16-bit PCM WAV using ffmpeg.
    """
    ffmpeg_bin = get_ffmpeg_path()
    cmd = [
        ffmpeg_bin,
        "-y",
        "-i", input_path,
        "-ar", "16000",
        "-ac", "1",
        "-c:a", "pcm_s16le",
        output_path,
    ]
    logger.info(f"Running ffmpeg conversion: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error(f"FFmpeg conversion error: {result.stderr}")
        raise RuntimeError(f"FFmpeg conversion failed: {result.stderr[-300:]}")


def get_whisper_model():
    """Lazy-loads and caches faster-whisper base model on CPU using int8 quantization."""
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel
        logger.info("Initializing faster-whisper 'base' model on CPU (compute_type=int8)...")
        _whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
        logger.info("faster-whisper model successfully loaded.")
    return _whisper_model


def process_meeting_transcription(meeting_id: int) -> None:
    """
    Asynchronous background processing worker:
    1. Updates status to 'transcribing'
    2. Converts input audio/video to mono 16kHz WAV
    3. Runs faster-whisper STT
    4. Saves transcript segments to database
    5. Updates status to 'analyzing', then 'ready'
    6. Catches any errors, setting status='failed' and storing error_message
    """
    db = SessionLocal()
    wav_path = None
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            logger.error(f"Meeting {meeting_id} not found for transcription.")
            return

        # 1. Update status to 'transcribing'
        meeting.status = "transcribing"
        meeting.error_message = None
        db.commit()

        # Locate input file
        input_file = os.path.join(BACKEND_DIR, meeting.file_path)
        if not os.path.exists(input_file):
            raise FileNotFoundError(f"Uploaded audio file not found on disk: {input_file}")

        # Intermediate 16kHz WAV file
        base_name, _ = os.path.splitext(input_file)
        wav_path = f"{base_name}_16k.wav"

        # 2. Convert to mono 16kHz WAV
        convert_to_wav(input_file, wav_path)

        # 3. Transcribe with faster-whisper
        model = get_whisper_model()
        segments_generator, info = model.transcribe(wav_path, beam_size=5)

        # 4. Save segments to database
        for seg in segments_generator:
            text = seg.text.strip()
            if text:
                segment_record = TranscriptSegment(
                    meeting_id=meeting.id,
                    start_time=round(seg.start, 2),
                    end_time=round(seg.end, 2),
                    text=text,
                )
                db.add(segment_record)
        db.commit()

        # Clean up intermediate WAV file
        if wav_path and os.path.exists(wav_path) and wav_path != input_file:
            try:
                os.remove(wav_path)
            except Exception as e:
                logger.warning(f"Could not remove temporary WAV file {wav_path}: {e}")

        # 5. Update meeting status to 'analyzing'
        meeting.status = "analyzing"
        db.commit()
        logger.info(f"Meeting {meeting_id} status updated to 'analyzing'. Generating AI summary, action items, and decisions...")

        # If processing is re-run for a meeting, delete its old action items and decisions first to avoid duplicates
        from app.models.action_item import ActionItem
        from app.models.decision import Decision

        db.query(ActionItem).filter(ActionItem.meeting_id == meeting.id).delete()
        db.query(Decision).filter(Decision.meeting_id == meeting.id).delete()
        db.commit()

        # Retrieve saved transcript segments and combine into plain text
        segments = (
            db.query(TranscriptSegment)
            .filter(TranscriptSegment.meeting_id == meeting.id)
            .order_by(TranscriptSegment.start_time.asc())
            .all()
        )
        plain_text = "\n".join(seg.text.strip() for seg in segments if seg.text and seg.text.strip())

        meeting_date_str = meeting.created_at.strftime("%Y-%m-%d %H:%M:%S UTC") if meeting.created_at else ""

        if plain_text.strip():
            from app.services.summarization import analyze_meeting_transcript
            analysis_result = analyze_meeting_transcript(plain_text, meeting_date_str)
            meeting.summary = analysis_result.get("summary")
            meeting.key_points = analysis_result.get("key_points")

            # Save action items
            for item in analysis_result.get("action_items", []):
                action_item_rec = ActionItem(
                    meeting_id=meeting.id,
                    task=item["task"],
                    assigned_to=item.get("assigned_to"),
                    deadline_text=item.get("deadline_text"),
                    status="pending",
                )
                db.add(action_item_rec)

            # Save decisions
            for dec in analysis_result.get("decisions", []):
                decision_rec = Decision(
                    meeting_id=meeting.id,
                    decision=dec,
                )
                db.add(decision_rec)
        else:
            meeting.summary = "No spoken dialogue was detected in the recording to summarize."
            meeting.key_points = ["No dialogue detected in audio recording."]

        # 6. Set status to 'ready'
        meeting.status = "ready"
        db.commit()
        logger.info(f"Meeting {meeting_id} successfully analyzed, summarized, and marked ready.")

    except Exception as e:
        logger.exception(f"Transcription failed for meeting {meeting_id}: {e}")
        db.rollback()
        try:
            failed_meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
            if failed_meeting:
                failed_meeting.status = "failed"
                failed_meeting.error_message = str(e)
                db.commit()
        except Exception as rollback_err:
            logger.error(f"Failed to update error status for meeting {meeting_id}: {rollback_err}")
    finally:
        # Final cleanup safety check
        if wav_path and os.path.exists(wav_path) and wav_path != input_file:
            try:
                os.remove(wav_path)
            except Exception:
                pass
        db.close()
