-- Supabase Database Migration for Worlds Studio
-- Run this SQL in your Supabase SQL Editor to create the necessary tables

-- Create worlds table
CREATE TABLE IF NOT EXISTS worlds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  author TEXT DEFAULT '',
  eleven_labs_voice_id TEXT DEFAULT '',
  hey_gen_avatar_id TEXT DEFAULT '',
  system_prompt TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  chapter_title TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  script TEXT DEFAULT '',
  audio_url TEXT,
  hey_gen_video_id TEXT,
  hey_gen_status TEXT DEFAULT 'pending' CHECK (hey_gen_status IN ('pending', 'processing', 'completed', 'failed')),
  avatar_id TEXT DEFAULT '',
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_videos_world_id ON videos(world_id);
CREATE INDEX IF NOT EXISTS idx_videos_hey_gen_status ON videos(hey_gen_status);
CREATE INDEX IF NOT EXISTS idx_worlds_created_at ON worlds(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_worlds_updated_at BEFORE UPDATE ON worlds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE worlds ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read/write access
-- NOTE: For production, you should restrict these based on authentication
-- For now, we'll allow public access for development

-- Worlds policies
CREATE POLICY "Allow public read access on worlds" ON worlds
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on worlds" ON worlds
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on worlds" ON worlds
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on worlds" ON worlds
  FOR DELETE USING (true);

-- Videos policies
CREATE POLICY "Allow public read access on videos" ON videos
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on videos" ON videos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on videos" ON videos
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on videos" ON videos
  FOR DELETE USING (true);

