-- Migration: Add can_pick_up_drop_off column to availability table
-- Run this in your Supabase SQL Editor

-- Add the column if it doesn't exist
ALTER TABLE availability ADD COLUMN IF NOT EXISTS can_pick_up_drop_off BOOLEAN DEFAULT false;

-- Add comment to describe the column
COMMENT ON COLUMN availability.can_pick_up_drop_off IS 'Whether the user can pick up or drop off the dog';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'availability' AND column_name = 'can_pick_up_drop_off';
