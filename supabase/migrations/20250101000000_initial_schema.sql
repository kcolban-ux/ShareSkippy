

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."check_review_needed"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
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
      END,
      CASE 
        WHEN c.participant1_id = NEW.sender_id THEN c.participant2_id
        ELSE c.participant1_id
      END
    INTO other_participant_id, other_participant_id
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
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_deletion_request_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_settings_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."account_deletion_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scheduled_deletion_date" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reason" "text",
    "admin_notes" "text",
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "account_deletion_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'cancelled'::"text", 'processing'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."account_deletion_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."availability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid",
    "dog_id" "uuid",
    "post_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "start_date" "date",
    "end_date" "date",
    "start_time" time without time zone,
    "end_time" time without time zone,
    "duration_minutes" integer,
    "is_recurring" boolean DEFAULT false,
    "recurring_days" "text"[],
    "flexibility_level" "text",
    "availability_notes" "text",
    "special_instructions" "text",
    "is_urgent" boolean DEFAULT false,
    "urgency_notes" "text",
    "display_lat" numeric,
    "display_lng" numeric,
    "city_label" "text",
    "use_profile_location" boolean DEFAULT true,
    "custom_location_address" "text",
    "custom_location_neighborhood" "text",
    "custom_location_city" "text",
    "custom_location_state" "text",
    "custom_location_zip_code" "text",
    "custom_location_lat" numeric,
    "custom_location_lng" numeric,
    "can_drop_off" boolean DEFAULT false,
    "can_pick_up" boolean DEFAULT false,
    "preferred_meeting_location" "text",
    "status" "text" DEFAULT 'active'::"text",
    "community_support_enabled" boolean DEFAULT false,
    "support_preferences" "text"[],
    "flexible_scheduling_needed" boolean DEFAULT false,
    "support_story" "text",
    "enabled_days" "jsonb" DEFAULT '{}'::"jsonb",
    "day_schedules" "jsonb" DEFAULT '{}'::"jsonb",
    "need_extra_help" boolean DEFAULT false,
    "help_reason_elderly" boolean DEFAULT false,
    "help_reason_sick" boolean DEFAULT false,
    "help_reason_low_income" boolean DEFAULT false,
    "help_reason_disability" boolean DEFAULT false,
    "help_reason_single_parent" boolean DEFAULT false,
    "help_context" "text",
    "open_to_helping_others" boolean DEFAULT false,
    "can_help_elderly" boolean DEFAULT false,
    "can_help_sick" boolean DEFAULT false,
    "can_help_low_income" boolean DEFAULT false,
    "can_help_disability" boolean DEFAULT false,
    "can_help_single_parent" boolean DEFAULT false,
    "helping_others_context" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "can_help_everyone" boolean DEFAULT false,
    "help_reason_other" boolean DEFAULT false,
    "help_reason_other_text" "text",
    "can_pick_up_drop_off" boolean DEFAULT false,
    "dog_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    CONSTRAINT "availability_flexibility_level_check" CHECK (("flexibility_level" = ANY (ARRAY['strict'::"text", 'moderate'::"text", 'flexible'::"text"]))),
    CONSTRAINT "availability_post_type_check" CHECK (("post_type" = ANY (ARRAY['dog_available'::"text", 'petpal_available'::"text"]))),
    CONSTRAINT "availability_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'completed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "check_dog_available_has_dogs" CHECK (((("post_type" = 'dog_available'::"text") AND (("dog_id" IS NOT NULL) OR ("array_length"("dog_ids", 1) > 0))) OR ("post_type" = 'petpal_available'::"text")))
);


ALTER TABLE "public"."availability" OWNER TO "postgres";


COMMENT ON COLUMN "public"."availability"."can_pick_up_drop_off" IS 'Whether the user can pick up or drop off the dog';



CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "participant1_id" "uuid" NOT NULL,
    "participant2_id" "uuid" NOT NULL,
    "availability_id" "uuid",
    "last_message_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "availability_post_id" "uuid"
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dogs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid",
    "name" "text" NOT NULL,
    "breed" "text",
    "birthday" "date",
    "age_years" integer DEFAULT 0,
    "age_months" integer DEFAULT 0,
    "size" "text",
    "photo_url" "text",
    "gender" "text",
    "neutered" boolean DEFAULT false,
    "temperament" "text"[],
    "energy_level" "text",
    "dog_friendly" boolean DEFAULT true,
    "cat_friendly" boolean DEFAULT false,
    "kid_friendly" boolean DEFAULT false,
    "leash_trained" boolean DEFAULT false,
    "crate_trained" boolean DEFAULT false,
    "house_trained" boolean DEFAULT false,
    "fully_vaccinated" boolean DEFAULT false,
    "activities" "text"[],
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "dogs_energy_level_check" CHECK (("energy_level" = ANY (ARRAY['low'::"text", 'moderate'::"text", 'high'::"text"]))),
    CONSTRAINT "dogs_gender_check" CHECK (("gender" = ANY (ARRAY['male'::"text", 'female'::"text"]))),
    CONSTRAINT "dogs_size_check" CHECK (("size" = ANY (ARRAY['0-10'::"text", '11-25'::"text", '26-40'::"text", '41-70'::"text", '71-90'::"text", '91-110'::"text"])))
);


ALTER TABLE "public"."dogs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_catalog" (
    "id" "text" NOT NULL,
    "description" "text" NOT NULL,
    "enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_catalog" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_catalog" IS 'Catalog of all email types supported by the system';



CREATE TABLE IF NOT EXISTS "public"."email_events" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email_type" "text" NOT NULL,
    "status" "text" NOT NULL,
    "external_message_id" "text",
    "error" "text",
    "to_email" "text" NOT NULL,
    "subject" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "email_events_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'sent'::"text", 'failed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."email_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_events" IS 'Tracks all email sending events with status and external message IDs';



CREATE SEQUENCE IF NOT EXISTS "public"."email_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."email_events_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."email_events_id_seq" OWNED BY "public"."email_events"."id";



CREATE TABLE IF NOT EXISTS "public"."meetings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "availability_id" "uuid",
    "conversation_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "meeting_place" "text",
    "start_datetime" timestamp with time zone NOT NULL,
    "end_datetime" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "reminder_sent" boolean DEFAULT false,
    "requester_dog_id" "uuid",
    "recipient_dog_id" "uuid",
    CONSTRAINT "different_participants" CHECK (("requester_id" <> "recipient_id")),
    CONSTRAINT "meetings_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'scheduled'::"text", 'cancelled'::"text", 'completed'::"text"]))),
    CONSTRAINT "valid_meeting_times" CHECK (("end_datetime" > "start_datetime"))
);


