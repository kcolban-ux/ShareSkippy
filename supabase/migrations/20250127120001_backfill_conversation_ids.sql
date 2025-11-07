-- Backfill conversation_id for legacy messages
-- This script assigns conversation_id to messages that don't have one
-- It creates conversations for unique user pairs and normalizes participant order

DO $$
DECLARE
  message_record RECORD;
  conv_id UUID;
  p1_id UUID;
  p2_id UUID;
  temp_conv_id UUID;
BEGIN
  -- Process messages without conversation_id in batches
  FOR message_record IN 
    SELECT DISTINCT 
      LEAST(sender_id, recipient_id) as p1,
      GREATEST(sender_id, recipient_id) as p2
    FROM messages
    WHERE conversation_id IS NULL
    GROUP BY LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id)
  LOOP
    p1_id := message_record.p1;
    p2_id := message_record.p2;
    
    -- Find or create conversation for this pair (canonical order: p1 < p2)
    SELECT id INTO conv_id
    FROM conversations
    WHERE (participant1_id = p1_id AND participant2_id = p2_id)
       OR (participant1_id = p2_id AND participant2_id = p1_id)
    LIMIT 1;
    
    -- If no conversation exists, create one
    IF conv_id IS NULL THEN
      INSERT INTO conversations (participant1_id, participant2_id, availability_id, last_message_at)
      VALUES (
        p1_id,
        p2_id,
        NULL, -- Profile-based conversations have NULL availability_id
        COALESCE((
          SELECT MAX(created_at)
          FROM messages
          WHERE (sender_id = p1_id AND recipient_id = p2_id)
             OR (sender_id = p2_id AND recipient_id = p1_id)
        ), NOW())
      )
      ON CONFLICT DO NOTHING
      RETURNING id INTO conv_id;
      
      -- If still NULL (conflict), fetch the existing one
      IF conv_id IS NULL THEN
        SELECT id INTO conv_id
        FROM conversations
        WHERE (participant1_id = p1_id AND participant2_id = p2_id)
           OR (participant1_id = p2_id AND participant2_id = p1_id)
        LIMIT 1;
      END IF;
    END IF;
    
    -- Update all messages for this pair to reference the conversation
    UPDATE messages
    SET conversation_id = conv_id
    WHERE conversation_id IS NULL
      AND ((sender_id = p1_id AND recipient_id = p2_id)
        OR (sender_id = p2_id AND recipient_id = p1_id));
    
    -- Update conversation's last_message_at from messages
    UPDATE conversations
    SET last_message_at = (
      SELECT MAX(created_at)
      FROM messages
      WHERE conversation_id = conv_id
    )
    WHERE id = conv_id;
  END LOOP;
  
  -- Normalize all conversations to have participant1_id < participant2_id
  -- This ensures canonical ordering for the unique constraint
  FOR message_record IN
    SELECT id, participant1_id, participant2_id
    FROM conversations
    WHERE participant1_id > participant2_id
  LOOP
    -- Swap participants
    UPDATE conversations
    SET 
      participant1_id = message_record.participant2_id,
      participant2_id = message_record.participant1_id
    WHERE id = message_record.id;
  END LOOP;
  
  -- Merge duplicate conversations for the same user pair
  -- Keep the one with the most recent last_message_at
  FOR message_record IN
    SELECT 
      LEAST(participant1_id, participant2_id) as p1,
      GREATEST(participant1_id, participant2_id) as p2,
      array_agg(id ORDER BY last_message_at DESC) as conv_ids
    FROM conversations
    WHERE availability_id IS NULL
    GROUP BY LEAST(participant1_id, participant2_id), GREATEST(participant1_id, participant2_id)
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the first (most recent) conversation, merge others into it
    conv_id := message_record.conv_ids[1];
    
    -- Update messages from other conversations to point to the kept one
    UPDATE messages
    SET conversation_id = conv_id
    WHERE conversation_id = ANY(message_record.conv_ids[2:])
      AND conversation_id != conv_id;
    
    -- Delete duplicate conversations
    DELETE FROM conversations
    WHERE id = ANY(message_record.conv_ids[2:]);
    
    -- Update last_message_at for the kept conversation
    UPDATE conversations
    SET last_message_at = (
      SELECT MAX(created_at)
      FROM messages
      WHERE conversation_id = conv_id
    )
    WHERE id = conv_id;
  END LOOP;
  
  RAISE NOTICE 'Backfill completed successfully';
END $$;

