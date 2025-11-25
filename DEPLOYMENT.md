# Deployment Guide for Worlds Studio

This guide covers how to deploy both the frontend (React/Vite) and backend (Express server) to production.

## Architecture Overview

- **Frontend**: React/Vite app (static files)
- **Backend**: Express server (needs to run continuously)
- **Database**: Supabase (already hosted)

## Option 1: Railway (Recommended - Easiest)

Railway can host both frontend and backend easily.

### Deploy Backend to Railway

1. **Sign up**: Go to https://railway.app and sign up
2. **Create new project**: Click "New Project"
3. **Deploy from GitHub**:
   - Connect your GitHub repo
   - Railway will auto-detect it's a Node.js project
4. **Configure as Backend**:
   - In Railway dashboard, go to your service
   - Settings → Add Start Command: `node server.js`
   - Settings → Add Port: `3001` (or use Railway's `$PORT` variable)
5. **Add Environment Variables**:
   ```
   PORT=3001
   VITE_HEYGEN_API_KEY=your_heygen_key
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   VITE_OPENAI_API_KEY=your_openai_key
   VITE_ELEVENLABS_API_KEY=your_elevenlabs_key
   ```
6. **Get Backend URL**: Railway will give you a URL like `https://your-app.railway.app`

### Deploy Frontend to Railway (Separate Service)

1. **Add another service** in the same Railway project
2. **Configure**:
   - Build Command: `npm run build`
   - Start Command: `npx serve -s dist -l 3000`
   - Or use Railway's static file serving
3. **Add Environment Variables**:
   ```
   VITE_API_URL=https://your-backend.railway.app
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   ```

### Update Code for Production

You'll need to update the frontend to use the production backend URL instead of `localhost:3001`.

---

## Option 2: Render (Free Tier Available)

### Deploy Backend to Render

1. **Sign up**: Go to https://render.com
2. **New Web Service**: Connect your GitHub repo
3. **Configure**:
   - **Name**: `worlds-studio-backend`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free (or paid for better performance)
4. **Environment Variables**: Add all the same variables as Railway
5. **Get URL**: Render gives you `https://worlds-studio-backend.onrender.com`

### Deploy Frontend to Render

1. **New Static Site**: In Render dashboard
2. **Configure**:
   - Connect GitHub repo
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
3. **Environment Variables**: Same as frontend above
4. **Get URL**: `https://worlds-studio.onrender.com`

---

## Option 3: Vercel (Frontend) + Railway/Render (Backend)

### Frontend on Vercel

1. **Sign up**: https://vercel.com
2. **Import Project**: Connect GitHub repo
3. **Configure**:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **Environment Variables**: Add all `VITE_*` variables
5. **Deploy**: Vercel auto-deploys

### Backend on Railway or Render

Follow Option 1 or 2 for backend deployment.

---

## Required Code Changes for Production

### 1. Update API URLs in Frontend

The frontend currently uses `http://localhost:3001`. You need to make this configurable:

**Create `src/config.js`:**
```javascript
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

**Update `src/services/heygen.js`:**
- Replace `http://localhost:3001` with `${API_URL}` or use environment variable

### 2. Update CORS in Backend

Make sure your backend allows requests from your frontend domain.

### 3. Update Environment Variables

- Frontend needs: `VITE_API_URL` (backend URL)
- Backend needs: All API keys and Supabase credentials

---

## Environment Variables Checklist

### Frontend (VITE_ prefix required):
```
VITE_API_URL=https://your-backend-url.com
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Backend:
```
PORT=3001 (or use platform's PORT)
VITE_HEYGEN_API_KEY=your_heygen_key
VITE_OPENAI_API_KEY=your_openai_key
VITE_ELEVENLABS_API_KEY=your_elevenlabs_key
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## Quick Start: Railway (Recommended)

1. **Install Railway CLI**: `npm i -g @railway/cli`
2. **Login**: `railway login`
3. **Initialize**: `railway init`
4. **Deploy Backend**: 
   ```bash
   railway up
   ```
5. **Set Environment Variables**: `railway variables`
6. **Get URL**: Railway provides it automatically

For frontend, create a separate Railway service or use Vercel.

---

## Troubleshooting

- **CORS errors**: Make sure backend CORS allows your frontend domain
- **API not found**: Check `VITE_API_URL` is set correctly in frontend
- **Environment variables not working**: Remember `VITE_` prefix for frontend variables
- **Backend not starting**: Check the start command and PORT variable

---

## Recommended Setup

**For simplicity**: Use **Railway** for both frontend and backend
- One platform
- Easy environment variable management
- Good free tier
- Automatic HTTPS

**For best performance**: Use **Vercel** (frontend) + **Railway** (backend)
- Vercel's CDN is excellent for static files
- Railway handles the backend well

