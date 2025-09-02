import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Helper function to get the appropriate Supabase URL and key
function getSupabaseConfig() {
  const isLocal = process.env.NODE_ENV === "development" && 
                  process.env.NEXT_PUBLIC_SUPABASE_URL_LOCAL && 
                  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL;
  
  if (isLocal) {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL_LOCAL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL,
    };
  }
  
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const config = getSupabaseConfig();
  
  if (!config.url || !config.anonKey) {
    throw new Error("Supabase configuration is missing in middleware");
  }

  const supabase = createServerClient(
    config.url,
    config.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // refreshing the auth token
  await supabase.auth.getUser();

  return supabaseResponse;
}
