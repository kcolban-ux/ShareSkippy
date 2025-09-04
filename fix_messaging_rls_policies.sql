-- Fix RLS policies for messaging functionality
-- This allows users to view basic profile information of other users for messaging

-- ============================================
-- FIX PROFILES TABLE RLS POLICIES
-- ============================================

-- Drop all existing profiles policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view basic profile info for messaging" ON profiles;

-- Create a new policy that allows users to view their own profile with full access
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Add a policy to allow viewing basic profile information for messaging
-- This allows authenticated users to view basic profile info of other users
CREATE POLICY "Authenticated users can view basic profile info for messaging" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================
-- FIX MESSAGES TABLE RLS POLICIES
-- ============================================

-- Drop all existing messages policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON messages;
DROP POLICY IF EXISTS "Users can create messages" ON messages;
DROP POLICY IF EXISTS "Users can update messages they sent" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Create clean, working policies for messages table
CREATE POLICY "Users can view messages they sent or received" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE USING (auth.uid() = sender_id);

-- ============================================
-- FIX CONVERSATIONS TABLE RLS POLICIES
-- ============================================

-- Drop all existing conversations policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update conversations they participate in" ON conversations;

-- Create clean, working policies for conversations table
CREATE POLICY "Users can view conversations they participate in" ON conversations
  FOR SELECT USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Users can update conversations they participate in" ON conversations
  FOR UPDATE USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- Note: This policy allows authenticated users to view all profile data of other users.
-- For a production app, you might want to create a more restrictive view or function
-- that only exposes specific fields like first_name, last_name, and profile_photo_url.
