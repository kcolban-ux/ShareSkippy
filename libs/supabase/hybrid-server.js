import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Helper function to get the appropriate Supabase URL and key
function getSupabaseConfig() {
  const isLocal = process.env.NODE_ENV === "development" && 
                  process.env.NEXT_PUBLIC_SUPABASE_URL_LOCAL && 
                  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL;
  
  if (isLocal) {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL_LOCAL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL,
      isLocal: true
    };
  }
  
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    isLocal: false
  };
}

// Server client for server-side usage
export function createHybridServerClient() {
  const config = getSupabaseConfig();
  const cookieStore = cookies();
  
  if (!config.url || !config.anonKey) {
    throw new Error("Supabase configuration is missing");
  }
  
  console.log(`Using ${config.isLocal ? 'local' : 'remote'} Supabase instance:`, config.url);
  
  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

// Service role client for admin operations
export function createHybridServiceRoleClient() {
  const config = getSupabaseConfig();
  
  if (!config.url || !config.serviceRoleKey) {
    throw new Error("Supabase service role configuration is missing");
  }
  
  console.log(`Using ${config.isLocal ? 'local' : 'remote'} Supabase service role client:`, config.url);
  
  return createServerClient(config.url, config.serviceRoleKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // No-op for service role client
      },
    },
  });
}
