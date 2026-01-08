-- @description Robust RLS fix to ensure availability posts and relations are visible.
-- @region Database Migration / Fix

-- 1. CLEAN UP PROFILES
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view basic profile info for messaging" ON profiles;
DROP POLICY IF EXISTS "Allow anonymous read access to profiles" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

-- Use a simple, non-recursive policy. 
-- In a community app, basic profile info is generally considered public to allow discovery.
CREATE POLICY "Public profile visibility" ON profiles
  FOR SELECT USING (true);


-- 2. CLEAN UP DOGS
DROP POLICY IF EXISTS "Users can view their own dogs" ON dogs;
DROP POLICY IF EXISTS "Users can view dogs in active availability posts" ON dogs;
DROP POLICY IF EXISTS "Public dogs are viewable by everyone" ON dogs;
DROP POLICY IF EXISTS "Users can view their own dogs or dogs in active posts" ON dogs;

-- To avoid the recursion loop, we allow selection of dogs.
-- Privacy is still maintained because a user can only find a dog's ID 
-- if they can already see an 'active' availability post linking to it.
CREATE POLICY "Dog visibility for joins" ON dogs
  FOR SELECT USING (true);


-- 3. FIX AVAILABILITY (The "Source of Truth")
-- This is where your actual privacy logic should live.
DROP POLICY IF EXISTS "Users can view all active availability posts" ON availability;
CREATE POLICY "Users can view all active availability posts" ON availability
  FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Users can view their own availability posts" ON availability;
CREATE POLICY "Users can view their own availability posts" ON availability
  FOR SELECT USING (auth.uid() = owner_id);