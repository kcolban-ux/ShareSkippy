-- Migration script to add support for multiple dogs per availability post
-- Run this script on your existing database to add the new dog_ids field

-- Add the new dog_ids field to the availability table
ALTER TABLE availability ADD COLUMN IF NOT EXISTS dog_ids UUID[] DEFAULT '{}';

-- Update existing posts to populate dog_ids from dog_id
UPDATE availability 
SET dog_ids = ARRAY[dog_id] 
WHERE dog_id IS NOT NULL AND dog_ids = '{}';

-- Create an index on the new field for better query performance
CREATE INDEX IF NOT EXISTS idx_availability_dog_ids ON availability USING GIN (dog_ids);

-- Add a check constraint to ensure at least one dog is specified for dog_available posts
ALTER TABLE availability ADD CONSTRAINT check_dog_available_has_dogs 
CHECK (
  (post_type = 'dog_available' AND (dog_id IS NOT NULL OR array_length(dog_ids, 1) > 0)) OR
  (post_type = 'petpal_available')
);

-- Add default values for existing fields if they don't have them
ALTER TABLE availability ALTER COLUMN enabled_days SET DEFAULT '{}';
ALTER TABLE availability ALTER COLUMN day_schedules SET DEFAULT '{}';
ALTER TABLE availability ALTER COLUMN status SET DEFAULT 'active';

-- Update any NULL values to defaults
UPDATE availability SET enabled_days = '{}' WHERE enabled_days IS NULL;
UPDATE availability SET day_schedules = '{}' WHERE day_schedules IS NULL;
UPDATE availability SET status = 'active' WHERE status IS NULL;

-- Ensure the status check constraint is properly applied
ALTER TABLE availability DROP CONSTRAINT IF EXISTS availability_status_check;
ALTER TABLE availability ADD CONSTRAINT availability_status_check 
CHECK (status IN ('active', 'inactive', 'completed', 'cancelled'));

-- Add created_at and updated_at columns if they don't exist
ALTER TABLE availability ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE availability ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update any NULL timestamps
UPDATE availability SET created_at = NOW() WHERE created_at IS NULL;
UPDATE availability SET updated_at = NOW() WHERE updated_at IS NULL;

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_availability_updated_at ON availability;
CREATE TRIGGER update_availability_updated_at
    BEFORE UPDATE ON availability
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the migration
SELECT 
    'Migration completed successfully' as status,
    COUNT(*) as total_posts,
    COUNT(CASE WHEN dog_ids IS NOT NULL AND array_length(dog_ids, 1) > 0 THEN 1 END) as posts_with_dog_ids,
    COUNT(CASE WHEN dog_id IS NOT NULL THEN 1 END) as posts_with_dog_id
FROM availability;
