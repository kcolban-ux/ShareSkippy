-- Ensure functions use a deterministic schema lookup.
CREATE OR REPLACE FUNCTION "public"."check_review_needed"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$
DECLARE
  days_old INTEGER;
  other_participant_id UUID;
  current_user_role TEXT;
  other_user_role TEXT;
  availability_post_type TEXT;
BEGIN
  -- Only check for new messages, not updates
  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;
  
  -- Get days since last message in this conversation
  SELECT EXTRACT(DAY FROM (NOW() - c.last_message_at))::INTEGER
  INTO days_old
  FROM conversations c
  WHERE c.id = NEW.conversation_id;
  
  -- If conversation is older than 7 days, check if reviews are needed
  IF days_old >= 7 THEN
    -- Get the other participant
    SELECT 
      CASE 
        WHEN c.participant1_id = NEW.sender_id THEN c.participant2_id
        ELSE c.participant1_id
      END
    INTO other_participant_id
    FROM conversations c
    WHERE c.id = NEW.conversation_id;
    
    -- Get availability post type to determine roles
    SELECT a.post_type
    INTO availability_post_type
    FROM availability a
    WHERE a.id = NEW.availability_id;
    
    -- Determine roles based on post type
    IF availability_post_type = 'dog_available' THEN
      current_user_role := 'walker';
      other_user_role := 'owner';
    ELSE
      current_user_role := 'owner';
      other_user_role := 'walker';
    END IF;
    
    -- Check if review already exists for this user and conversation
    IF NOT EXISTS (
      SELECT 1 FROM reviews 
      WHERE reviewer_id = NEW.sender_id 
        AND conversation_id = NEW.conversation_id
    ) THEN
      -- Insert pending review for sender
      INSERT INTO reviews_pending (
        user_id, 
        conversation_id, 
        other_participant_id, 
        availability_id, 
        role, 
        other_role, 
        days_since_last_message
      ) VALUES (
        NEW.sender_id,
        NEW.conversation_id,
        other_participant_id,
        NEW.availability_id,
        current_user_role,
        other_user_role,
        days_old
      )
      ON CONFLICT (user_id, conversation_id) 
      DO UPDATE SET 
        days_since_last_message = days_old,
        updated_at = NOW();
    END IF;
    
    -- Check if review already exists for the other participant
    IF NOT EXISTS (
      SELECT 1 FROM reviews 
      WHERE reviewer_id = other_participant_id 
        AND conversation_id = NEW.conversation_id
    ) THEN
      -- Insert pending review for other participant
      INSERT INTO reviews_pending (
        user_id, 
        conversation_id, 
        other_participant_id, 
        availability_id, 
        role, 
        other_role, 
        days_since_last_message
      ) VALUES (
        other_participant_id,
        NEW.conversation_id,
        NEW.sender_id,
        NEW.availability_id,
        other_user_role,
        current_user_role,
        days_old
      )
      ON CONFLICT (user_id, conversation_id) 
      DO UPDATE SET 
        days_since_last_message = days_old,
        updated_at = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_review_needed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_pending_review"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$
BEGIN
  -- Remove pending review for the reviewer
  DELETE FROM reviews_pending 
  WHERE user_id = NEW.reviewer_id 
    AND conversation_id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."cleanup_pending_review"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_words"("text_input" "text") RETURNS integer
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
    AS $$
BEGIN
  IF text_input IS NULL OR trim(text_input) = '' THEN
    RETURN 0;
  END IF;
  RETURN array_length(string_to_array(trim(text_input), ' '), 1);
END;
$$;


