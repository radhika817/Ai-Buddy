# 🤖 AI Buddy for Virtual Meetings

> **An AI-powered meeting assistant that listens, understands, remembers, and helps teams take action.**

AI Buddy is an intelligent virtual meeting assistant designed to transform unstructured meeting conversations into **structured, actionable knowledge**.

It uses **Speech-to-Text, Large Language Models, RAG, Speaker Diarization, and Agentic AI** to automatically understand meetings, extract important information, track tasks and decisions, and answer questions using knowledge from previous meetings.

---

## 🌟 Vision

Meetings generate a huge amount of information, but important details are often forgotten after the meeting ends.

AI Buddy aims to solve this problem by creating a **long-term memory for meetings**.

Instead of simply generating a summary, AI Buddy can understand:

- What was discussed?
- Who said what?
- What decisions were made?
- What tasks were assigned?
- Who is responsible?
- What are the deadlines?
- What issues are still unresolved?
- What happened in previous meetings?
- How has a decision changed over time?

### Core Idea

```text
        🎙️ MEETING
             │
             ▼
      Speech-to-Text
             │
             ▼
     Speaker Identification
             │
             ▼
       AI Understanding
             │
      ┌──────┼────────┐
      ▼      ▼        ▼
   Summary  Tasks  Decisions
      │      │        │
      └──────┼────────┘
             ▼
       Meeting Memory
             │
             ▼
       🤖 AI Assistant
             │
      ┌──────┼──────────┐
      ▼      ▼          ▼
     Q&A  Follow-ups  Analytics
```

---

# ✨ Features

## 🎙️ 1. Meeting Capture & Transcription

- Upload meeting audio/video
- Speech-to-text conversion
- Timestamped transcript
- Searchable transcript
- Multiple audio formats
- Multilingual transcription
- Transcript download
- Transcript correction/editing

### Planned

- Real-time transcription
- Live meeting recording
- Noise reduction
- Overlapping speech detection

---

## 👥 2. Speaker Identification

AI Buddy identifies different speakers in a meeting.

Example:

```text
00:02:31 — Radhika:
We need to complete the backend by Friday.

00:02:42 — Atharva:
I'll take responsibility for it.
```

Features:

- Speaker diarization
- Speaker labels
- Speaking-time analysis
- Participant identification
- Speaker timeline
- Participation statistics

---

# 🧠 3. AI Meeting Understanding

AI analyzes the transcript and extracts meaningful information.

### 📝 Automatic Summary

Generate:

- Short summary
- Detailed summary
- Topic-wise summary
- Key discussion points

### 📌 Important Information

Detect:

- Important statements
- Agreements
- Disagreements
- Questions
- Announcements
- Key discussion points

---

# ✅ 4. Action Item Extraction

AI automatically detects tasks assigned during meetings.

Example:

```text
Conversation:

"Radhika, please complete the UI testing by Friday."

             ↓

AI Buddy

Task:
Complete UI testing

Assigned To:
Radhika

Deadline:
Friday

Status:
Pending
```

Features:

- Automatic task extraction
- Task assignment
- Deadline detection
- Priority detection
- Task status
- Completed/pending/overdue tracking
- Task history
- Reminders

---

# 📌 5. Decision Tracking

AI Buddy automatically identifies important decisions.

Example:

```text
Decision:
Use PostgreSQL for the project database.

Meeting:
Database Discussion

Participants:
Radhika, Atharva, Tejas

Timestamp:
23:41
```

Features:

- Decision extraction
- Decision history
- Decision timestamp
- Reason behind decision
- Alternatives discussed
- Decision status

### 🔄 Decision Evolution

AI Buddy can track how decisions change over multiple meetings.

```text
Meeting 1
    ↓
MongoDB discussed
    ↓
Meeting 4
    ↓
Performance issues discussed
    ↓
Meeting 6
    ↓
PostgreSQL selected
```

---

# ⏰ 6. Deadline Detection

AI detects deadlines mentioned naturally during conversations.

Examples:

> "I'll finish it tomorrow."

> "The API needs to be ready by October 2."

AI converts them into structured information:

```text
Task:
Finish API

Owner:
Atharva

Deadline:
October 2

Status:
Pending
```

---

# ❓ 7. Unresolved Issues

AI identifies topics that are still pending.

Example:

```text
Unresolved Issue

Issue:
Payment integration approach

Status:
Open

First Discussed:
Meeting #7

Last Discussed:
Meeting #9
```

This helps teams avoid repeatedly forgetting unresolved problems.

---

# 💬 8. AI Meeting Q&A

Users can ask questions about their meetings using natural language.

Examples:

```text
"What did we decide about the database?"

"Who is responsible for deployment?"

"What tasks were assigned to me?"

"What problems are still unresolved?"

"When is the API deadline?"

"What did we discuss in the previous meeting?"
```

AI Buddy retrieves relevant meeting information and generates an answer based on the available meeting knowledge.

---

# 🧠 9. Meeting Memory

AI Buddy maintains a searchable memory of previous meetings.

