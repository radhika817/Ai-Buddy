# 🚀 Deploying Backend to Render.com

This guide covers deploying the **AI Buddy** FastAPI backend as a Web Service on [Render.com](https://render.com).

---

## 📋 Prerequisites
1. A **GitHub account** with this repository pushed: `https://github.com/radhika817/Ai-Buddy`
2. A **Render account** (free tier works great): [render.com](https://render.com)
3. Your **Neon PostgreSQL connection string**
4. Your **Google Gemini API key** (free tier from Google AI Studio)

---

## 🛠️ Step-by-Step Deployment Instructions

### Step 1: Create a New Web Service on Render
1. Log in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** in the top right corner and select **Web Service**.
3. Under **Connect a repository**, choose your GitHub repository `radhika817/Ai-Buddy`.
   *(If not visible, click "Configure account" to grant Render access to the repository).*

---

### Step 2: Configure Service Settings

Fill in the configuration fields:

| Field | Value | Notes |
|---|---|---|
| **Name** | `ai-buddy-backend` | Or any unique name you prefer |
| **Region** | Select closest to you (e.g. *Frankfurt*, *Oregon*, *Singapore*) | Ideally close to your Neon database region |
| **Branch** | `main` | Production branch |
| **Root Directory** | `backend` | **Important**: Points Render to the backend folder |
| **Runtime** | `Python 3` | Native Python runtime |
| **Build Command** | `pip install -r requirements.txt` | Installs FastAPI, SQLAlchemy, Uvicorn, etc. |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` | Starts the production ASGI server |
| **Instance Type** | `Free` | Free tier (512 MB RAM, 0.1 CPU) |

---

### Step 3: Configure Environment Variables

Scroll down to the **Environment Variables** section and add the following keys:

| Key | Value | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | Your Neon PostgreSQL connection string (including `?sslmode=require`) |
| `SECRET_KEY` | `your-secret-key-hex` | Random secret key for session/token signing. *(Generate with `openssl rand -hex 32`)* |
| `GEMINI_API_KEY` | `AIza...` | Your Google Gemini API key for meeting intelligence and summarization |
| `GEMINI_MODEL` | `gemini-2.5-flash-lite` | (Optional) Flash-Lite model name (defaults to `gemini-2.5-flash-lite`) |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` | Your Vercel frontend URL for CORS. *(You can set `http://localhost:5173` initially and update it once Vercel deploys).* |

---

### Step 4: Deploy

1. Click **Create Web Service**.
2. Render will trigger the first build:
   - Clones repository
   - Installs dependencies from `requirements.txt`
   - Executes `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Creates database tables automatically upon startup
3. Once the build finishes and shows **"Your service is live 🎉"**, copy your public URL:
   `https://ai-buddy-backend.onrender.com`

---

## 🧪 Verifying the Deployment

Test the live backend using browser or terminal:

```bash
# 1. Health check
curl https://<YOUR_RENDER_URL>.onrender.com/health
# Response: {"status": "ok"}

# 2. Interactive Swagger documentation
https://<YOUR_RENDER_URL>.onrender.com/docs

# 3. Meetings endpoint
curl https://<YOUR_RENDER_URL>.onrender.com/meetings
# Response: []
```

---

## 📌 Important Notes

1. **Cold Starts (Free Tier)**:
   Render spins down free web services after 15 minutes of inactivity. The first request after idle can take ~30–50 seconds to boot.
2. **File Storage**:
   Uploaded audio/video files are stored locally in `backend/uploads/` on Render's ephemeral filesystem. In production, persistent cloud storage (AWS S3 or Cloudinary) is recommended for permanent archiving across restarts.
3. **CORS Update**:
   Once you deploy your frontend to Vercel, copy the Vercel URL (e.g. `https://ai-buddy.vercel.app`) and update the `FRONTEND_URL` environment variable on Render, then trigger a quick restart.
