-- Migration: Add 3-angle support for author images and video angles
-- Run this in your Supabase SQL Editor to update existing tables

-- Add 3 image key columns to worlds table (if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'worlds' AND column_name = 'hey_gen_image_key_1') THEN
    ALTER TABLE worlds ADD COLUMN hey_gen_image_key_1 TEXT DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'worlds' AND column_name = 'hey_gen_image_key_2') THEN
    ALTER TABLE worlds ADD COLUMN hey_gen_image_key_2 TEXT DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'worlds' AND column_name = 'hey_gen_image_key_3') THEN
    ALTER TABLE worlds ADD COLUMN hey_gen_image_key_3 TEXT DEFAULT '';
  END IF;
END $$;

-- Add angle column to videos table (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'videos' AND column_name = 'angle') THEN
    ALTER TABLE videos ADD COLUMN angle INTEGER DEFAULT 1;
    
    -- Add check constraint for angle values (1, 2, or 3)
    ALTER TABLE videos ADD CONSTRAINT videos_angle_check CHECK (angle IN (1, 2, 3));
  END IF;
END $$;

-- Update existing videos to have angle = 1 (default)
UPDATE videos SET angle = 1 WHERE angle IS NULL;

-- Optional: Migrate existing hey_gen_image_key to hey_gen_image_key_1 for backward compatibility
-- Uncomment the line below if you want to copy existing image keys to angle 1
-- UPDATE worlds SET hey_gen_image_key_1 = hey_gen_image_key WHERE hey_gen_image_key IS NOT NULL AND hey_gen_image_key != '' AND (hey_gen_image_key_1 IS NULL OR hey_gen_image_key_1 = '');

