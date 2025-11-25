# Supabase Setup Guide

This guide will help you set up Supabase Storage for hosting audio files that HeyGen can access.

## Steps

1. **Create a Supabase Account**
   - Go to https://supabase.com
   - Sign up for a free account
   - Create a new project

2. **Get Your Supabase Credentials**
   - In your Supabase project dashboard, go to Settings → API
   - Copy your:
     - **Project URL** (looks like: `https://xxxxx.supabase.co`)
     - **anon/public key** (the `anon` key, not the `service_role` key)

3. **Create a Storage Bucket**
   - In your Supabase dashboard, go to Storage
   - Click "New bucket"
   - Name it: `audio-files`
   - Make it **Public** (so HeyGen can access the files)
   - Click "Create bucket"

4. **Set Up Bucket Policies (Optional but Recommended)**
   - Go to Storage → Policies
   - For the `audio-files` bucket, add a policy that allows:
     - **SELECT** (read) for everyone (public)
     - **INSERT** (upload) for authenticated users (or everyone if you want)

5. **Add Environment Variables**
   - Add these to your `.env` file:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

6. **Restart Your Server**
   - Stop your server (Ctrl+C)
   - Run `npm run server` or `npm run dev:all` again

## Testing

Once set up, when you generate a video, the server will:
1. Try to upload audio to Supabase Storage first
2. Fall back to other services if Supabase isn't configured or fails

You should see "Supabase initialized" in your server logs when it starts up.

## Troubleshooting

- **"Supabase not configured" warning**: Make sure your `.env` file has both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- **Upload errors**: Make sure the `audio-files` bucket exists and is set to Public
- **Access denied**: Check your bucket policies allow public read access


