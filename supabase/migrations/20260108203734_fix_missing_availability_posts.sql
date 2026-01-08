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

-- Create a clean, restricted read policy for profiles
-- Allow:
--   - Each authenticated user to view their own profile.
--   - Anyone (including anonymous visitors) to view profiles that own at least one
--     active availability post, so availability listings can show the owner's name/photo.
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1
      FROM availability a
      WHERE a.owner_id = profiles.id
        AND a.status = 'active'
    )
  );


-- 2. CLEAN UP DOGS
-- Drop the complex 'EXISTS' policy which is likely timing out during joins
DROP POLICY IF EXISTS "Users can view their own dogs" ON dogs;
DROP POLICY IF EXISTS "Users can view dogs in active availability posts" ON dogs;
DROP POLICY IF EXISTS "Public dogs are viewable by everyone" ON dogs;
DROP POLICY IF EXISTS "Dogs are viewable if they belong to a post" ON dogs;

-- Policy: users can see their own dogs, or dogs that appear in active availability posts
-- This maintains privacy for unrelated dogs while keeping joins performant.
CREATE POLICY "Users can view their own dogs or dogs in active posts" ON dogs
  FOR SELECT USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1
      FROM availability a
      JOIN availability_dogs ad ON ad.availability_id = a.id
      WHERE ad.dog_id = dogs.id
        AND a.status = 'active'
    )
  );


-- 3. FIX AVAILABILITY
-- Ensure the main 'active' policy is clean
DROP POLICY IF EXISTS "Users can view all active availability posts" ON availability;
CREATE POLICY "Users can view all active availability posts" ON availability
  FOR SELECT USING (status = 'active');

-- Ensure owners can always see their own posts (even if inactive)
DROP POLICY IF EXISTS "Users can view their own availability posts" ON availability;
CREATE POLICY "Users can view their own availability posts" ON availability
  FOR SELECT USING (auth.uid() = owner_id);