ALTER TABLE "public"."meetings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "availability_id" "uuid",
    "subject" "text",
    "content" "text" NOT NULL,
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "conversation_id" "uuid"
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profile_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "viewer_id" "uuid",
    "viewed_user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profile_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "role" "text",
    "emergency_contact" "text",
    "bio" "text",
    "facebook_url" "text",
    "instagram_url" "text",
    "linkedin_url" "text",
    "airbnb_url" "text",
    "community_support_badge" "text",
    "support_preferences" "text"[],
    "support_story" "text",
    "profile_photo_url" "text",
    "display_lat" numeric,
    "display_lng" numeric,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "first_name" "text",
    "last_name" "text",
    "phone_number" "text",
    "emergency_contact_name" "text",
    "emergency_contact_number" "text",
    "emergency_contact_email" "text",
    "other_social_url" "text",
    "other_support_description" "text",
    "street_address" "text",
    "state" "text",
    "zip_code" "text",
    "city" "text",
    "neighborhood" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reviewer_id" "uuid" NOT NULL,
    "reviewee_id" "uuid" NOT NULL,
    "conversation_id" "uuid",
    "availability_id" "uuid",
    "rating" integer NOT NULL,
    "review_text" "text",
    "reviewer_role" "text" NOT NULL,
    "reviewed_role" "text" NOT NULL,
    "meeting_date" "date",
    "meeting_location" "text",
    "status" "text" DEFAULT 'active'::"text",
    "is_pending" boolean DEFAULT false,
    "review_trigger_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "meeting_id" "uuid",
    "comment" "text" NOT NULL,
    CONSTRAINT "different_reviewer_reviewee" CHECK (("reviewer_id" <> "reviewee_id")),
    CONSTRAINT "reviews_comment_word_count_check" CHECK (("public"."count_words"("comment") >= 5)),
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "reviews_reviewed_role_check" CHECK (("reviewed_role" = ANY (ARRAY['owner'::"text", 'walker'::"text"]))),
    CONSTRAINT "reviews_reviewer_role_check" CHECK (("reviewer_role" = ANY (ARRAY['owner'::"text", 'walker'::"text"]))),
    CONSTRAINT "reviews_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'hidden'::"text", 'deleted'::"text"])))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews_pending" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "other_participant_id" "uuid" NOT NULL,
    "availability_id" "uuid",
    "role" "text" NOT NULL,
    "other_role" "text" NOT NULL,
    "days_since_last_message" integer NOT NULL,
    "is_notified" boolean DEFAULT false,
    "notification_sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reviews_pending_other_role_check" CHECK (("other_role" = ANY (ARRAY['owner'::"text", 'walker'::"text"]))),
    CONSTRAINT "reviews_pending_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'walker'::"text"])))
);


ALTER TABLE "public"."reviews_pending" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scheduled_emails" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email_type" "text" NOT NULL,
    "run_after" timestamp with time zone NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb",
    "picked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."scheduled_emails" OWNER TO "postgres";


COMMENT ON TABLE "public"."scheduled_emails" IS 'Queue for emails to be sent at specific times';



CREATE SEQUENCE IF NOT EXISTS "public"."scheduled_emails_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."scheduled_emails_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."scheduled_emails_id_seq" OWNED BY "public"."scheduled_emails"."id";



CREATE TABLE IF NOT EXISTS "public"."user_activity" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_activity" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_activity" IS 'Tracks user actions for re-engagement and analytics';



CREATE SEQUENCE IF NOT EXISTS "public"."user_activity_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_activity_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_activity_id_seq" OWNED BY "public"."user_activity"."id";



CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "user_id" "uuid" NOT NULL,
    "email_notifications" boolean DEFAULT true NOT NULL,
    "follow_up_email_sent" boolean DEFAULT false NOT NULL,
    "follow_up_email_sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."email_events" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."email_events_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."scheduled_emails" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."scheduled_emails_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_activity" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_activity_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."account_deletion_requests"
    ADD CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."availability"
    ADD CONSTRAINT "availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_participant1_id_participant2_id_availability__key" UNIQUE ("participant1_id", "participant2_id", "availability_id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dogs"
    ADD CONSTRAINT "dogs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_catalog"
    ADD CONSTRAINT "email_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_events"
    ADD CONSTRAINT "email_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profile_views"
    ADD CONSTRAINT "profile_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews_pending"
    ADD CONSTRAINT "reviews_pending_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews_pending"
    ADD CONSTRAINT "reviews_pending_user_id_conversation_id_key" UNIQUE ("user_id", "conversation_id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scheduled_emails"
    ADD CONSTRAINT "scheduled_emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "unique_meeting_reviewer" UNIQUE ("meeting_id", "reviewer_id");



ALTER TABLE ONLY "public"."user_activity"
    ADD CONSTRAINT "user_activity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "idx_account_deletion_requests_requested_at" ON "public"."account_deletion_requests" USING "btree" ("requested_at");



CREATE INDEX "idx_account_deletion_requests_scheduled_date" ON "public"."account_deletion_requests" USING "btree" ("scheduled_deletion_date");



CREATE INDEX "idx_account_deletion_requests_status" ON "public"."account_deletion_requests" USING "btree" ("status");



CREATE INDEX "idx_account_deletion_requests_user_id" ON "public"."account_deletion_requests" USING "btree" ("user_id");



CREATE INDEX "idx_availability_dates" ON "public"."availability" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_availability_dog_ids" ON "public"."availability" USING "gin" ("dog_ids");



CREATE INDEX "idx_availability_location" ON "public"."availability" USING "btree" ("display_lat", "display_lng");



CREATE INDEX "idx_availability_owner_id" ON "public"."availability" USING "btree" ("owner_id");



CREATE INDEX "idx_availability_post_type" ON "public"."availability" USING "btree" ("post_type");



CREATE INDEX "idx_availability_status" ON "public"."availability" USING "btree" ("status");



CREATE INDEX "idx_conversations_availability_id" ON "public"."conversations" USING "btree" ("availability_id");



CREATE INDEX "idx_conversations_last_message" ON "public"."conversations" USING "btree" ("last_message_at" DESC);



CREATE INDEX "idx_conversations_last_message_at" ON "public"."conversations" USING "btree" ("last_message_at");



CREATE INDEX "idx_conversations_participant1_id" ON "public"."conversations" USING "btree" ("participant1_id");



CREATE INDEX "idx_conversations_participant2_id" ON "public"."conversations" USING "btree" ("participant2_id");



CREATE INDEX "idx_conversations_participants" ON "public"."conversations" USING "btree" ("participant1_id", "participant2_id");



CREATE INDEX "idx_email_events_created_at" ON "public"."email_events" USING "btree" ("created_at");



CREATE INDEX "idx_email_events_email_type" ON "public"."email_events" USING "btree" ("email_type");



CREATE UNIQUE INDEX "idx_email_events_single_shot" ON "public"."email_events" USING "btree" ("user_id", "email_type") WHERE ("email_type" = ANY (ARRAY['welcome'::"text", 'nurture_day3'::"text"]));



CREATE INDEX "idx_email_events_status" ON "public"."email_events" USING "btree" ("status");



CREATE INDEX "idx_email_events_user_id" ON "public"."email_events" USING "btree" ("user_id");



CREATE INDEX "idx_email_events_user_type" ON "public"."email_events" USING "btree" ("user_id", "email_type");



CREATE INDEX "idx_meetings_availability_id" ON "public"."meetings" USING "btree" ("availability_id");



CREATE INDEX "idx_meetings_conversation_id" ON "public"."meetings" USING "btree" ("conversation_id");



CREATE INDEX "idx_meetings_end_datetime" ON "public"."meetings" USING "btree" ("end_datetime");



CREATE INDEX "idx_meetings_recipient_dog_id" ON "public"."meetings" USING "btree" ("recipient_dog_id");



CREATE INDEX "idx_meetings_recipient_id" ON "public"."meetings" USING "btree" ("recipient_id");



CREATE INDEX "idx_meetings_reminder_sent" ON "public"."meetings" USING "btree" ("reminder_sent");



CREATE INDEX "idx_meetings_requester_dog_id" ON "public"."meetings" USING "btree" ("requester_dog_id");



CREATE INDEX "idx_meetings_requester_id" ON "public"."meetings" USING "btree" ("requester_id");



CREATE INDEX "idx_meetings_start_datetime" ON "public"."meetings" USING "btree" ("start_datetime");



CREATE INDEX "idx_meetings_status" ON "public"."meetings" USING "btree" ("status");



CREATE INDEX "idx_messages_availability_id" ON "public"."messages" USING "btree" ("availability_id");



CREATE INDEX "idx_messages_conversation" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_created" ON "public"."messages" USING "btree" ("created_at");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at");



CREATE INDEX "idx_messages_recipient_id" ON "public"."messages" USING "btree" ("recipient_id");



CREATE INDEX "idx_messages_sender_id" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_profile_views_created_at" ON "public"."profile_views" USING "btree" ("created_at");



CREATE INDEX "idx_profile_views_viewed_user_id" ON "public"."profile_views" USING "btree" ("viewed_user_id");



CREATE INDEX "idx_profile_views_viewer_id" ON "public"."profile_views" USING "btree" ("viewer_id");



CREATE INDEX "idx_reviews_availability_id" ON "public"."reviews" USING "btree" ("availability_id");



CREATE INDEX "idx_reviews_conversation_id" ON "public"."reviews" USING "btree" ("conversation_id");



CREATE INDEX "idx_reviews_created_at" ON "public"."reviews" USING "btree" ("created_at");



CREATE INDEX "idx_reviews_is_pending" ON "public"."reviews" USING "btree" ("is_pending");



CREATE INDEX "idx_reviews_meeting_id" ON "public"."reviews" USING "btree" ("meeting_id");



CREATE INDEX "idx_reviews_pending_conversation_id" ON "public"."reviews_pending" USING "btree" ("conversation_id");



CREATE INDEX "idx_reviews_pending_is_notified" ON "public"."reviews_pending" USING "btree" ("is_notified");



CREATE INDEX "idx_reviews_pending_user_id" ON "public"."reviews_pending" USING "btree" ("user_id");



CREATE INDEX "idx_reviews_rating" ON "public"."reviews" USING "btree" ("rating");



CREATE INDEX "idx_reviews_reviewee_id" ON "public"."reviews" USING "btree" ("reviewee_id");



CREATE INDEX "idx_reviews_reviewer_id" ON "public"."reviews" USING "btree" ("reviewer_id");



CREATE INDEX "idx_scheduled_emails_email_type" ON "public"."scheduled_emails" USING "btree" ("email_type");



CREATE INDEX "idx_scheduled_emails_run_after" ON "public"."scheduled_emails" USING "btree" ("run_after") WHERE ("picked_at" IS NULL);



CREATE INDEX "idx_scheduled_emails_user_id" ON "public"."scheduled_emails" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_unique_pending_deletion_request" ON "public"."account_deletion_requests" USING "btree" ("user_id") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_user_activity_at" ON "public"."user_activity" USING "btree" ("at");



CREATE INDEX "idx_user_activity_event" ON "public"."user_activity" USING "btree" ("event");



CREATE INDEX "idx_user_activity_user_event" ON "public"."user_activity" USING "btree" ("user_id", "event");



CREATE INDEX "idx_user_activity_user_id" ON "public"."user_activity" USING "btree" ("user_id");



CREATE INDEX "idx_user_settings_email_notifications" ON "public"."user_settings" USING "btree" ("email_notifications");



CREATE INDEX "idx_user_settings_user_id" ON "public"."user_settings" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "check_review_needed_trigger" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."check_review_needed"();



CREATE OR REPLACE TRIGGER "cleanup_pending_review_trigger" AFTER INSERT ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."cleanup_pending_review"();



CREATE OR REPLACE TRIGGER "on_deletion_request_insert" BEFORE INSERT ON "public"."account_deletion_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_deletion_schedule_date"();



CREATE OR REPLACE TRIGGER "on_deletion_request_update" BEFORE UPDATE ON "public"."account_deletion_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_deletion_request_updated_at"();



CREATE OR REPLACE TRIGGER "on_meeting_status_update" BEFORE UPDATE ON "public"."meetings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_meeting_status_update"();



CREATE OR REPLACE TRIGGER "on_profile_insert_create_settings" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."create_user_settings_on_profile_insert"();



CREATE OR REPLACE TRIGGER "on_user_settings_update" BEFORE UPDATE ON "public"."user_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_settings_updated_at"();



CREATE OR REPLACE TRIGGER "update_availability_updated_at" BEFORE UPDATE ON "public"."availability" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_conversation_timestamp_trigger" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_timestamp"();



ALTER TABLE ONLY "public"."account_deletion_requests"
    ADD CONSTRAINT "account_deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."availability"
    ADD CONSTRAINT "availability_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "public"."dogs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."availability"
    ADD CONSTRAINT "availability_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_availability_id_fkey" FOREIGN KEY ("availability_id") REFERENCES "public"."availability"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_availability_post_id_fkey" FOREIGN KEY ("availability_post_id") REFERENCES "public"."availability"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_participant1_id_fkey" FOREIGN KEY ("participant1_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_participant2_id_fkey" FOREIGN KEY ("participant2_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dogs"
    ADD CONSTRAINT "dogs_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_events"
    ADD CONSTRAINT "email_events_email_type_fkey" FOREIGN KEY ("email_type") REFERENCES "public"."email_catalog"("id");



ALTER TABLE ONLY "public"."email_events"
    ADD CONSTRAINT "email_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_availability_id_fkey" FOREIGN KEY ("availability_id") REFERENCES "public"."availability"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_recipient_dog_id_fkey" FOREIGN KEY ("recipient_dog_id") REFERENCES "public"."dogs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_requester_dog_id_fkey" FOREIGN KEY ("requester_dog_id") REFERENCES "public"."dogs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_availability_id_fkey" FOREIGN KEY ("availability_id") REFERENCES "public"."availability"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_views"
    ADD CONSTRAINT "profile_views_viewed_user_id_fkey" FOREIGN KEY ("viewed_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_views"
    ADD CONSTRAINT "profile_views_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_availability_id_fkey" FOREIGN KEY ("availability_id") REFERENCES "public"."availability"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews_pending"
    ADD CONSTRAINT "reviews_pending_availability_id_fkey" FOREIGN KEY ("availability_id") REFERENCES "public"."availability"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reviews_pending"
    ADD CONSTRAINT "reviews_pending_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews_pending"
    ADD CONSTRAINT "reviews_pending_other_participant_id_fkey" FOREIGN KEY ("other_participant_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews_pending"
    ADD CONSTRAINT "reviews_pending_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_reviewee_id_fkey" FOREIGN KEY ("reviewee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_emails"
    ADD CONSTRAINT "scheduled_emails_email_type_fkey" FOREIGN KEY ("email_type") REFERENCES "public"."email_catalog"("id");



ALTER TABLE ONLY "public"."scheduled_emails"
    ADD CONSTRAINT "scheduled_emails_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_activity"
    ADD CONSTRAINT "user_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can view all email events" ON "public"."email_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all scheduled emails" ON "public"."scheduled_emails" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Allow anonymous read access to profiles" ON "public"."profiles" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anyone can view active reviews" ON "public"."reviews" FOR SELECT USING (("status" = 'active'::"text"));



CREATE POLICY "Anyone can view email catalog" ON "public"."email_catalog" FOR SELECT USING (true);



CREATE POLICY "Anyone can view reviews" ON "public"."reviews" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can view basic profile info for messaging" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Service role can manage email system" ON "public"."email_events" USING (true);



CREATE POLICY "Service role can manage scheduled emails" ON "public"."scheduled_emails" USING (true);



CREATE POLICY "Service role can manage user activity" ON "public"."user_activity" USING (true);



CREATE POLICY "Users can create conversations" ON "public"."conversations" FOR INSERT WITH CHECK ((("auth"."uid"() = "participant1_id") OR ("auth"."uid"() = "participant2_id")));



CREATE POLICY "Users can create meeting requests" ON "public"."meetings" FOR INSERT WITH CHECK (("auth"."uid"() = "requester_id"));



CREATE POLICY "Users can create messages" ON "public"."messages" FOR INSERT WITH CHECK (("auth"."uid"() = "sender_id"));



CREATE POLICY "Users can create profile views" ON "public"."profile_views" FOR INSERT WITH CHECK (("auth"."uid"() = "viewer_id"));



CREATE POLICY "Users can create reviews for their meetings" ON "public"."reviews" FOR INSERT WITH CHECK ((("auth"."uid"() = "reviewer_id") AND (EXISTS ( SELECT 1
   FROM "public"."meetings"
  WHERE (("meetings"."id" = "reviews"."meeting_id") AND (("meetings"."requester_id" = "auth"."uid"()) OR ("meetings"."recipient_id" = "auth"."uid"())) AND ("meetings"."status" = 'completed'::"text"))))));



CREATE POLICY "Users can create their own availability posts" ON "public"."availability" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can create their own deletion requests" ON "public"."account_deletion_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own dogs" ON "public"."dogs" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can delete meetings they created" ON "public"."meetings" FOR DELETE USING (("auth"."uid"() = "requester_id"));



CREATE POLICY "Users can delete their own availability posts" ON "public"."availability" FOR DELETE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can delete their own dogs" ON "public"."dogs" FOR DELETE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can delete their own messages" ON "public"."messages" FOR DELETE USING (("auth"."uid"() = "sender_id"));



CREATE POLICY "Users can delete their own reviews" ON "public"."reviews" FOR DELETE USING (("auth"."uid"() = "reviewer_id"));



CREATE POLICY "Users can insert their own dogs" ON "public"."dogs" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own settings" ON "public"."user_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can send messages in conversations they participate in" ON "public"."messages" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."conversations"
  WHERE (("conversations"."id" = "messages"."conversation_id") AND (("conversations"."participant1_id" = "auth"."uid"()) OR ("conversations"."participant2_id" = "auth"."uid"()))))));



CREATE POLICY "Users can update conversations they participate in" ON "public"."conversations" FOR UPDATE USING ((("auth"."uid"() = "participant1_id") OR ("auth"."uid"() = "participant2_id")));



CREATE POLICY "Users can update meetings they are involved in" ON "public"."meetings" FOR UPDATE USING ((("auth"."uid"() = "requester_id") OR ("auth"."uid"() = "recipient_id")));



CREATE POLICY "Users can update their own availability posts" ON "public"."availability" FOR UPDATE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can update their own dogs" ON "public"."dogs" FOR UPDATE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can update their own messages" ON "public"."messages" FOR UPDATE USING (("auth"."uid"() = "sender_id"));



CREATE POLICY "Users can update their own pending deletion requests" ON "public"."account_deletion_requests" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"text")));



