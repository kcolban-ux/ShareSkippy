import { updateSession } from '@/libs/supabase/middleware';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  return await updateSession(request, response);
}

export const config = {
  unstable_allowDynamic: [
    './node_modules/@supabase/supabase-js/dist/module/index.js',
    './node_modules/@supabase/realtime-js/dist/module/index.js',
    './node_modules/@supabase/realtime-js/**',
    './node_modules/@supabase/supabase-js/**',
  ],
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
