import { createBrowserClient } from "@supabase/ssr";

// Helper function to get the appropriate Supabase URL and key
function getSupabaseConfig() {
  // For client-side, we can only access NEXT_PUBLIC_ environment variables
  const isLocal = process.env.NODE_ENV === "development" && 
                  process.env.NEXT_PUBLIC_SUPABASE_URL_LOCAL && 
                  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL;
  
  if (isLocal) {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL_LOCAL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL,
      isLocal: true
    };
  }
  
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    isLocal: false
  };
}

// Browser client for client-side usage
export function createHybridBrowserClient() {
  const config = getSupabaseConfig();
  
  if (!config.url || !config.anonKey) {
    throw new Error("Supabase configuration is missing");
  }
  
  console.log(`Using ${config.isLocal ? 'local' : 'remote'} Supabase instance:`, config.url);
  
  return createBrowserClient(config.url, config.anonKey);
}

// Utility function to check which instance is being used (client-safe)
export function getCurrentSupabaseInstance() {
  const config = getSupabaseConfig();
  
  if (!config.url || !config.anonKey) {
    throw new Error("Supabase configuration is missing");
  }
  
  return config;
}
