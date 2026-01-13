#!/usr/bin/env bash
set -e

ENV_FILE=".env.local"

command -v npx >/dev/null 2>&1 || { echo >&2 "Error: npx is required but not found. Please run 'npm install'."; exit 1; }

SUPABASE_STATUS=$(npx supabase status -o env)

extract_key_value() {
  echo "$SUPABASE_STATUS" | \
    grep "$1" | \
    sed -E 's/.*: (sb_.*)/\1/' | \
    tr -d '[:space:]"'
}

SERVICE_KEY_VALUE=$(extract_key_value "SERVICE_ROLE_KEY")
PUBLISHABLE_KEY_VALUE=$(extract_key_value "PUBLISHABLE_KEY")

if [ -z "$PUBLISHABLE_KEY_VALUE" ] || [ -z "$SERVICE_KEY_VALUE" ]; then
  echo "Error: Could not retrieve dynamic Supabase keys."
  echo "The output of 'npx supabase status -o env' was empty or malformed." >&2
  exit 1
fi

# Update the publishable key
sed -i -E "s/^(NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=).*$/\1$PUBLISHABLE_KEY_VALUE/" "$ENV_FILE"

sed -i -E "s/^(SUPABASE_SERVICE_ROLE_KEY=).*$/\1$SERVICE_KEY_VALUE/" "$ENV_FILE"

echo "✅ Supabase publishable and service role keys successfully updated in $ENV_FILE."
