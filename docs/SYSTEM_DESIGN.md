# AI Buddy — System Design

## 1. Overview & Goal

**AI Buddy** is an AI-powered meeting assistant that converts raw meeting recordings (audio/video) into structured, actionable knowledge:
- Full searchable transcripts
- Executive summaries
- Action items (task, assigned person, deadline, status)
- Key decisions
- Future: Cross-meeting semantic memory and Q&A (RAG)

---

## 2. High-Level Architecture

The system consists of three primary components:

```text
┌───────────────────────┐
│   Frontend (React)    │  Upload page, meeting details, transcripts, tasks, Q&A chat
└──────────┬────────────┘
           │ REST API / WebSocket
           ▼
┌───────────────────────┐
│   Backend (FastAPI)   │  Auth, upload handling, background worker orchestration
└─────┬───────────┬─────┘
      │           │
      ▼           ▼
┌───────────┐  ┌────────────────────────────────────────────────────────┐
│  Storage  │  │ AI Services                                            │
│  (Disk /  │  │  - Whisper / STT (Audio to timestamped text)          │
│   S3)     │  │  - LLM / OpenAI (Summaries, action items, decisions)   │
└───────────┘  └────────────────────────────────────────────────────────┘
      │
      ▼
┌───────────────────────┐
│ Database (PostgreSQL) │  Users, meetings, transcripts, action items, decisions
│    (+ pgvector)       │  (Future: Vector embeddings for meeting memory)
└───────────────────────┘
```

---

## 3. End-to-End Meeting Processing Flow

```text
1. Upload Meeting
   └── User uploads audio/video file via React frontend.
       Backend stores file (local storage / cloud bucket) and marks meeting as "Uploaded".

2. Audio Extraction & Speech-to-Text (STT)
   └── Backend (background task) extracts audio if needed (via ffmpeg).
   └── Audio sent to speech-to-text service (Whisper API / local Whisper).
   └── Generated transcript with timestamps saved to database. Meeting status: "Transcribing".

3. LLM Analysis (Understanding & Extraction)
   └── Transcript sent to LLM with structured JSON output prompts.
   └── Extracts:
       - Summary (key discussion points, overview)
       - Action Items (task, owner, deadline)
       - Decisions made
   └── Meeting status: "Analyzing".

4. Save in Database & Notify User
   └── Summary, action items, and decisions saved to PostgreSQL.
   └── Meeting status updated to "Ready".
   └── Frontend polls or receives status update and displays results.
```

**Lifecycle Statuses:** `Uploaded` → `Transcribing` → `Analyzing` → `Ready` (or `Failed`).

---

## 4. Core Database Schema (PostgreSQL)

| Table | Primary Columns | Description |
|---|---|---|
| **users** | `id`, `email`, `password_hash`, `name`, `created_at` | User account & auth credentials |
| **meetings** | `id`, `user_id`, `title`, `date`, `file_url`, `status`, `summary`, `created_at` | Meeting metadata and high-level summary |
| **transcript_segments** | `id`, `meeting_id`, `speaker`, `start_time`, `end_time`, `text` | Timestamped transcript segments |
| **action_items** | `id`, `meeting_id`, `task`, `assigned_to`, `deadline`, `status` | Detected action items and tracking |
| **decisions** | `id`, `meeting_id`, `decision`, `timestamp` | Key decisions identified in the meeting |

*(Future Phase 3 Table)*:
| Table | Primary Columns | Description |
|---|---|---|
| **chunks** | `id`, `meeting_id`, `text`, `embedding` (vector) | Chunked transcripts with embeddings for semantic search & Q&A |

---

## 5. API Endpoints (Initial)

### Authentication
- `POST /auth/register` — Register a new user
- `POST /auth/login` — Authenticate and receive JWT access token

### Meetings Management
- `POST /meetings` — Upload meeting recording and queue background processing
- `GET /meetings` — List user's meetings
- `GET /meetings/{id}` — Get meeting details and processing status
- `DELETE /meetings/{id}` — Delete meeting and associated data

### Meeting Content
- `GET /meetings/{id}/transcript` — Retrieve transcript segments
- `GET /meetings/{id}/tasks` — Retrieve action items & status
- `POST /chat` *(Phase 3)* — Natural language Q&A across meetings

---

## 6. Development Phases

1. **Phase 1 — MVP**
   - User authentication (JWT)
   - Meeting file upload
   - Speech-to-text pipeline (Whisper)
   - Basic summary generation
   - Meeting details view

2. **Phase 2 — Intelligence**
   - Action items, assigned owners, and deadlines extraction
   - Decisions extraction
   - Speaker diarization / labels

3. **Phase 3 — Meeting Memory (RAG)**
   - Text chunking & vector embeddings
   - PostgreSQL `pgvector` integration
   - Cross-meeting natural language Q&A

4. **Phase 4 — Enhancements**
   - Meeting follow-up email drafts
   - Participation & meeting analytics
   - Agentic workflows (LangGraph)
