-- Messaging Revamp Migration
-- Adds: role ENUM, last_active_at, read_at, indexes, unique constraint on conversations

-- Step 1: Add CHECK constraint for role (keeping as TEXT but with validation)
-- Note: Design doc says ENUM('owner','petpal','both') but codebase uses 'dog_owner', 'dog_sitter', 'both'
-- We'll use the existing values and add a CHECK constraint
ALTER TABLE "public"."profiles" 
  ADD CONSTRAINT "profiles_role_check" 
  CHECK ("role" IS NULL OR "role" = ANY (ARRAY['owner'::text, 'petpal'::text, 'both'::text, 'dog_owner'::text, 'dog_sitter'::text]));

-- Step 2: Add last_active_at to profiles
ALTER TABLE "public"."profiles" 
  ADD COLUMN IF NOT EXISTS "last_active_at" timestamp with time zone;

-- Step 3: Add read_at to messages
ALTER TABLE "public"."messages" 
  ADD COLUMN IF NOT EXISTS "read_at" timestamp with time zone;

-- Step 4: Add index on messages(conversation_id, created_at desc) for efficient pagination
CREATE INDEX IF NOT EXISTS "idx_messages_conversation_created_desc" 
  ON "public"."messages" ("conversation_id", "created_at" DESC)
  WHERE "conversation_id" IS NOT NULL;

-- Step 5: Add index on messages for read_at queries
CREATE INDEX IF NOT EXISTS "idx_messages_read_at" 
  ON "public"."messages" ("read_at")
  WHERE "read_at" IS NOT NULL;

-- Step 6: Add index on profiles for last_active_at queries
CREATE INDEX IF NOT EXISTS "idx_profiles_last_active_at" 
  ON "public"."profiles" ("last_active_at")
  WHERE "last_active_at" IS NOT NULL;

-- Step 7: Drop old unique constraint on conversations (participant1_id, participant2_id, availability_id)
ALTER TABLE "public"."conversations" 
  DROP CONSTRAINT IF EXISTS "conversations_participant1_id_participant2_id_availability__key";

-- Step 8: Add unique index on conversations for one conversation per user pair
-- Uses canonical ordering (min id = participant1, max id = participant2)
-- This will be enforced after data normalization in the backfill script
CREATE UNIQUE INDEX IF NOT EXISTS "conversations_participants_unique" 
  ON "public"."conversations" (
    LEAST("participant1_id", "participant2_id"), 
    GREATEST("participant1_id", "participant2_id")
  )
  WHERE "availability_id" IS NULL; -- Only enforce for profile-based conversations initially

-- Note: The backfill script will normalize participant order and merge conversations

-- Step 9: Add comment for documentation
COMMENT ON COLUMN "public"."profiles"."last_active_at" IS 'Timestamp of last user activity for presence indicators';
COMMENT ON COLUMN "public"."messages"."read_at" IS 'Timestamp when message was read by recipient';
COMMENT ON COLUMN "public"."profiles"."role" IS 'User role: owner, petpal, both, dog_owner, or dog_sitter (nullable)';