```text
Meeting 1
    │
Meeting 2
    │
Meeting 3
    │
Meeting 4
    │
    ▼
Meeting Memory
    │
    ▼
Semantic Search
    │
    ▼
AI Answer
```

Users can ask questions across multiple meetings.

### Example

> "What did we decide about the backend deployment over the last three meetings?"

AI Buddy retrieves relevant information from multiple meetings and provides a contextual answer.

---

# 🔍 10. RAG-Based Knowledge Retrieval

AI Buddy uses **Retrieval-Augmented Generation (RAG)** for meeting memory.

```text
Meeting Transcript
        ↓
     Chunking
        ↓
    Embeddings
        ↓
 PostgreSQL + pgvector
        ↓
 Semantic Search
        ↓
Relevant Context
        ↓
      LLM
        ↓
     Answer
```

This allows the system to answer questions based on stored meeting information instead of relying only on the model's general knowledge.

---

# 📧 11. Follow-up Generation

After a meeting, AI Buddy can generate follow-up messages.

Example:

```text
Subject:
Project Discussion — Meeting Follow-up

Summary:
The team discussed the backend deployment...

Decisions:
• PostgreSQL will be used.
• Backend will be deployed on Render.

Action Items:
• Radhika — UI testing
• Atharva — API fixes

Deadlines:
• API fixes — October 2
```

Planned integrations:

- Gmail
- Microsoft Outlook
- Slack
- Microsoft Teams

Users can review generated messages before sending them.

---

# 📊 12. Meeting Analytics

AI Buddy provides analytics about meetings.

### Meeting Metrics

- Meeting duration
- Number of participants
- Number of topics
- Number of decisions
- Number of tasks
- Number of unresolved issues

### Participation Analytics

```text
Speaker       Speaking Time

Radhika       32%
Atharva       28%
Tejas         25%
Manas         15%
```

### Task Analytics

```text
Total Tasks       8
Completed         5
Pending           2
Overdue           1
```

---

# 🔄 13. Meeting Comparison

Compare information across meetings.

Example:

> "What changed since our previous meeting?"

AI Buddy can identify:

```text
New Topics
New Decisions
Completed Tasks
Pending Tasks
Resolved Issues
New Issues
Changed Decisions
```

---

# 📅 14. Pre-Meeting Intelligence

AI Buddy can help users **before** a meeting.

Generate a meeting briefing using previous meeting information.

```text
Upcoming Meeting
       ↓
Previous Meeting
       ↓
Pending Tasks
       ↓
Unresolved Issues
       ↓
Previous Decisions
       ↓
Suggested Agenda
```

Example:

### Meeting Brief

```text
Previous Meeting:
Project Review

Pending Tasks:
3

Unresolved Issues:
2

Previous Decisions:
4

Suggested Discussion:
1. Review pending tasks
2. Resolve database issue
3. Finalize deployment
```

---

# 🤖 15. Agentic AI

AI Buddy uses specialized AI agents instead of relying on a single AI operation.

```text
                    Meeting
                       │
                       ▼
                 Orchestrator
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   Summary Agent   Task Agent   Decision Agent
        │              │              │
        └──────────────┼──────────────┘
                       ▼
                 Memory Agent
                       │
                       ▼
                   Q&A Agent
                       │
                       ▼
                Follow-up Agent
```

### Planned Agents

| Agent | Responsibility |
|---|---|
| 📝 Summary Agent | Generates meeting summaries |
| ✅ Task Agent | Extracts and tracks tasks |
| 📌 Decision Agent | Identifies decisions |
| ⏰ Deadline Agent | Detects deadlines |
| ❓ Issue Agent | Detects unresolved issues |
| 🧠 Memory Agent | Stores/retrieves meeting knowledge |
| 💬 Q&A Agent | Answers meeting questions |
| 📧 Follow-up Agent | Generates follow-up messages |
| 📊 Analytics Agent | Generates meeting analytics |

---

# 🏗️ System Architecture

```text
                         ┌─────────────────┐
                         │     React UI    │
                         │ React + Vite    │
                         └────────┬────────┘
                                  │
                              REST API
                                  │
                         ┌────────▼────────┐
                         │     FastAPI     │
                         │     Backend     │
                         └────────┬────────┘
                                  │
                 ┌────────────────┼────────────────┐
                 │                │                │
                 ▼                ▼                ▼
          Speech Processing     LLM          Agent System
                 │                │                │
              Whisper        OpenAI API       LangGraph
                 │                │                │
                 └────────────────┼────────────────┘
                                  │
                         ┌────────▼────────┐
                         │  RAG / Memory   │
                         │                 │
                         │ PostgreSQL      │
                         │ + pgvector      │
                         └────────┬────────┘
                                  │
                         ┌────────▼────────┐
                         │ File Storage    │
                         │ S3 / Cloudinary │
                         └─────────────────┘
```

---

# 🛠️ Tech Stack

## Frontend

- React
- Vite
- Tailwind CSS
- Recharts
- Axios
- React Router

## Backend

- Python
- FastAPI
- Pydantic
- REST APIs
- WebSockets

