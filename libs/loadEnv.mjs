import dotenv from 'dotenv';
import path from 'node:path';

const FALLBACK_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'E2E_AUTH_SECRET',
  'E2E_TEST_USER_EMAIL',
  'E2E_TEST_USER_PASSWORD',
];

let hasRun = false;

export function ensureEnvDefaults() {
  if (hasRun) {
    return false;
  }

  hasRun = true;
  const envPath = path.resolve(process.cwd(), '.env');
  const parsed = dotenv.config({ path: envPath }).parsed;

  if (!parsed) {
    return false;
  }

  let didInject = false;

  for (const nextKey of FALLBACK_KEYS) {
    const fallbackValue = parsed[nextKey];
    if (!fallbackValue || !fallbackValue.trim()) {
      continue;
    }

    const currentValue = process.env[nextKey];
    if (currentValue && currentValue.trim()) {
      continue;
    }

    process.env[nextKey] = fallbackValue;
    didInject = true;
  }

  return didInject;
}