CREATE POLICY "Users can update their own pending reviews" ON "public"."reviews_pending" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own reviews" ON "public"."reviews" FOR UPDATE USING (("auth"."uid"() = "reviewer_id"));



CREATE POLICY "Users can update their own settings" ON "public"."user_settings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view all active availability posts" ON "public"."availability" FOR SELECT USING (("status" = 'active'::"text"));



CREATE POLICY "Users can view all availability posts" ON "public"."availability" FOR SELECT USING (true);



CREATE POLICY "Users can view conversations they participate in" ON "public"."conversations" FOR SELECT USING ((("auth"."uid"() = "participant1_id") OR ("auth"."uid"() = "participant2_id")));



CREATE POLICY "Users can view dogs in active availability posts" ON "public"."dogs" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."availability"
  WHERE ((("availability"."dog_id" = "dogs"."id") OR ("dogs"."id" = ANY ("availability"."dog_ids"))) AND ("availability"."status" = 'active'::"text"))))));



CREATE POLICY "Users can view meetings they are involved in" ON "public"."meetings" FOR SELECT USING ((("auth"."uid"() = "requester_id") OR ("auth"."uid"() = "recipient_id")));



CREATE POLICY "Users can view messages in conversations they participate in" ON "public"."messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversations"
  WHERE (("conversations"."id" = "messages"."conversation_id") AND (("conversations"."participant1_id" = "auth"."uid"()) OR ("conversations"."participant2_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view messages they sent or received" ON "public"."messages" FOR SELECT USING ((("auth"."uid"() = "sender_id") OR ("auth"."uid"() = "recipient_id")));



CREATE POLICY "Users can view their own activity" ON "public"."user_activity" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own availability posts" ON "public"."availability" FOR SELECT USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can view their own deletion requests" ON "public"."account_deletion_requests" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own dogs" ON "public"."dogs" FOR SELECT USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can view their own email events" ON "public"."email_events" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own pending reviews" ON "public"."reviews_pending" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own profile views" ON "public"."profile_views" FOR SELECT USING (("auth"."uid"() = "viewed_user_id"));



CREATE POLICY "Users can view their own reviews" ON "public"."reviews" FOR SELECT USING ((("auth"."uid"() = "reviewer_id") OR ("auth"."uid"() = "reviewee_id")));



CREATE POLICY "Users can view their own scheduled emails" ON "public"."scheduled_emails" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own settings" ON "public"."user_settings" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."account_deletion_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."availability" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dogs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meetings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profile_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews_pending" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scheduled_emails" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_activity" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."check_review_needed"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_review_needed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_review_needed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_pending_review"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_pending_review"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_pending_review"() TO "service_role";



GRANT ALL ON FUNCTION "public"."count_words"("text_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."count_words"("text_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_words"("text_input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_settings_on_profile_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_settings_on_profile_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_settings_on_profile_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pending_reviews_for_user"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_pending_reviews_for_user"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pending_reviews_for_user"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_average_rating"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_average_rating"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_average_rating"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_rating_average"("user_uuid" "uuid", "role_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_rating_average"("user_uuid" "uuid", "role_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_rating_average"("user_uuid" "uuid", "role_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_review_count"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_review_count"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_review_count"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_meeting_status_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_meeting_status_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_meeting_status_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_deletion_schedule_date"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_deletion_schedule_date"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_deletion_schedule_date"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_deletion_request_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_deletion_request_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_deletion_request_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_settings_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."account_deletion_requests" TO "anon";
GRANT ALL ON TABLE "public"."account_deletion_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."account_deletion_requests" TO "service_role";



GRANT ALL ON TABLE "public"."availability" TO "anon";
GRANT ALL ON TABLE "public"."availability" TO "authenticated";
GRANT ALL ON TABLE "public"."availability" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."dogs" TO "anon";
GRANT ALL ON TABLE "public"."dogs" TO "authenticated";
GRANT ALL ON TABLE "public"."dogs" TO "service_role";



GRANT ALL ON TABLE "public"."email_catalog" TO "anon";
GRANT ALL ON TABLE "public"."email_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."email_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."email_events" TO "anon";
GRANT ALL ON TABLE "public"."email_events" TO "authenticated";
GRANT ALL ON TABLE "public"."email_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."email_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."email_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."email_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."meetings" TO "anon";
GRANT ALL ON TABLE "public"."meetings" TO "authenticated";
GRANT ALL ON TABLE "public"."meetings" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."profile_views" TO "anon";
GRANT ALL ON TABLE "public"."profile_views" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_views" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."reviews_pending" TO "anon";
GRANT ALL ON TABLE "public"."reviews_pending" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews_pending" TO "service_role";



GRANT ALL ON TABLE "public"."scheduled_emails" TO "anon";
GRANT ALL ON TABLE "public"."scheduled_emails" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduled_emails" TO "service_role";



GRANT ALL ON SEQUENCE "public"."scheduled_emails_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."scheduled_emails_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."scheduled_emails_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_activity" TO "anon";
GRANT ALL ON TABLE "public"."user_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."user_activity" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_activity_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_activity_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_activity_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
