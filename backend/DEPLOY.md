# 🚀 Deploying Backend to Render.com (Free Web Service)

This guide covers deploying the **AI Buddy** FastAPI backend as a Free Web Service on [Render.com](https://render.com).

The Render free tier offers 512 MB RAM and an ephemeral disk. To guarantee zero crashes and instant response times, heavy background processing (Whisper & FFmpeg) and embedding models are switchable via `ENABLE_PROCESSING` and `ENABLE_EMBEDDINGS`.

---

## 📋 Prerequisites
1. A **GitHub account** with this repository: `https://github.com/radhika817/Ai-Buddy`
2. A **Render account** (free tier): [render.com](https://render.com)
3. Your **Neon PostgreSQL connection string**
4. Your **Google Gemini API key** (free tier from [Google AI Studio](https://aistudio.google.com/))

---

## 🛠️ Step-by-Step Deployment Instructions

### Step 1: Create a New Web Service on Render
1. Log in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** in the top right corner and select **Web Service**.
3. Under **Connect a repository**, choose your GitHub repository `radhika817/Ai-Buddy`.
   *(If not visible, click "Configure account" to grant Render access).*

---

### Step 2: Configure Service Settings

Fill in the configuration fields:

| Field | Value | Notes |
|---|---|---|
| **Name** | `ai-buddy-backend` | Or any unique name you prefer |
| **Region** | Select closest to your Neon database region (e.g. *Frankfurt*, *Oregon*, *Ohio*) | Minimizes database network latency |
| **Branch** | `main` | Production branch |
| **Root Directory** | `backend` | **Important**: Points Render directly to the backend folder |
| **Runtime** | `Python 3` | Native Python runtime |
| **Build Command** | `pip install -r requirements.txt` | Installs lightweight production dependencies (no Whisper overhead) |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` | Starts the production ASGI server |
| **Instance Type** | `Free` | Free tier (512 MB RAM, 0.1 CPU) |

---

### Step 3: Configure Environment Variables

Scroll down to the **Environment Variables** section and configure the following keys:

| Key | Value | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | Your Neon PostgreSQL connection string (include `?sslmode=require`) |
| `SECRET_KEY` | `your-secret-key-hex` | Random secret key for session/token signing. *(Generate with `openssl rand -hex 32`)* |
| `GEMINI_API_KEY` | `AIza...` | Your Google Gemini API key for meeting intelligence and Q&A |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` | Your Vercel frontend URL for CORS *(Set `http://localhost:5173` initially, then update once Vercel is deployed)* |
| `ENABLE_PROCESSING` | `false` | **Set to `false` for free Render demo**: Disables heavy audio processing to fit 512MB RAM |
| `ENABLE_EMBEDDINGS` | `false` | **Set to `false` for free Render demo**: Avoids loading ONNX model into memory; searches fall back to keyword matching |

---

### Step 4: Deploy

1. Click **Create Web Service**.
2. Render will build and deploy:
   - Clones repository
   - Installs dependencies from `requirements.txt`
   - Executes `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Automatically initializes database tables, pgvector extension, and column migrations on startup
3. Once the build finishes and shows **"Your service is live 🎉"**, copy your public URL:
   `https://ai-buddy-backend.onrender.com`

---

## 🧪 Verifying the Deployment

Test the live backend using browser or terminal:

```bash
# 1. Health check (reports status and feature flags)
curl https://<YOUR_RENDER_URL>.onrender.com/health
# Response: {"status": "ok", "processing_enabled": false, "embeddings_enabled": false}

# 2. Interactive API documentation
https://<YOUR_RENDER_URL>.onrender.com/docs

# 3. Test demo login
# Seed demo user first using: python scripts/seed_demo.py
```

---

## 📌 Important Notes

1. **Cold Starts (Free Tier)**:
   Render spins down free web services after 15 minutes of inactivity. The first request after idle can take ~30–50 seconds to boot.
2. **Local vs Cloud Processing**:
   - For **full local processing** (Whisper STT + FastEmbed), run locally with `pip install -r requirements-local.txt` and `ENABLE_PROCESSING=true`.
   - In cloud demo mode (`ENABLE_PROCESSING=false`), meeting upload returns a friendly `503` directing users to test pre-seeded meetings or run locally.
3. **CORS Configuration**:
   Once you deploy your frontend to Vercel, copy the Vercel URL (e.g. `https://ai-buddy.vercel.app`), update `FRONTEND_URL` on Render, and save changes.
