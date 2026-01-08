/** * @description Robust RLS fix to ensure availability posts and relations are visible.
 * @region Database Migration / Fix
 */

-- 1. CLEAN UP PROFILES
-- Drop existing restrictive/conflicting policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view basic profile info for messaging" ON profiles;
DROP POLICY IF EXISTS "Allow anonymous read access to profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;

-- Create one clean, universal read policy for profiles
-- (Necessary so visitors can see the name/photo of the post owner)
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);


-- 2. CLEAN UP DOGS
-- Drop the complex 'EXISTS' policy which is likely timing out during joins
DROP POLICY IF EXISTS "Users can view their own dogs" ON dogs;
DROP POLICY IF EXISTS "Users can view dogs in active availability posts" ON dogs;
DROP POLICY IF EXISTS "Public dogs are viewable by everyone" ON dogs;
DROP POLICY IF EXISTS "Dogs are viewable if they belong to a post" ON dogs;

-- Simple policy: if the dog exists, let it be joined to a post
-- RLS on 'availability' will still protect the context
CREATE POLICY "Dogs are viewable by everyone" ON dogs
  FOR SELECT USING (true);


-- 3. FIX AVAILABILITY
-- Ensure the main 'active' policy is clean
DROP POLICY IF EXISTS "Users can view all active availability posts" ON availability;
CREATE POLICY "Users can view all active availability posts" ON availability
  FOR SELECT USING (status = 'active');

-- Ensure owners can always see their own posts (even if inactive)
DROP POLICY IF EXISTS "Users can view their own availability posts" ON availability;
CREATE POLICY "Users can view their own availability posts" ON availability
  FOR SELECT USING (auth.uid() = owner_id);