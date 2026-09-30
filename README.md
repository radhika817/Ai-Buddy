# 🎙️ AI Buddy

> Transform meeting recordings into structured transcripts, action items, decisions, and searchable team memory.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Framer Motion](https://img.shields.io/badge/Animations-Framer%20Motion-black?style=flat-square&logo=framer&logoColor=blue)](https://www.framer.com/motion/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20pgvector-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![OpenAI](https://img.shields.io/badge/AI-OpenAI%20%2B%20Whisper-412991?style=flat-square&logo=openai&logoColor=white)](https://openai.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

---

## 📌 Overview

**AI Buddy** is an intelligent meeting assistant and knowledge hub that automatically captures, structures, and retains knowledge from your audio and video team discussions. 

Upload any meeting recording, and AI Buddy handles:
- **Timestamped Transcription**: Multilingual speech recognition powered by OpenAI Whisper.
- **Executive Summaries**: High-level discussion takeaways and concise overview bullets.
- **Action Item Extraction**: Detected tasks, assignees, and target deadlines with interactive completion tracking.
- **Decision Log**: Record key decisions with context and timestamps.
- **Team Memory & Q&A (RAG)**: Ask natural language questions across meeting history with citations back to exact transcript segments.

---

## ✨ Key Features & UI

### 🖥️ Modern Interactive Frontend
- **Dashboard Hub**:
  - Live statistics summary (Total Meetings, Pending Action Items, Logged Decisions, Active Processing jobs).
  - Search and filter meetings by status (`Ready`, `Analyzing`, `Transcribing`).
  - Quick meeting cards with participant tags, duration, date, and progress indicators.
- **Meeting Details View**:
  - **Executive Summary**: Overview and discussion takeaways.
  - **Timestamped Transcript**: Searchable transcript segments with speaker avatars, roles, and precise time codes.
  - **Action Items**: Interactive task tracker allowing completion toggling, assignee badges, and due dates.
  - **Decision Tracker**: Clear list of logged agreements and decisions.
  - **AI Assistant**: Conversational Q&A side-panel for deep-dive questions about the meeting.
- **Upload Flow**:
  - Drag-and-drop file upload for audio/video (`.mp3`, `.mp4`, `.wav`, `.m4a`, `.webm`).
  - Real-time file validation, simulated upload progress bar, and tags input.
- **Auth & Navigation**:
  - Polished Login and Register pages with password toggling and validation.
  - Responsive navigation bar with mobile hamburger menu and status indicators.
  - Smooth route transitions powered by **Framer Motion**.

### ⚙️ Scalable Backend Architecture
- **FastAPI Core**: High-performance asynchronous REST API with CORS support.
- **Database Layer**: SQLAlchemy ORM with PostgreSQL and `pgvector` support for semantic vector search.
- **Modular Services**: Decoupled modules for Speech-to-Text (Whisper), LLM extraction, and file management.

---

## 🏗️ Architecture Diagram

```text
┌────────────────────────────────────────────────────────┐
│             React 19 + Vite Frontend Client            │
│  (Dashboard, Upload, Meeting Viewer, Auth, Navbar)     │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / REST (Axios)
                           ▼
┌────────────────────────────────────────────────────────┐
│                  FastAPI Backend Server                │
│  - REST API & CORS Middleware                          │
│  - BackgroundTasks Orchestration                       │
│  - Pydantic Settings & SQLAlchemy ORM                  │
└────────────┬─────────────────────────────┬─────────────┘
             │                             │
             ▼                             ▼
┌─────────────────────────┐   ┌──────────────────────────┐
             │ Storage & Audio Processing│   │ AI & Extraction Pipeline │
             │ - Local / S3 File Storage │   │ - Whisper STT API        │
             │ - FFmpeg audio extraction │   │ - OpenAI GPT-4o / Mini   │
└─────────────────────────┘   └──────────────────────────┘
             │                             │
             └──────────────┬──────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│                 PostgreSQL + pgvector                  │
│  Users • Meetings • Transcripts • Action Items • RAG   │
└────────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```text
ai_buddy/
├── backend/
│   ├── app/
│   │   ├── api/              # Route handlers (auth, meetings, chat)
│   │   ├── core/             # Configuration, database engine & session
│   │   │   ├── config.py     # Pydantic BaseSettings (.env loading)
│   │   │   └── database.py   # SQLAlchemy session factory & declarative base
│   │   ├── models/           # SQLAlchemy DB models (User, Meeting, Transcript, etc.)
│   │   ├── schemas/          # Pydantic input/output schemas
│   │   └── services/         # STT (Whisper), LLM summarizer, audio extraction
│   ├── main.py               # FastAPI entrypoint, middleware, health check
│   ├── requirements.txt      # Python dependencies (FastAPI, SQLAlchemy, etc.)
│   └── .env.example          # Sample environment variables
│
├── frontend/
│   ├── public/               # Static assets & icons
│   ├── src/
│   │   ├── assets/           # Images & SVGs
│   │   ├── components/       # Reusable components (Navbar, etc.)
│   │   ├── pages/            # Application pages
│   │   │   ├── Dashboard.jsx     # Meeting lists, stats, search & filters
│   │   │   ├── Upload.jsx        # Drag-and-drop file upload & progress
│   │   │   ├── MeetingDetail.jsx # Tabbed summary, transcript, tasks & Q&A
│   │   │   ├── Login.jsx         # Sign in page
│   │   │   └── Register.jsx      # Registration page
│   │   ├── services/         # API clients (Axios instance configured)
│   │   │   └── api.js
│   │   ├── App.jsx           # App shell & Framer Motion animated routes
│   │   ├── main.jsx          # React DOM entrypoint
│   │   └── index.css         # Custom styling, fonts, and dark theme variables
│   ├── package.json          # Node dependencies & build scripts
│   ├── tailwind.config.js    # Custom brand colors, fonts, and glassmorphism
│   ├── vite.config.js        # Vite build configuration
│   └── .env.example          # Sample frontend environment variables
│
├── docs/
│   └── SYSTEM_DESIGN.md      # Detailed system architecture & schema design
│
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & `npm`
- **PostgreSQL** instance (local, Docker, or hosted on Neon/Supabase)
- **OpenAI API Key** (for Whisper STT and GPT summarization)

---

### 1. Clone the Repository
```bash
git clone https://github.com/radhika817/Ai-Buddy.git
cd Ai-Buddy
```

---

### 2. Backend Setup

```bash
cd backend

# Create and activate Python virtual environment
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate

# Install backend dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

Edit `backend/.env` with your credentials:
```ini
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_buddy
SECRET_KEY=your-secure-secret-key-here
OPENAI_API_KEY=sk-...your-openai-api-key...
```

Run the FastAPI development server:
```bash
uvicorn main:app --reload --port 8000
```
- API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/health](http://localhost:8000/health)

---

### 3. Frontend Setup

In a new terminal window:
```bash
cd frontend
  
# Install Node dependencies
npm install

# Configure environment variables
cp .env.example .env
```

Edit `frontend/.env` if using a custom backend port:
```ini
VITE_API_URL=http://localhost:8000
```

Start the Vite development server:
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🗺️ Roadmap & Progress

- [x] **Architecture & System Design**
  - [x] End-to-end pipeline design documented in [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md)
  - [x] Database schema & API specifications drafted
- [x] **Frontend Core UI & Flow**
  - [x] Responsive layout with dark modern theme and Inter typography
  - [x] Navigation bar with active route highlighting and mobile drawer
  - [x] Animated page routing with Framer Motion
  - [x] Dashboard with meeting cards, filter tabs, search, and summary stats
  - [x] Interactive Meeting Detail view (Executive Summary, Searchable Transcript, Action Items, Decisions, AI Q&A)
  - [x] Drag-and-drop Upload flow with progress feedback
  - [x] Login & Register authentication screens
- [ ] **Backend MVP Pipeline**
  - [x] FastAPI base application with CORS & health endpoint
  - [x] SQLAlchemy database configuration & settings management
  - [ ] User authentication & JWT endpoints (`/auth/register`, `/auth/login`)
  - [ ] Meeting recording upload handler (`/meetings`)
  - [ ] Speech-to-text background worker (OpenAI Whisper)
  - [ ] Structured LLM extraction for summaries, action items, and decisions
- [ ] **Phase 3 — Long-Term Memory (RAG)**
  - [ ] Semantic chunking and vector storage with `pgvector`
  - [ ] Cross-meeting search and contextual question answering
- [ ] **Phase 4 — Integrations & Polish**
  - [ ] Email draft generation for meeting recaps
  - [ ] Calendar sync & export to Markdown/PDF

---


