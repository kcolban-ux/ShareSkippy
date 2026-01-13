-- Updated database schema to match current Supabase database
-- This schema reflects the actual state of your Supabase database

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  role TEXT,
  emergency_contact_name TEXT,
  emergency_contact_number TEXT,
  emergency_contact_email TEXT,
  bio TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  linkedin_url TEXT,
  airbnb_url TEXT,
  other_social_url TEXT,
  community_support_badge TEXT,
  support_preferences TEXT[],
  support_story TEXT,
  other_support_description TEXT,
  profile_photo_url TEXT,
  display_lat DECIMAL,
  display_lng DECIMAL,
  neighborhood TEXT,
  city TEXT,
  street_address TEXT,
  state TEXT,
  zip_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dogs table
CREATE TABLE IF NOT EXISTS dogs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  breed TEXT,
  birthday DATE,
  age_years INTEGER DEFAULT 0,
  age_months INTEGER DEFAULT 0,
  size TEXT CHECK (size IN ('0-10', '11-25', '26-40', '41-70', '71-90', '91-110')),
  photo_url TEXT,
  gender TEXT CHECK (gender IN ('male', 'female')),
  neutered BOOLEAN DEFAULT false,
  temperament TEXT[],
  energy_level TEXT CHECK (energy_level IN ('low', 'moderate', 'high')),
  dog_friendly BOOLEAN DEFAULT true,
  cat_friendly BOOLEAN DEFAULT false,
  kid_friendly BOOLEAN DEFAULT false,
  leash_trained BOOLEAN DEFAULT false,
  crate_trained BOOLEAN DEFAULT false,
  house_trained BOOLEAN DEFAULT false,
  fully_vaccinated BOOLEAN DEFAULT false,
  activities TEXT[],
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create availability table (updated to match Supabase schema)
CREATE TABLE IF NOT EXISTS availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  dog_id UUID REFERENCES dogs(id) ON DELETE CASCADE, -- Keep for backward compatibility
  dog_ids UUID[] DEFAULT '{}', -- New field for multiple dogs
  post_type TEXT CHECK (post_type IN ('dog_available', 'petpal_available')) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  availability_notes TEXT,
  special_instructions TEXT,
  is_urgent BOOLEAN DEFAULT false,
  urgency_notes TEXT,
  can_pick_up_drop_off BOOLEAN DEFAULT false,
  can_drop_off BOOLEAN DEFAULT false,
  can_pick_up BOOLEAN DEFAULT false,
  preferred_meeting_location TEXT,
  
  -- Time and scheduling fields (new)
  start_time time without time zone,
  end_time time without time zone,
  duration_minutes integer,
  is_recurring boolean DEFAULT false,
  recurring_days ARRAY,
  flexibility_level text CHECK (flexibility_level = ANY (ARRAY['strict'::text, 'moderate'::text, 'flexible'::text])),
  
  -- Location fields
  use_profile_location BOOLEAN DEFAULT true,
  custom_location_address TEXT,
  custom_location_neighborhood TEXT,
  custom_location_city TEXT,
  custom_location_state TEXT,
  custom_location_zip_code TEXT,
  custom_location_lat DECIMAL,
  custom_location_lng DECIMAL,
  display_lat DECIMAL,
  display_lng DECIMAL,
  city_label TEXT,
  
  -- Community support fields
  community_support_enabled BOOLEAN DEFAULT false,
  support_preferences TEXT[],
  flexible_scheduling_needed BOOLEAN DEFAULT false,
  support_story TEXT,
  need_extra_help BOOLEAN DEFAULT false,
  help_reason_elderly BOOLEAN DEFAULT false,
  help_reason_sick BOOLEAN DEFAULT false,
  help_reason_low_income BOOLEAN DEFAULT false,
  help_reason_disability BOOLEAN DEFAULT false,
  help_reason_single_parent BOOLEAN DEFAULT false,
  help_reason_other BOOLEAN DEFAULT false,
  help_reason_other_text TEXT,
  help_context TEXT,
  open_to_helping_others BOOLEAN DEFAULT false,
  can_help_everyone BOOLEAN DEFAULT false,
  can_help_elderly BOOLEAN DEFAULT false,
  can_help_sick BOOLEAN DEFAULT false,
  can_help_low_income BOOLEAN DEFAULT false,
  can_help_disability BOOLEAN DEFAULT false,
  can_help_single_parent BOOLEAN DEFAULT false,
  helping_others_context TEXT,
  
  -- Scheduling fields
  enabled_days TEXT[] DEFAULT '{}',
  day_schedules JSONB DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  
  -- Status and metadata
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversations table (updated to match Supabase schema)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant1_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  participant2_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  availability_id UUID REFERENCES availability(id) ON DELETE CASCADE,
  availability_post_id UUID REFERENCES availability(id) ON DELETE CASCADE, -- New field
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(participant1_id, participant2_id, availability_id)
);