ALTER FUNCTION "public"."count_words"("text_input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_settings_on_profile_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
    AS $$
BEGIN
  INSERT INTO user_settings (user_id, email_notifications, follow_up_email_sent)
  VALUES (NEW.id, true, false);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_user_settings_on_profile_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pending_reviews_for_user"("user_id" "uuid") RETURNS TABLE("meeting_id" "uuid", "meeting_title" "text", "other_participant_id" "uuid", "other_participant_name" "text", "meeting_end_datetime" timestamp with time zone)
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as meeting_id,
    m.title as meeting_title,
    CASE 
      WHEN m.requester_id = user_id THEN m.recipient_id
      ELSE m.requester_id
    END as other_participant_id,
    CASE 
      WHEN m.requester_id = user_id THEN COALESCE(p_recipient.first_name || ' ' || p_recipient.last_name, p_recipient.email)
      ELSE COALESCE(p_requester.first_name || ' ' || p_requester.last_name, p_requester.email)
    END as other_participant_name,
    m.end_datetime as meeting_end_datetime
  FROM meetings m
  LEFT JOIN profiles p_requester ON m.requester_id = p_requester.id
  LEFT JOIN profiles p_recipient ON m.recipient_id = p_recipient.id
  WHERE m.status = 'completed'
    AND (m.requester_id = user_id OR m.recipient_id = user_id)
    AND m.end_datetime < NOW()  -- Removed 24-hour delay
    AND NOT EXISTS (
      SELECT 1 FROM reviews r 
      WHERE r.meeting_id = m.id 
      AND r.reviewer_id = user_id
    );
END;
$$;


ALTER FUNCTION "public"."get_pending_reviews_for_user"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_average_rating"("user_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
    AS $$
DECLARE
  avg_rating DECIMAL;
BEGIN
  SELECT COALESCE(AVG(rating), 0) INTO avg_rating
  FROM reviews
  WHERE reviewee_id = user_id;
  
  RETURN ROUND(avg_rating, 2);
END;
$$;


ALTER FUNCTION "public"."get_user_average_rating"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_rating_average"("user_uuid" "uuid", "role_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("overall_avg" numeric, "owner_avg" numeric, "walker_avg" numeric, "total_reviews" integer, "owner_reviews" integer, "walker_reviews" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(r.rating)::DECIMAL, 2) as overall_avg,
    ROUND(AVG(CASE WHEN r.reviewed_role = 'owner' THEN r.rating END)::DECIMAL, 2) as owner_avg,
    ROUND(AVG(CASE WHEN r.reviewed_role = 'walker' THEN r.rating END)::DECIMAL, 2) as walker_avg,
    COUNT(*)::INTEGER as total_reviews,
    COUNT(CASE WHEN r.reviewed_role = 'owner' THEN 1 END)::INTEGER as owner_reviews,
    COUNT(CASE WHEN r.reviewed_role = 'walker' THEN 1 END)::INTEGER as walker_reviews
  FROM reviews r
  WHERE r.reviewee_id = user_uuid 
    AND r.status = 'active'
    AND (role_filter IS NULL OR r.reviewed_role = role_filter);
END;
$$;


ALTER FUNCTION "public"."get_user_rating_average"("user_uuid" "uuid", "role_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_review_count"("user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
    AS $$
DECLARE
  review_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO review_count
  FROM reviews
  WHERE reviewee_id = user_id;
  
  RETURN review_count;
END;
$$;


ALTER FUNCTION "public"."get_user_review_count"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_meeting_status_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
    AS $$
BEGIN
  -- Update the updated_at timestamp
  NEW.updated_at = NOW();
  
  -- Log the status change for debugging
  RAISE NOTICE 'Status change: % -> %', OLD.status, NEW.status;
  
  -- If status is being changed to 'scheduled', ensure it was previously 'pending'
  IF NEW.status = 'scheduled' AND OLD.status != 'pending' THEN
    RAISE EXCEPTION 'Meeting can only be scheduled if it was previously pending. Current status: %', OLD.status;
  END IF;
  
  -- If status is being changed to 'completed', ensure it was previously 'scheduled'
  IF NEW.status = 'completed' AND OLD.status != 'scheduled' THEN
    RAISE EXCEPTION 'Meeting can only be completed if it was previously scheduled';
  END IF;
  
  -- Allow cancellation from any status except completed
  IF NEW.status = 'cancelled' AND OLD.status = 'completed' THEN
    RAISE EXCEPTION 'Cannot cancel completed meetings';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_meeting_status_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_deletion_schedule_date"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
    AS $$
BEGIN
  -- Set scheduled deletion date to 30 days from now
  NEW.scheduled_deletion_date = NOW() + INTERVAL '30 days';
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_deletion_schedule_date"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
    AS $$
BEGIN
  UPDATE conversations 
  SET last_message_at = NOW(), updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_deletion_request_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_deletion_request_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_settings_updated_at"() OWNER TO "postgres";


DROP POLICY IF EXISTS "Admins can view all email events" ON "public"."email_events";
DROP POLICY IF EXISTS "Service role can manage email system" ON "public"."email_events";
DROP POLICY IF EXISTS "Users can view their own email events" ON "public"."email_events";

DROP POLICY IF EXISTS "Users can view all active availability posts" ON "public"."availability";
DROP POLICY IF EXISTS "Users can view all availability posts" ON "public"."availability";
DROP POLICY IF EXISTS "Users can view their own availability posts" ON "public"."availability";
DROP POLICY IF EXISTS "Users can create their own availability posts" ON "public"."availability";
DROP POLICY IF EXISTS "Users can delete their own availability posts" ON "public"."availability";
DROP POLICY IF EXISTS "Users can update their own availability posts" ON "public"."availability";

DROP POLICY IF EXISTS "Users can create their own dogs" ON "public"."dogs";
DROP POLICY IF EXISTS "Users can insert their own dogs" ON "public"."dogs";
DROP POLICY IF EXISTS "Users can view dogs in active availability posts" ON "public"."dogs";
DROP POLICY IF EXISTS "Users can view their own dogs" ON "public"."dogs";
DROP POLICY IF EXISTS "Users can delete their own dogs" ON "public"."dogs";
DROP POLICY IF EXISTS "Users can update their own dogs" ON "public"."dogs";
DROP POLICY IF EXISTS "Dashboard users can view dogs" ON "public"."dogs";

DROP POLICY IF EXISTS "Users can create messages" ON "public"."messages";
DROP POLICY IF EXISTS "Users can send messages in conversations they participate in" ON "public"."messages";
DROP POLICY IF EXISTS "Users can view messages in conversations they participate in" ON "public"."messages";
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON "public"."messages";
DROP POLICY IF EXISTS "Users can delete their own messages" ON "public"."messages";
DROP POLICY IF EXISTS "Users can update their own messages" ON "public"."messages";

DROP POLICY IF EXISTS "Allow anonymous read access to profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "Authenticated users can view basic profile info for messaging" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can view their own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can insert their own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can update their own profile" ON "public"."profiles";

DROP POLICY IF EXISTS "Users can view their own profile views" ON "public"."profile_views";
DROP POLICY IF EXISTS "Users can create profile views" ON "public"."profile_views";

DROP POLICY IF EXISTS "Anyone can view active reviews" ON "public"."reviews";
DROP POLICY IF EXISTS "Anyone can view reviews" ON "public"."reviews";
DROP POLICY IF EXISTS "Users can view their own reviews" ON "public"."reviews";
DROP POLICY IF EXISTS "Users can create reviews for their meetings" ON "public"."reviews";
DROP POLICY IF EXISTS "Users can delete their own reviews" ON "public"."reviews";
DROP POLICY IF EXISTS "Users can update their own reviews" ON "public"."reviews";

DROP POLICY IF EXISTS "Admins can view all scheduled emails" ON "public"."scheduled_emails";
DROP POLICY IF EXISTS "Service role can manage scheduled emails" ON "public"."scheduled_emails";
DROP POLICY IF EXISTS "Users can view their own scheduled emails" ON "public"."scheduled_emails";

DROP POLICY IF EXISTS "Users can view their own settings" ON "public"."user_settings";
DROP POLICY IF EXISTS "Users can insert their own settings" ON "public"."user_settings";
DROP POLICY IF EXISTS "Users can update their own settings" ON "public"."user_settings";

DROP POLICY IF EXISTS "Service role can manage user activity" ON "public"."user_activity";
DROP POLICY IF EXISTS "Users can view their own activity" ON "public"."user_activity";

DROP POLICY IF EXISTS "Users can create conversations" ON "public"."conversations";
DROP POLICY IF EXISTS "Users can update conversations they participate in" ON "public"."conversations";
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON "public"."conversations";

DROP POLICY IF EXISTS "Users can create meeting requests" ON "public"."meetings";
DROP POLICY IF EXISTS "Users can delete meetings they created" ON "public"."meetings";
DROP POLICY IF EXISTS "Users can update meetings they are involved in" ON "public"."meetings";
DROP POLICY IF EXISTS "Users can view meetings they are involved in" ON "public"."meetings";

DROP POLICY IF EXISTS "Users can create their own deletion requests" ON "public"."account_deletion_requests";
DROP POLICY IF EXISTS "Users can update their own pending deletion requests" ON "public"."account_deletion_requests";
DROP POLICY IF EXISTS "Users can view their own deletion requests" ON "public"."account_deletion_requests";

DROP POLICY IF EXISTS "Users can update their own pending reviews" ON "public"."reviews_pending";
DROP POLICY IF EXISTS "Users can view their own pending reviews" ON "public"."reviews_pending";

-- Re-create policies with optimizations

-- Availability
CREATE POLICY "Users can view all availability posts" ON "public"."availability" FOR SELECT TO dashboard_user USING (true);
CREATE POLICY "Users can view all active availability posts" ON "public"."availability" FOR SELECT TO anon USING ("status" = 'active'::"text");
CREATE POLICY "Users can view their own availability posts" ON "public"."availability" FOR SELECT TO authenticated, authenticator USING (((SELECT auth.uid()) = "owner_id"));
CREATE POLICY "Users can create their own availability posts" ON "public"."availability" FOR INSERT WITH CHECK (((SELECT auth.uid()) = "owner_id"));
CREATE POLICY "Users can delete their own availability posts" ON "public"."availability" FOR DELETE USING (((SELECT auth.uid()) = "owner_id"));
CREATE POLICY "Users can update their own availability posts" ON "public"."availability" FOR UPDATE USING (((SELECT auth.uid()) = "owner_id"));

-- Dogs
CREATE POLICY "Users can create their own dogs" ON "public"."dogs" FOR INSERT TO authenticated, authenticator, dashboard_user WITH CHECK (((SELECT auth.uid()) = "owner_id"));
CREATE POLICY "Users can view dogs in active availability posts" ON "public"."dogs" FOR SELECT TO anon USING (EXISTS ( SELECT 1
   FROM "public"."availability"
  WHERE (((("availability"."dog_id" = "dogs"."id") OR ("dogs"."id" = ANY ("availability"."dog_ids"))) AND ("availability"."status" = 'active'::"text")))));
CREATE POLICY "Users can view their own dogs" ON "public"."dogs" FOR SELECT TO authenticated, authenticator USING (
  ((SELECT auth.uid()) = "owner_id") OR (EXISTS (
    SELECT 1 FROM "public"."availability"
    WHERE (
      (("availability"."dog_id" = "dogs"."id") OR ("dogs"."id" = ANY ("availability"."dog_ids"))) 
      AND ("availability"."status" = 'active'::text)
    )
  ))
);
CREATE POLICY "Dashboard users can view dogs" ON "public"."dogs" FOR SELECT TO dashboard_user USING (true);
CREATE POLICY "Users can delete their own dogs" ON "public"."dogs" FOR DELETE USING (((SELECT auth.uid()) = "owner_id"));
CREATE POLICY "Users can update their own dogs" ON "public"."dogs" FOR UPDATE USING (((SELECT auth.uid()) = "owner_id"));

-- Email Events
-- Unified policy to handle all SELECT access for email_events
CREATE POLICY "Unified view access for email_events" ON "public"."email_events" FOR SELECT TO authenticated, authenticator, dashboard_user USING (
  ((SELECT auth.uid()) = "user_id") 
  OR 
  (EXISTS ( SELECT 1 FROM "public"."profiles" WHERE (("profiles"."id" = (SELECT auth.uid())) AND ("profiles"."role" = 'admin'::"text"))))
  OR
  ((SELECT auth.role()) = 'service_role'::"text")
);

-- Messages
-- Consolidate INSERT: Only allow users to send messages to conversations they are part of.
CREATE POLICY "Users can send messages in conversations they participate in" ON "public"."messages" FOR INSERT TO authenticated, authenticator, dashboard_user WITH CHECK (
  ((SELECT auth.uid()) = sender_id) AND (
    EXISTS (
      SELECT 1 FROM "public"."conversations"
      WHERE "conversations"."id" = "messages"."conversation_id"
      AND ("conversations"."participant1_id" = (SELECT auth.uid()) OR "conversations"."participant2_id" = (SELECT auth.uid()))
    )
  )
);
-- Consolidate SELECT: View messages if you are in the conversation. This covers "sent or received" scenarios.
CREATE POLICY "Users can view messages in conversations they participate in" ON "public"."messages" FOR SELECT TO authenticated, authenticator, dashboard_user USING (
  EXISTS (
    SELECT 1 FROM "public"."conversations"
    WHERE "conversations"."id" = "messages"."conversation_id"
    AND ("conversations"."participant1_id" = (SELECT auth.uid()) OR "conversations"."participant2_id" = (SELECT auth.uid()))
  )
);
CREATE POLICY "Users can delete their own messages" ON "public"."messages" FOR DELETE USING (((SELECT auth.uid()) = "sender_id"));
CREATE POLICY "Users can update their own messages" ON "public"."messages" FOR UPDATE USING (((SELECT auth.uid()) = "sender_id"));

-- Profiles
CREATE POLICY "Allow anonymous read access to profiles" ON "public"."profiles" FOR SELECT TO anon USING (true);
-- "Authenticated users can view basic profile info" allows viewing ALL profiles (USING auth.uid() IS NOT NULL).
-- This supersedes "Users can view their own profile" for SELECT.
CREATE POLICY "Authenticated users can view profiles" ON "public"."profiles" FOR SELECT TO authenticated, authenticator, dashboard_user USING (((SELECT auth.uid()) IS NOT NULL));
CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (((SELECT auth.uid()) = "id"));
CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (((SELECT auth.uid()) = "id"));

-- Profile Views
CREATE POLICY "Users can view their own profile views" ON "public"."profile_views" FOR SELECT TO authenticated, authenticator, dashboard_user USING (((SELECT auth.uid()) = "viewed_user_id"));
CREATE POLICY "Users can create profile views" ON "public"."profile_views" FOR INSERT WITH CHECK (((SELECT auth.uid()) = "viewer_id"));

-- Reviews
CREATE POLICY "Anyone can view active reviews" ON "public"."reviews" FOR SELECT TO anon USING ("status" = 'active'::"text");
CREATE POLICY "Users can view their own reviews" ON "public"."reviews" FOR SELECT TO authenticated, authenticator USING ((((SELECT auth.uid()) = "reviewer_id") OR ((SELECT auth.uid()) = "reviewee_id")));
CREATE POLICY "Anyone can view reviews" ON "public"."reviews" FOR SELECT TO dashboard_user USING (true);
CREATE POLICY "Users can create reviews for their meetings" ON "public"."reviews" FOR INSERT WITH CHECK ((((SELECT auth.uid()) = "reviewer_id") AND (EXISTS ( SELECT 1
   FROM "public"."meetings"
  WHERE (("meetings"."id" = "reviews"."meeting_id") AND (("meetings"."requester_id" = (SELECT auth.uid())) OR ("meetings"."recipient_id" = (SELECT auth.uid()))) AND ("meetings"."status" = 'completed'::"text"))))));
CREATE POLICY "Users can delete their own reviews" ON "public"."reviews" FOR DELETE USING (((SELECT auth.uid()) = "reviewer_id"));
CREATE POLICY "Users can update their own reviews" ON "public"."reviews" FOR UPDATE USING (((SELECT auth.uid()) = "reviewer_id"));

-- Scheduled Emails
-- Unified policy to handle all SELECT access for scheduled_emails
CREATE POLICY "Unified view access for scheduled_emails" ON "public"."scheduled_emails" FOR SELECT TO authenticated, authenticator, dashboard_user USING (
  ((SELECT auth.uid()) = "user_id")
  OR
  (EXISTS ( SELECT 1 FROM "public"."profiles" WHERE (("profiles"."id" = (SELECT auth.uid())) AND ("profiles"."role" = 'admin'::"text"))))
  OR
  ((SELECT auth.role()) = 'service_role'::"text")
);

-- User Settings
CREATE POLICY "Users can view their own settings" ON "public"."user_settings" FOR SELECT TO authenticated, authenticator, dashboard_user USING (((SELECT auth.uid()) = "user_id"));
CREATE POLICY "Users can insert their own settings" ON "public"."user_settings" FOR INSERT WITH CHECK (((SELECT auth.uid()) = "user_id"));
CREATE POLICY "Users can update their own settings" ON "public"."user_settings" FOR UPDATE USING (((SELECT auth.uid()) = "user_id"));

-- User Activity
CREATE POLICY "Users can view their own activity" ON "public"."user_activity" FOR SELECT TO authenticated, authenticator USING (((SELECT auth.uid()) = "user_id"));
CREATE POLICY "Service role can manage user activity" ON "public"."user_activity" FOR SELECT TO dashboard_user USING (((SELECT auth.role()) = 'service_role'::"text"));

-- Conversations
CREATE POLICY "Users can create conversations" ON "public"."conversations" FOR INSERT WITH CHECK ((((SELECT auth.uid()) = "participant1_id") OR ((SELECT auth.uid()) = "participant2_id")));
CREATE POLICY "Users can update conversations they participate in" ON "public"."conversations" FOR UPDATE USING ((((SELECT auth.uid()) = "participant1_id") OR ((SELECT auth.uid()) = "participant2_id")));
CREATE POLICY "Users can view conversations they participate in" ON "public"."conversations" FOR SELECT USING ((((SELECT auth.uid()) = "participant1_id") OR ((SELECT auth.uid()) = "participant2_id")));

-- Meetings
CREATE POLICY "Users can create meeting requests" ON "public"."meetings" FOR INSERT WITH CHECK (((SELECT auth.uid()) = "requester_id"));
CREATE POLICY "Users can delete meetings they created" ON "public"."meetings" FOR DELETE USING (((SELECT auth.uid()) = "requester_id"));
CREATE POLICY "Users can update meetings they are involved in" ON "public"."meetings" FOR UPDATE USING ((((SELECT auth.uid()) = "requester_id") OR ((SELECT auth.uid()) = "recipient_id")));
CREATE POLICY "Users can view meetings they are involved in" ON "public"."meetings" FOR SELECT USING ((((SELECT auth.uid()) = "requester_id") OR ((SELECT auth.uid()) = "recipient_id")));

-- Account Deletion Requests
CREATE POLICY "Users can create their own deletion requests" ON "public"."account_deletion_requests" FOR INSERT WITH CHECK (((SELECT auth.uid()) = "user_id"));
CREATE POLICY "Users can update their own pending deletion requests" ON "public"."account_deletion_requests" FOR UPDATE USING ((((SELECT auth.uid()) = "user_id") AND ("status" = 'pending'::"text")));
CREATE POLICY "Users can view their own deletion requests" ON "public"."account_deletion_requests" FOR SELECT USING (((SELECT auth.uid()) = "user_id"));

-- Reviews Pending
CREATE POLICY "Users can update their own pending reviews" ON "public"."reviews_pending" FOR UPDATE USING (((SELECT auth.uid()) = "user_id"));
CREATE POLICY "Users can view their own pending reviews" ON "public"."reviews_pending" FOR SELECT USING (((SELECT auth.uid()) = "user_id"));

-- Drop redundant index
DROP INDEX IF EXISTS "public"."idx_messages_created";
