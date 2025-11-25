# Fix Supabase RLS (Row-Level Security) Error

You're getting a "new row violates row-level security policy" error. Here's how to fix it:

## Option 1: Create a Public Upload Policy (Recommended)

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/osotvxgsxeyajghjxqgr
2. Click **Storage** in the left sidebar
3. Click on the **`audio-files`** bucket
4. Click on the **Policies** tab
5. Click **New Policy**
6. Choose **"For full customization"**
7. Name it: `Allow public uploads`
8. Use this SQL:

```sql
-- Allow anyone to upload files
INSERT INTO storage.objects (bucket_id, name, owner, metadata)
SELECT 'audio-files', name, auth.uid(), metadata
FROM (SELECT name, metadata) AS new_object
WHERE true;

-- Allow anyone to read files
SELECT * FROM storage.objects
WHERE bucket_id = 'audio-files';
```

Or use the simpler approach:

**For INSERT (Upload):**
- Policy name: `Allow public uploads`
- Allowed operation: `INSERT`
- Policy definition:
```sql
true
```

**For SELECT (Read):**
- Policy name: `Allow public reads`
- Allowed operation: `SELECT`
- Policy definition:
```sql
true
```

## Option 2: Disable RLS (Less Secure)

1. Go to **Storage** → **`audio-files`** bucket
2. Click **Settings**
3. Toggle off **"Enable RLS"** (not recommended for production)

## Quick Fix (Easiest)

1. Go to Storage → `audio-files` bucket → Policies
2. Click **New Policy** → **"For full customization"**
3. Name: `Public access`
4. Allowed operation: `ALL` (or select both INSERT and SELECT)
5. Policy definition: `true`
6. Click **Review** → **Save policy**

This will allow anyone to upload and read files from the bucket.


