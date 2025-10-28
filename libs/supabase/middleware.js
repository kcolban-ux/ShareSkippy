import { createServerClient } from '@supabase/ssr';

export async function updateSession(request, response) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // response.cookies.setAll. Writing logic between the two will cause the
  // response headers to be lost, breaking the authentication flow.

  // Let Supabase handle its own session management
  // The createServerClient will automatically handle session refresh and cookie management
  await supabase.auth.getUser();

  return response;
}