-- Create messages table (updated to match Supabase schema)
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  availability_id UUID REFERENCES availability(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE, -- New field
  subject TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  availability_id UUID REFERENCES availability(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  
  -- Meeting details
  title TEXT NOT NULL,
  description TEXT,
  meeting_place TEXT,
  
  -- Scheduling
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'cancelled', 'completed')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_meeting_times CHECK (end_datetime > start_datetime),
  CONSTRAINT different_participants CHECK (requester_id != recipient_id)
);

-- Create reviews table (updated to match Supabase schema)
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reviewee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE, -- New field
  availability_id UUID REFERENCES availability(id) ON DELETE CASCADE, -- New field
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE, -- Keep existing
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  reviewer_role TEXT NOT NULL CHECK (reviewer_role = ANY (ARRAY['owner'::text, 'walker'::text])),
  reviewed_role TEXT NOT NULL CHECK (reviewed_role = ANY (ARRAY['owner'::text, 'walker'::text])),
  meeting_date date,
  meeting_location text,
  status TEXT DEFAULT 'active' CHECK (status = ANY (ARRAY['active'::text, 'hidden'::text, 'deleted'::text])),
  is_pending boolean DEFAULT false,
  review_trigger_date timestamp with time zone,
  comment TEXT NOT NULL CHECK (count_words(comment) >= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_meeting_reviewer UNIQUE (meeting_id, reviewer_id),
  CONSTRAINT different_reviewer_reviewee CHECK (reviewer_id != reviewee_id)
);

