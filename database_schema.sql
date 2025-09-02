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

-- Create reviews table (for the ratings feature)
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Create availability table
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
  preferred_meeting_location TEXT,
  
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

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  availability_id UUID REFERENCES availability(id) ON DELETE CASCADE,
  subject TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversations table to group messages
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant1_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  participant2_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  availability_id UUID REFERENCES availability(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(participant1_id, participant2_id, availability_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_availability_id ON messages(availability_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_participant1_id ON conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2_id ON conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_availability_id ON conversations(availability_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE dogs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create improved policies for profiles table
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Add a more permissive policy for upsert operations
CREATE POLICY "Users can upsert their own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Create policies for reviews table
CREATE POLICY "Anyone can view reviews" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Create policies for dogs table
CREATE POLICY "Users can view their own dogs" ON dogs
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own dogs" ON dogs
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own dogs" ON dogs
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own dogs" ON dogs
  FOR DELETE USING (auth.uid() = owner_id);

-- Enable RLS for availability table
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Create policies for availability table
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

-- Enable RLS for messages and conversations tables
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Create policies for messages table
CREATE POLICY "Users can view messages they sent or received" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE USING (auth.uid() = sender_id);

-- Create policies for conversations table
CREATE POLICY "Users can view conversations they participate in" ON conversations
  FOR SELECT USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Users can update conversations they participate in" ON conversations
  FOR UPDATE USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);
