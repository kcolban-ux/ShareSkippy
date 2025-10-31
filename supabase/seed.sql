-- =================================================================
-- User 1: Main test user (Local Tester)
-- Role: dog_owner
-- Dogs: 1 (Skippy)
-- Posts: 1 ACTIVE 'petpal_available'
-- =================================================================
INSERT INTO auth.users (id, email, encrypted_password, role, aud)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'local.tester@example.com',
  '$2a$10$t5.w.k.1X.g0e.G.A...oOfP5.1.B.a/6.N/7.8.t5.w.k.1X.g0', -- dummy hash
  'authenticated',
  'authenticated'
);

INSERT INTO public.profiles (
  id,
  first_name,
  last_name,
  email,
  city,
  state,
  neighborhood,
  bio,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Local',
  'Tester',
  'local.tester@example.com',
  'Brooklyn',
  'NY',
  'Williamsburg',
  'This is a test bio for Local Tester. I own one dog and am looking to help others out as a petpal.',
  'dog_owner'
);

INSERT INTO public.dogs (
  id,
  owner_id,
  name,
  breed,
  size,
  gender
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Skippy',
  'Border Collie',
  '26-40',
  'male'
);

INSERT INTO public.availability (
  owner_id,
  post_type,
  title,
  description,
  status,
  dog_ids
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'petpal_available',
  'Available for PetPals this Weekend',
  'I am free to help watch a dog or go for a walk this Saturday or Sunday.',
  'active',
  ARRAY['10000000-0000-0000-0000-000000000001']::uuid[]
);

-- =================================================================
-- User 2: PetPal user (Jane Petpal)
-- Role: petpal
-- Dogs: 0
-- Posts: 1 ACTIVE 'petpal_available'
-- =================================================================
INSERT INTO auth.users (id, email, encrypted_password, role, aud)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'jane.petpal@example.com',
  '$2a$10$t5.w.k.1X.g0e.G.A...oOfP5.1.B.a/6.N/7.8.t5.w.k.1X.g0',
  'authenticated',
  'authenticated'
);

INSERT INTO public.profiles (
  id,
  first_name,
  last_name,
  email,
  city,
  state,
  neighborhood,
  bio,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Jane',
  'Petpal',
  'jane.petpal@example.com',
  'Manhattan',
  'NY',
  'East Village',
  'I am a PetPal with no dogs of my own. I love animals and am happy to help care for yours!',
  'petpal'
);

INSERT INTO public.availability (
  owner_id,
  post_type,
  title,
  description,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'petpal_available',
  'Ready to walk!',
  'Available for dog walking on weeknights in the East Village.',
  'active'
);

-- =================================================================
-- User 3: Dog Owner (Bob Withdogs)
-- Role: both
-- Dogs: 2 (Buddy, Lucy)
-- Posts: 1 ACTIVE 'dog_available' (needs care)
-- =================================================================
INSERT INTO auth.users (id, email, encrypted_password, role, aud)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'bob.withdogs@example.com',
  '$2a$10$t5.w.k.1X.g0e.G.A...oOfP5.1.B.a/6.N/7.8.t5.w.k.1X.g0', -- dummy hash
  'authenticated',
  'authenticated'
);

INSERT INTO public.profiles (
  id,
  first_name,
  last_name,
  email,
  city,
  state,
  neighborhood,
  bio,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  'Bob',
  'Withdogs',
  'bob.withdogs@example.com',
  'Brooklyn',
  'NY',
  'Park Slope',
  'I have two lovely dogs and am also available to help others. Looking for a sitter for next month.',
  'both'
);

INSERT INTO public.dogs (
  id,
  owner_id,
  name,
  breed,
  size,
  gender
) VALUES (
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  'Buddy',
  'Golden Retriever',
  '71-90',
  'male'
);

INSERT INTO public.dogs (
  id,
  owner_id,
  name,
  breed,
  size,
  gender
) VALUES (
  '10000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000003',
  'Lucy',
  'Beagle',
  '26-40',
  'female'
);

INSERT INTO public.availability (
  owner_id,
  post_type,
  title,
  description,
  status,
  dog_ids
) VALUES (
  '00000000-0000-0000-0000-000000000003', -- User 3 ID
  'dog_available',
  'Need sitter for my 2 dogs',
  'Going on vacation and need someone to watch Buddy and Lucy.',
  'active',
  ARRAY['10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003']::uuid[] -- Links both dogs
);

-- =================================================================
-- User 4: Incomplete user
-- Role: n/a
-- Dogs: 0
-- Posts: 0
-- Has an auth account but NO profile.
-- =================================================================
INSERT INTO auth.users (id, email, encrypted_password, role, aud)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  'inactive.user@example.com',
  '$2a$10$t5.w.k.1X.g0e.G.A...oOfP5.1.B.a/6.N/7.8.t5.w.k.1X.g0', -- dummy hash
  'authenticated',
  'authenticated'
);

-- =================================================================
-- User 5: Community Page User (Alex Community)
-- Role: both
-- Dogs: 0
-- Posts: 0 (This user SHOULD appear on the community page)
-- =================================================================
INSERT INTO auth.users (id, email, encrypted_password, role, aud)
VALUES (
  '00000000-0000-0000-0000-000000000005',
  'alex.community@example.com',
  '$2a$10$t5.w.k.1X.g0e.G.A...oOfP5.1.B.a/6.N/7.8.t5.w.k.1X.g0', -- dummy hash
  'authenticated',
  'authenticated'
);

INSERT INTO public.profiles (
  id,
  first_name,
  last_name,
  email,
  city,
  state,
  neighborhood,
  bio,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000005',
  'Alex',
  'Community',
  'alex.community@example.com',
  'Queens',
  'NY',
  'Astoria',
  'I am a user with a full profile but no active posts. I should be visible on the main community page.',
  'both'
);

-- =================================================================
-- User 6: User with Inactive Post (Casey Inactive)
-- Role: petpal
-- Dogs: 0
-- Posts: 1 INACTIVE 'petpal_available'
-- (This user SHOULD also appear on the community page)
-- =================================================================
INSERT INTO auth.users (id, email, encrypted_password, role, aud)
VALUES (
  '00000000-0000-0000-0000-000000000006',
  'casey.inactive@example.com',
  '$2a$10$t5.w.k.1X.g0e.G.A...oOfP5.1.B.a/6.N/7.8.t5.w.k.1X.g0', -- dummy hash
  'authenticated',
  'authenticated'
);

INSERT INTO public.profiles (
  id,
  first_name,
  last_name,
  email,
  city,
  state,
  neighborhood,
  bio,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000006',
  'Casey',
  'Inactive',
  'casey.inactive@example.com',
  'Bronx',
  'NY',
  'Riverdale',
  'I have an old, inactive availability post. I should still be visible on the community page.',
  'petpal'
);

INSERT INTO public.availability (
  owner_id,
  post_type,
  title,
  description,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000006',
  'petpal_available',
  'Was available last month',
  'My availability post from last month, which is now inactive.',
  'inactive'
);