# Railway Deployment Guide - Single Service

This guide shows how to deploy both frontend and backend to Railway as **one service** from a single repository.

## Architecture

- **Single Railway Service**: Serves both the Express backend API and the React frontend
- **Backend**: Handles API routes (`/api/*`)
- **Frontend**: Served as static files from `/dist` directory
- **Build Process**: Railway builds the frontend, then starts the server

## Step-by-Step Deployment

### 1. Push Code to GitHub

Make sure your code is pushed to a GitHub repository.

### 2. Create Railway Project

1. Go to https://railway.app
2. Sign up or log in
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose your repository

### 3. Configure Railway Service

Railway will auto-detect your project. Configure it:

1. **Go to Settings** → **Service**
2. **Build Command**: `npm run build:all` (or Railway will auto-detect)
3. **Start Command**: `npm start` (or `NODE_ENV=production node server.js`)
4. **Root Directory**: Leave as `.` (root)

### 4. Add Environment Variables

Go to **Variables** tab and add:

```env
# Port (Railway sets this automatically, but you can override)
PORT=3001

# API Keys (set both prefixed and non-prefixed for server and client)
HEYGEN_API_KEY=your_heygen_api_key
VITE_HEYGEN_API_KEY=your_heygen_api_key
OPENAI_API_KEY=your_openai_api_key
VITE_OPENAI_API_KEY=your_openai_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Supabase (REQUIRED: set both prefixed and non-prefixed)
# - Non-prefixed (SUPABASE_URL) → Used by Node.js server at runtime
# - Prefixed (VITE_SUPABASE_URL) → Used by Vite during build for client bundle
SUPABASE_URL=https://osotvxgsxeyajghjxqgr.supabase.co
VITE_SUPABASE_URL=https://osotvxgsxeyajghjxqgr.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# CORS (optional - only if you need to allow specific origins)
# ALLOWED_ORIGINS=https://your-custom-domain.com
```

**Important Notes:**
- Railway automatically provides `PORT` - you don't need to set it
- **Set BOTH prefixed (`VITE_*`) and non-prefixed versions** of each variable:
  - Non-prefixed (e.g., `SUPABASE_URL`) → Used by the Node.js server at runtime
  - Prefixed (e.g., `VITE_SUPABASE_URL`) → Used by Vite during build to inject into client bundle
- The frontend will use relative URLs in production (same domain), so no `VITE_API_URL` needed

### 5. Deploy

1. Railway will automatically:
   - Install dependencies (`npm install`)
   - Build the frontend (`npm run build:all`)
   - Start the server (`npm start`)
2. Wait for deployment to complete
3. Railway will provide a URL like: `https://your-app.up.railway.app`

### 6. Test Your Deployment

1. Visit the Railway URL - you should see your React app
2. Test creating a world
3. Test creating a video
4. Check Railway logs for any errors

## How It Works

1. **Build Phase**: Railway runs `npm run build:all` which builds the React app to `dist/`
2. **Start Phase**: Railway runs `npm start` which starts the Express server
3. **Server**: 
   - API routes (`/api/*`) are handled by Express
   - All other routes serve the React app from `dist/`
   - React Router handles client-side routing

## Custom Domain (Optional)

1. In Railway dashboard, go to your service
2. Click **Settings** → **Networking**
3. Add your custom domain
4. Railway will provide DNS instructions

## Troubleshooting

### Frontend not loading
- Check that `dist/` folder exists after build
- Check Railway logs for build errors
- Verify `NODE_ENV=production` is set

### API calls failing
- Check that API routes start with `/api/`
- Check Railway logs for CORS errors
- Verify environment variables are set

### Build fails
- Check Railway build logs
- Make sure all dependencies are in `package.json`
- Verify Node.js version compatibility

### Port errors
- Railway automatically sets `PORT` - don't override it
- Make sure server uses `process.env.PORT`

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Auto-set | Railway provides this automatically |
| `VITE_HEYGEN_API_KEY` | Yes | HeyGen API key |
| `VITE_OPENAI_API_KEY` | Yes | OpenAI API key |
| `VITE_ELEVENLABS_API_KEY` | Yes | ElevenLabs API key |
| `SUPABASE_URL` | Yes | Your Supabase project URL (for server) |
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL (for client build) |
| `SUPABASE_ANON_KEY` | Yes | Your Supabase anon key (for server) |
| `VITE_SUPABASE_ANON_KEY` | Yes | Your Supabase anon key (for client build) |
| `ALLOWED_ORIGINS` | No | Comma-separated list of allowed CORS origins |
| `NODE_ENV` | Auto-set | Set to `production` by Railway |

## Cost

- **Railway Free Tier**: $5 credit/month (usually enough for small apps)
- **Paid Plans**: Start at $5/month for more resources

## Next Steps

After deployment:
1. Test all functionality
2. Set up a custom domain (optional)
3. Monitor Railway logs for errors
4. Set up Railway notifications (optional)