-- Create reviews_pending table (new table from Supabase schema)
CREATE TABLE IF NOT EXISTS reviews_pending (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  other_participant_id uuid NOT NULL,
  availability_id uuid,
  role text NOT NULL CHECK (role = ANY (ARRAY['owner'::text, 'walker'::text])),
  other_role text NOT NULL CHECK (other_role = ANY (ARRAY['owner'::text, 'walker'::text])),
  days_since_last_message integer NOT NULL,
  is_notified boolean DEFAULT false,
  notification_sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reviews_pending_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_pending_other_participant_id_fkey FOREIGN KEY (other_participant_id) REFERENCES public.profiles(id),
  CONSTRAINT reviews_pending_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT reviews_pending_availability_id_fkey FOREIGN KEY (availability_id) REFERENCES public.availability(id),
  CONSTRAINT reviews_pending_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_availability_id ON messages(availability_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_participant1_id ON conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2_id ON conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_availability_id ON conversations(availability_id);
CREATE INDEX IF NOT EXISTS idx_conversations_availability_post_id ON conversations(availability_post_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at);
CREATE INDEX IF NOT EXISTS idx_meetings_requester_id ON meetings(requester_id);
CREATE INDEX IF NOT EXISTS idx_meetings_recipient_id ON meetings(recipient_id);
CREATE INDEX IF NOT EXISTS idx_meetings_availability_id ON meetings(availability_id);
CREATE INDEX IF NOT EXISTS idx_meetings_conversation_id ON meetings(conversation_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_start_datetime ON meetings(start_datetime);
CREATE INDEX IF NOT EXISTS idx_meetings_end_datetime ON meetings(end_datetime);
CREATE INDEX IF NOT EXISTS idx_reviews_meeting_id ON reviews(meeting_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_conversation_id ON reviews(conversation_id);
CREATE INDEX IF NOT EXISTS idx_reviews_availability_id ON reviews(availability_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_is_pending ON reviews(is_pending);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_role ON reviews(reviewed_role);
CREATE INDEX IF NOT EXISTS idx_reviews_meeting_date ON reviews(meeting_date);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_pending_user_id ON reviews_pending(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_pending_conversation_id ON reviews_pending(conversation_id);
CREATE INDEX IF NOT EXISTS idx_reviews_pending_other_participant_id ON reviews_pending(other_participant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_pending_availability_id ON reviews_pending(availability_id);
CREATE INDEX IF NOT EXISTS idx_reviews_pending_is_notified ON reviews_pending(is_notified);
CREATE INDEX IF NOT EXISTS idx_reviews_pending_created_at ON reviews_pending(created_at);
CREATE INDEX IF NOT EXISTS idx_availability_dog_ids ON availability USING GIN (dog_ids);
CREATE INDEX IF NOT EXISTS idx_availability_start_time ON availability(start_time);
CREATE INDEX IF NOT EXISTS idx_availability_end_time ON availability(end_time);
CREATE INDEX IF NOT EXISTS idx_availability_flexibility_level ON availability(flexibility_level);
CREATE INDEX IF NOT EXISTS idx_availability_is_recurring ON availability(is_recurring);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews_pending ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for all tables
-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Authenticated users can view basic profile info for messaging" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can upsert their own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Dogs policies
CREATE POLICY "Users can view their own dogs" ON dogs
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can create their own dogs" ON dogs
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own dogs" ON dogs
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own dogs" ON dogs
  FOR DELETE USING (auth.uid() = owner_id);

-- Availability policies
CREATE POLICY "Users can view all active availability posts" ON availability
  FOR SELECT USING (status = 'active');
CREATE POLICY "Users can view their own availability posts" ON availability
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can create their own availability posts" ON availability
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own availability posts" ON availability
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own availability posts" ON availability
  FOR DELETE USING (auth.uid() = owner_id);

-- Conversations policies
CREATE POLICY "Users can view conversations they participate in" ON conversations
  FOR SELECT USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);
CREATE POLICY "Users can update conversations they participate in" ON conversations
  FOR UPDATE USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- Messages policies
CREATE POLICY "Users can view messages they sent or received" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can create messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);
CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE USING (auth.uid() = sender_id);

-- Meetings policies
CREATE POLICY "Users can view meetings they are involved in" ON meetings
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can create meeting requests" ON meetings
  FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update meetings they are involved in" ON meetings
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can delete meetings they created" ON meetings
  FOR DELETE USING (auth.uid() = requester_id);

-- Reviews policies
CREATE POLICY "Anyone can view reviews" ON reviews
  FOR SELECT USING (true);
CREATE POLICY "Users can create reviews for their meetings" ON reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM meetings 
      WHERE id = meeting_id 
      AND (requester_id = auth.uid() OR recipient_id = auth.uid())
      AND status = 'completed'
    )
  );
CREATE POLICY "Users can update their own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);
CREATE POLICY "Users can delete their own reviews" ON reviews
  FOR DELETE USING (auth.uid() = reviewer_id);

-- Reviews pending policies
CREATE POLICY "Users can view their own pending reviews" ON reviews_pending
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create pending reviews for themselves" ON reviews_pending
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own pending reviews" ON reviews_pending
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own pending reviews" ON reviews_pending
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create word counting function for reviews
CREATE OR REPLACE FUNCTION count_words(text_input TEXT)
RETURNS INTEGER AS $$
BEGIN
  IF text_input IS NULL OR trim(text_input) = '' THEN
    RETURN 0;
  END IF;
  RETURN array_length(string_to_array(trim(text_input), ' '), 1);
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically update meeting status to completed
CREATE OR REPLACE FUNCTION update_meeting_status_to_completed()
RETURNS void AS $$
BEGIN
  UPDATE meetings 
  SET status = 'completed', updated_at = NOW()
  WHERE status = 'scheduled' 
    AND end_datetime < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a function to handle meeting status updates
CREATE OR REPLACE FUNCTION handle_meeting_status_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the updated_at timestamp
  NEW.updated_at = NOW();
  
  -- If status is being changed to 'scheduled', ensure it was previously 'pending'
  IF NEW.status = 'scheduled' AND OLD.status != 'pending' THEN
    RAISE EXCEPTION 'Meeting can only be scheduled if it was previously pending';
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
$$ LANGUAGE plpgsql;

-- Create trigger for meeting status updates
CREATE OR REPLACE TRIGGER on_meeting_status_update
  BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION handle_meeting_status_update();

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for reviews updated_at
CREATE OR REPLACE TRIGGER on_reviews_update
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_reviews_updated_at();

-- Create function to get user's average rating
CREATE OR REPLACE FUNCTION get_user_average_rating(user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  avg_rating DECIMAL;
BEGIN
  SELECT COALESCE(AVG(rating), 0) INTO avg_rating
  FROM reviews
  WHERE reviewee_id = user_id;
  
  RETURN ROUND(avg_rating, 2);
END;
$$ LANGUAGE plpgsql;

-- Create function to get user's review count
CREATE OR REPLACE FUNCTION get_user_review_count(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  review_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO review_count
  FROM reviews
  WHERE reviewee_id = user_id;
  
  RETURN review_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if user has pending reviews
CREATE OR REPLACE FUNCTION get_pending_reviews_for_user(user_id UUID)
RETURNS TABLE (
  meeting_id UUID,
  meeting_title TEXT,
  other_participant_id UUID,
  other_participant_name TEXT,
  meeting_end_datetime TIMESTAMP WITH TIME ZONE
) AS $$
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
    AND m.end_datetime < NOW()
    AND NOT EXISTS (
      SELECT 1 FROM reviews r 
      WHERE r.meeting_id = m.id 
      AND r.reviewer_id = user_id
    );
END;
$$ LANGUAGE plpgsql;