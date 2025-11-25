# Supabase Database Setup for Worlds Studio

This guide will help you set up Supabase database persistence for Worlds Studio, so your worlds and videos are stored in the cloud instead of just localStorage.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Your Supabase project created

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy your:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (the `anon` key, not the `service_role` key)

## Step 2: Create Database Tables

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of `supabase-migration.sql` into the editor
4. Click **Run** (or press Cmd/Ctrl + Enter)
5. You should see "Success. No rows returned" - this means the tables were created successfully

## Step 3: Verify Tables Were Created

1. Go to **Table Editor** in your Supabase dashboard
2. You should see two tables:
   - `worlds` - stores your book/world configurations
   - `videos` - stores your chapter/video data

## Step 4: Configure Environment Variables

1. Create a `.env` file in the root of your project (if it doesn't exist)
2. Add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

3. **Important**: Restart your development server after adding these variables

## Step 5: Test the Setup

1. Start your development server: `npm run dev:all`
2. Check the browser console - you should see "✅ Supabase client initialized"
3. Create a new world in the app
4. Check your Supabase dashboard → Table Editor → `worlds` table
5. You should see your newly created world!

## How It Works

- **With Supabase configured**: All data is stored in Supabase database
- **Without Supabase configured**: Falls back to localStorage (works offline)
- **Automatic fallback**: If Supabase is unavailable, the app automatically uses localStorage

## Data Migration

If you have existing data in localStorage:

1. The app will continue to use localStorage until you configure Supabase
2. Once Supabase is configured, new data will go to Supabase
3. To migrate existing data:
   - Export your localStorage data (check browser DevTools → Application → Local Storage)
   - Manually import it into Supabase tables, OR
   - Create new worlds/videos in the app (they'll be saved to Supabase)

## Security Notes

⚠️ **Current Setup**: The database policies allow public read/write access for development.

For production, you should:
1. Set up authentication (Supabase Auth)
2. Update RLS policies to restrict access based on user authentication
3. Use service role key only on the server side (never expose it to the client)

## Troubleshooting

### "Supabase not configured" warning
- Make sure `.env` file exists and has both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart your dev server after adding environment variables
- Check that the values don't have extra quotes or spaces

### "Error fetching worlds/videos from Supabase"
- Check that the tables exist in your Supabase dashboard
- Verify your RLS policies allow public access (for development)
- Check the browser console for specific error messages

### Data not appearing in Supabase
- Check the browser console for errors
- Verify your Supabase credentials are correct
- Make sure you ran the migration SQL script

## Next Steps

- Set up authentication for multi-user support
- Configure proper RLS policies for production
- Set up database backups
- Consider adding indexes for better performance on large datasets

