# 🚀 Deploying Frontend to Vercel

This guide covers deploying the **AI Buddy** React (Vite) frontend application to [Vercel](https://vercel.com).

---

## 📋 Prerequisites
1. A **GitHub account** with this repository pushed: `https://github.com/radhika817/Ai-Buddy`
2. A **Vercel account**: [vercel.com](https://vercel.com)
3. Your **live backend URL** from Render (e.g., `https://ai-buddy-backend.onrender.com`)

---

## 🛠️ Step-by-Step Deployment Instructions

### Step 1: Import Project on Vercel
1. Log in to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New…** in the top right and select **Project**.
3. Under **Import Git Repository**, find your repository `radhika817/Ai-Buddy` and click **Import**.

---

### Step 2: Configure Project Settings

Configure the build and output settings:

| Setting | Value | Notes |
|---|---|---|
| **Project Name** | `ai-buddy` | Or any unique name you prefer |
| **Framework Preset** | `Vite` | Vercel will usually auto-detect Vite |
| **Root Directory** | `frontend` | **Crucial**: Click **Edit** next to Root Directory, select the `frontend` folder, and click **Continue**. |
| **Build Command** | `npm run build` | Default Vite build command |
| **Output Directory** | `dist` | Default Vite build output folder |
| **Install Command** | `npm install` | Installs dependencies |

---

### Step 3: Configure Environment Variables

Expand the **Environment Variables** accordion and add the following variable:

| Key | Value | Description |
|---|---|---|
| `VITE_API_URL` | `https://<YOUR_RENDER_BACKEND>.onrender.com` | Your live Render backend URL **without** a trailing slash |

> **Note**: Vite bakes environment variables prefixed with `VITE_` into the static JavaScript bundle at build time. Whenever you change `VITE_API_URL`, trigger a redeploy on Vercel.

---

### Step 4: Deploy

1. Click **Deploy**.
2. Vercel will install dependencies, build the production Vite bundle, and deploy the assets to its global Edge network in ~30–45 seconds.
3. Once deployed, you will see a congratulations screen with your live production URL (e.g., `https://ai-buddy-radhika.vercel.app`).

---

## 🔄 Step 5: Post-Deployment Step (Update Backend CORS)

To allow your new Vercel domain to communicate with the Render backend:

1. Copy your live Vercel URL (e.g., `https://ai-buddy-radhika.vercel.app`).
2. Go to your **Render Dashboard** → Select your `ai-buddy-backend` service.
3. Click **Environment** on the left menu.
4. Update the **`FRONTEND_URL`** variable with your Vercel URL:
   ```text
   FRONTEND_URL=https://ai-buddy-radhika.vercel.app
   ```
5. Click **Save Changes**. Render will automatically trigger a zero-downtime redeploy with the updated CORS configuration.

---

## 🧪 Verifying the Live App

1. Open your live Vercel URL in your browser.
2. Sign in with the demo credentials created via `scripts/seed_demo.py` (e.g. `demo@example.com`).
3. The Dashboard will load your meetings directly from the live Render backend.
4. Click **Upload**:
   - In demo mode (`ENABLE_PROCESSING=false`), the Upload page displays a prominent **"Demo Mode Active"** banner informing users that audio processing is disabled in the cloud demo to stay within free-tier limits.
   - If an upload is submitted, a friendly notice banner is displayed stating: *"Uploads and processing are disabled in this demo. Run the project locally to process recordings."*
5. Explore other features:
   - View transcripts, summaries, and decisions on existing meetings.
   - Test the **Tasks** page (`/tasks`) with filters and status toggles.
   - Test **Ask AI Buddy** (`/chat`) for cross-meeting Q&A grounded on meeting memory.

---

## 📌 Troubleshooting Tips

- **Single Page App 404 on Refresh**:
  Client-side routing on page refresh (e.g. `/upload` or `/meetings/1`) is pre-configured via [`vercel.json`](file:///home/radhika/Desktop/ai_buddy/frontend/vercel.json) rewrite rules to serve `index.html`.
- **CORS Error in Browser Console**:
  Make sure `FRONTEND_URL` on Render matches your exact Vercel domain (with `https://` and without trailing slashes).
- **Backend Cold Start**:
  On Render free tier, the first request after 15 minutes of inactivity takes ~30–50 seconds to boot. Give it a moment to respond on first load.
