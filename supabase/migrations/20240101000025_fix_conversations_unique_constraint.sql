-- Fix conversations unique constraint to handle null availability_id
-- The current constraint doesn't work properly with null values

-- Drop the existing unique constraint
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_participant1_id_participant2_id_availability_id_key;

-- Create a new unique constraint that handles null availability_id properly
-- This ensures that for each pair of participants, there can only be one conversation
-- with a specific availability_id, and one general conversation (with null availability_id)
CREATE UNIQUE INDEX conversations_unique_participants_availability 
ON conversations (participant1_id, participant2_id, COALESCE(availability_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Add a comment to explain the constraint
COMMENT ON INDEX conversations_unique_participants_availability IS 'Ensures unique conversations between participants for each availability post or general conversation';
