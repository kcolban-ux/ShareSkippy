import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

type E2EUser = {
  email: string;
  password: string;
  metadata: {
    first_name: string;
    last_name: string;
  };
};

const supabaseUrl =
  process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing Supabase configuration. Please set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in your environment.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const e2eUser: E2EUser = {
  email: process.env.E2E_TEST_USER_EMAIL ?? 'playwright@shareskippy.local',
  password: process.env.E2E_TEST_USER_PASSWORD ?? 'Playwright123!',
  metadata: {
    first_name: 'Playwright',
    last_name: 'Tester',
  },
};

async function deleteExistingUser(email: string) {
  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    throw error;
  }

  const matchingUsers = data.users.filter((user) => user.email === email);

  if (!matchingUsers.length) {
    return;
  }

  await Promise.all(matchingUsers.map((user) => supabase.auth.admin.deleteUser(user.id)));
}

async function seedUser() {
  await deleteExistingUser(e2eUser.email);

  const { data, error } = await supabase.auth.admin.createUser({
    email: e2eUser.email,
    password: e2eUser.password,
    email_confirm: true,
    user_metadata: e2eUser.metadata,
  });

  if (error) {
    throw error;
  }

  if (!data?.user) {
    throw new Error('Failed to create Playwright E2E user.');
  }

  const profilePayload = {
    id: data.user.id,
    email: e2eUser.email,
    first_name: e2eUser.metadata.first_name,
    last_name: e2eUser.metadata.last_name,
    role: 'owner',
  };

  const { error: profileError } = await supabase.from('profiles').upsert(profilePayload, {
    onConflict: 'id',
  });

  if (profileError) {
    throw profileError;
  }

  return data.user;
}

async function seedDog(ownerId: string) {
  await supabase.from('dogs').delete().eq('owner_id', ownerId);

  const { data, error } = await supabase
    .from('dogs')
    .insert({
      id: randomUUID(),
      owner_id: ownerId,
      name: 'Playwright Pup',
      size: '11-25',
      temperament: ['friendly', 'calm'],
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Failed to insert dog for Playwright user.');
  }

  return data.id;
}

async function seedAvailability(ownerId: string, dogId: string) {
  const { error: cleanupError } = await supabase
    .from('availability')
    .delete()
    .eq('owner_id', ownerId);
  if (cleanupError) {
    throw cleanupError;
  }

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const payload = {
    id: randomUUID(),
    owner_id: ownerId,
    dog_id: dogId,
    post_type: 'dog_available',
    title: 'Playwright test availability',
    description: 'Seeded availability for Playwright smoke tests.',
    start_date: today.toISOString().split('T')[0],
    end_date: tomorrow.toISOString().split('T')[0],
    duration_minutes: 60,
    status: 'active',
  };

  const { error: insertError } = await supabase.from('availability').insert(payload);

  if (insertError) {
    throw insertError;
  }
}

async function main() {
  console.log('Seeding Playwright E2E data...');
  const user = await seedUser();
  if (!user || !user.id) {
    throw new Error('User creation failed or missing user id.');
  }
  const dogId = await seedDog(user.id);
  await seedAvailability(user.id, dogId);
  console.log('Seeding complete. E2E test user created successfully.');
}

(async () => {
  try {
    await main();
  } catch (error) {
    console.error('Playwright seed failed:', error);
    process.exit(1);
  }
})();
