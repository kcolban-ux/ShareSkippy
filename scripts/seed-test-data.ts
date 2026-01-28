import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

/**
 * Represents a Playwright E2E user used for seeding test data.
 */
type E2EUser = {
  /** User email address used for sign-in. */
  email: string;
  /** Plaintext password for the test account. */
  password: string;
  /** Minimal user metadata required by the application. */
  metadata: {
    first_name: string;
    last_name: string;
  };
};

// Default to local Supabase demo URL if not specified
const supabaseUrl =
  process.env.SUPABASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  'http://localhost:54321';

/**
 * Service role key used for seeding test data.
 *
 * This value must be provided via the SUPABASE_SERVICE_ROLE_KEY environment
 * variable. A hardcoded fallback is intentionally not provided to avoid
 * encouraging use of demo keys or leaking secrets in version control.
 */
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

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

/**
 * Delete any existing users that match the given email.
 *
 * This keeps the seeding operation idempotent by removing previously created
 * test accounts before re-creating them.
 *
 * @param email - The email address to remove from the Auth user list.
 * @throws If the Supabase admin API returns an error.
 */
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

/**
 * Create the Playwright E2E user and ensure a matching `profiles` row exists.
 *
 * The function first removes any existing users with the same email to
 * keep the operation idempotent. It uses the Supabase Admin API to create
 * the user and then upserts a profile record matching the new user's id.
 *
 * @returns The created Supabase user object.
 * @throws If user creation or profile upsert fails.
 */
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
    role: 'dog_owner',
  };

  const { error: profileError } = await supabase.from('profiles').upsert(profilePayload, {
    onConflict: 'id',
  });

  if (profileError) {
    throw profileError;
  }

  return data.user;
}

/**
 * Seed a dog record for the provided owner id.
 *
 * Any existing dogs for the owner are deleted first to keep seeding idempotent.
 *
 * @param ownerId - Supabase user id of the dog owner.
 * @returns The `id` of the newly inserted dog row.
 * @throws If the insert operation fails or returns no data.
 */
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

/**
 * Insert a single availability post for the seeded user and dog.
 *
 * This removes existing availability posts for the owner before inserting a
 * predictable test availability entry (today → tomorrow).
 *
 * @param ownerId - Supabase user id of the owner.
 * @param dogId - The id of the dog's row to associate with the availability.
 * @throws If deletion or insertion returns an error.
 */
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

/**
 * Top-level seeding routine.
 *
 * - Creates the E2E user
 * - Inserts a dog for that user
 * - Adds a single availability post for testing
 *
 * Throws on any error encountered during the seeding steps.
 */
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
    // Check if it's a connection error
    if (error && typeof error === 'object' && 'cause' in error) {
      const cause = error.cause as unknown;
      if (cause && typeof cause === 'object' && 'code' in cause) {
        const code = (cause as { code?: unknown }).code;
        if (code === 'ECONNREFUSED') {
          console.error('\n❌ Cannot connect to Supabase at', supabaseUrl);
          console.error('💡 Please start Supabase first: npx supabase start\n');
          process.exit(1);
        }
      }
    }
    console.error('Playwright seed failed:', error);
    process.exit(1);
  }
})();
