# 🎙️ AI Buddy

> Transform meeting recordings into structured transcripts, action items, decisions, and searchable team memory.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20pgvector-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![OpenAI](https://img.shields.io/badge/AI-OpenAI%20%2B%20Whisper-412991?style=flat-square&logo=openai&logoColor=white)](https://openai.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

---

## 📌 Overview

**AI Buddy** is an intelligent virtual meeting assistant designed to capture, organize, and retain knowledge from team discussions. Upload any audio or video recording, and AI Buddy automatically:

- Transcribes audio into **timestamped text** with multilingual detection (English, Hindi, Marathi).
- Extracts **executive summaries**, **key decisions**, and **action items** with assigned owners and deadlines.
- Indexes conversations into **long-term meeting memory** (RAG via `pgvector`), allowing team members to ask questions across past meetings.

---

## ⚡ Key Features

- **Audio & Video Processing**: Upload common formats (`.mp3`, `.mp4`, `.wav`, `.m4a`). Audio extraction and speech-to-text pipeline runs asynchronously in the background.
- **Structured Knowledge Extraction**:
  - **Executive Summaries**: High-level and discussion-point overviews.
  - **Action Items**: Explicit tasks, assigned owners, and detected deadlines.
  - **Decisions Log**: Contextual decisions recorded with timestamps.
- **Meeting Memory & Q&A (RAG)**: Ask questions across historical meetings (e.g., *"What did we decide about the database deployment?"*) with citation links back to specific meetings.
- **Clean Dashboard UI**: Fast, responsive interface to upload files, review meeting notes, edit action items, and search transcript history.

---

## 🏗️ Architecture & Tech Stack

```text
[ User / React App ]
        │
        ▼ (REST API / BackgroundTasks)
[ FastAPI Backend ] ───────► [ PostgreSQL + pgvector ]
        │
        ├──► Local / Cloud Storage (Audio & Video files)
        ├──► Whisper STT (Speech-to-Text conversion)
        └──► LLM Pipeline (OpenAI GPT-4o / GPT-4o-mini)
```

| Component | Technology | Description |
|---|---|---|
| **Frontend** | React, Vite, Tailwind CSS | Dashboard UI, upload flow, transcript viewer, task tracker |
| **Backend** | Python, FastAPI, Pydantic, SQLAlchemy | REST API, background task orchestration |
| **Database** | PostgreSQL (`pgvector`) | Users, meetings, transcripts, action items, vector embeddings |
| **Speech-to-Text** | OpenAI Whisper | High-accuracy transcription with multilingual support |
| **Intelligence** | OpenAI API (GPT-4o / GPT-4o-mini) | Information extraction, task assignment, summarization |
| **Auth** | JWT + bcrypt | Secure password hashing and token-based authentication |

---

## 📂 Project Structure

```text
ai_buddy/
├── backend/                  # FastAPI backend server
│   ├── app/
│   │   ├── api/              # Route handlers (auth, meetings, chat)
│   │   ├── core/             # Config, security, database session
│   │   ├── models/           # SQLAlchemy database models
│   │   ├── schemas/          # Pydantic validation schemas
│   │   └── services/         # STT (Whisper), LLM, and file processing
│   ├── requirements.txt
│   └── main.py
│
├── frontend/                 # React + Vite frontend client
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Dashboard, Meeting Details, Upload, Chat
│   │   └── services/         # API client & auth handlers
│   └── package.json
│
├── docs/                     # Design documentation & diagrams
│   └── SYSTEM_DESIGN.md
│
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & `npm`
- **PostgreSQL** instance (local or hosted on Neon/Supabase)
- **OpenAI API Key**

### 1. Clone the Repository
```bash
git clone https://github.com/radhika817/Ai-Buddy.git
cd Ai-Buddy
```

### 2. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment configuration
cp .env.example .env

# Run FastAPI dev server
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🗺️ Roadmap

- [x] **Project Architecture & Setup**: Repository structure, system design, and database schema planning.
- [ ] **Phase 1 — MVP**:
  - [ ] User authentication (JWT)
  - [ ] Meeting upload & storage
  - [ ] Speech-to-text pipeline (Whisper)
  - [ ] AI summary generation & transcript viewer
- [ ] **Phase 2 — Meeting Intelligence**:
  - [ ] Action item & deadline extraction
  - [ ] Decision tracking
  - [ ] Speaker diarization / labels
- [ ] **Phase 3 — Long-Term Memory (RAG)**:
  - [ ] Chunking & vector embeddings (`pgvector`)
  - [ ] Cross-meeting natural language Q&A
- [ ] **Phase 4 — Integrations & Polish**:
  - [ ] Automated follow-up email drafts
  - [ ] Calendar sync & export options

---

## 👥 Contributors

| Contributor | Role | GitHub |
|---|---|---|
| **Radhika** | Project Lead & Full Stack Architecture | [@radhika817](https://github.com/radhika817) |