## AI / ML

- OpenAI API
- Whisper
- Speaker Diarization
- pyannote.audio
- Embeddings
- NLP

## Agentic AI

- LangGraph
- LangChain ecosystem

## Database

- PostgreSQL
- pgvector

## Storage

- AWS S3 / Cloudinary

## Authentication

- JWT
- Password hashing

## Integrations

- Google Calendar API
- Gmail API
- Microsoft Graph API
- Slack API

## Deployment

- Vercel — Frontend
- Render — Backend
- Supabase / Neon — PostgreSQL
- AWS S3 / Cloudinary — Storage

## Development

- Git
- GitHub
- VS Code
- Postman
- Docker

---

# 📂 Proposed Project Structure

```text
ai-buddy/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── context/
│   │   └── utils/
│   │
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── agents/
│   │   ├── rag/
│   │   ├── ai/
│   │   ├── middleware/
│   │   └── utils/
│   │
│   ├── tests/
│   ├── requirements.txt
│   └── main.py
│
├── docs/
│
├── .env.example
├── .gitignore
└── README.md
```

---

# 🚀 Development Roadmap

## Phase 1 — MVP

- [ ] User authentication
- [ ] Meeting upload
- [ ] Audio extraction
- [ ] Speech-to-text
- [ ] Transcript display
- [ ] Basic AI summary

## Phase 2 — Meeting Intelligence

- [ ] Speaker diarization
- [ ] Action-item extraction
- [ ] Decision extraction
- [ ] Deadline detection
- [ ] Unresolved issue detection
- [ ] Meeting analytics

## Phase 3 — Meeting Memory

- [ ] PostgreSQL integration
- [ ] Embeddings
- [ ] pgvector
- [ ] Semantic search
- [ ] RAG pipeline
- [ ] Cross-meeting Q&A

## Phase 4 — Agentic AI

- [ ] LangGraph integration
- [ ] Summary Agent
- [ ] Task Agent
- [ ] Decision Agent
- [ ] Memory Agent
- [ ] Q&A Agent
- [ ] Follow-up Agent
- [ ] Agent orchestration

## Phase 5 — Advanced Features

- [ ] Real-time transcription
- [ ] Live meeting assistant
- [ ] Calendar integration
- [ ] Email integration
- [ ] Meeting comparison
- [ ] Pre-meeting briefing
- [ ] Task reminders
- [ ] Advanced analytics

## Phase 6 — Production

- [ ] Dockerization
- [ ] CI/CD
- [ ] Production deployment
- [ ] Security improvements
- [ ] Rate limiting
- [ ] Logging and monitoring
- [ ] Performance optimization
- [ ] Automated testing

---

# 🔐 Security & Privacy

AI Buddy may process potentially sensitive meeting information.

The system is designed with:

- Secure authentication
- Password hashing
- JWT-based authorization
- Role-based access control
- Protected APIs
- Secure file storage
- Database access controls
- User-controlled meeting deletion
- Environment-based secret management

Sensitive API keys and credentials should never be committed to GitHub.

---

# 🎯 Project Goals

The main goals of AI Buddy are:

1. Reduce the effort required to take meeting notes.
2. Convert conversations into structured information.
3. Automatically track tasks and deadlines.
4. Preserve important decisions.
5. Make previous meetings searchable.
6. Provide contextual answers about meetings.
7. Reduce information loss between meetings.
8. Demonstrate practical applications of Agentic AI and RAG.

---

# 💡 Future Scope

Potential future improvements include:

- Real-time meeting participation
- Zoom integration
- Google Meet integration
- Microsoft Teams integration
- Mobile application
- Voice-based AI assistant
- Personalized meeting recommendations
- Advanced knowledge graphs
- Organization-wide meeting intelligence
- Automated project status generation
- AI-generated project reports

---

# 👩‍💻 Development Philosophy

AI Buddy will be developed incrementally.

Rather than attempting to implement every feature simultaneously, development will follow:

```text
MVP
 ↓
Meeting Intelligence
 ↓
Persistent Memory
 ↓
RAG
 ↓
Agentic AI
 ↓
Real-time Assistant
 ↓
Production System
```

Each phase should produce a working version before moving to the next phase.

---

# 📜 License

This project is currently developed for educational, research, and portfolio purposes.

License information will be added as the project progresses.

---

# ⭐ Project Vision

> **AI Buddy is not just a meeting summarizer.**
>
> **It is an intelligent meeting memory and action system that understands conversations, remembers decisions, tracks responsibilities, and helps teams follow through.**

---

## 🚧 Project Status

**Status:** 🟡 Planning / Initial Development

The project is currently being designed and will be developed incrementally.

### Current Focus

```text
✅ Project architecture
✅ Feature planning
⬜ Frontend setup
⬜ Backend setup
⬜ Meeting upload
⬜ Speech-to-text
⬜ Transcript generation
⬜ AI summarization
```

---

## 🤝 Contributors

Contributors will be added as the project develops.

---

## ⭐ If you find this project interesting

Consider giving the repository a ⭐ and following the development journey.
