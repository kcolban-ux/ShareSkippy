'use client';

import { useEffect, useMemo } from 'react'; // Removed useState
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import config from '@/config';
import type { User } from '@supabase/supabase-js';

// Define the return type for the hook
interface ProtectedRouteResult {
  /**
   * The authenticated Supabase user object, or null if not authenticated.
   */
  user: User | null;
  /**
   * True if the authentication state is still being resolved, false otherwise.
   */
  isLoading: boolean;
}

/**
 * @description A custom hook to protect a client-side route.
 *
 * It uses the `useUser` context to check the auth state.
 * 1. Shows a loading state while auth is resolving.
 * 2. If auth is resolved and no user is found, it redirects to the login page.
 * 3. If a user is found, it returns the user and a 'false' loading state.
 *
 * @returns {ProtectedRouteResult} An object containing the user and loading state.
 */
export const useProtectedRoute = (): ProtectedRouteResult => {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  // Use a memoized value for the final loading state
  const isLoading: boolean = useMemo(() => {
    // We are loading if the user context is still resolving
    if (userLoading) {
      return true;
    }
    // We are considered loading if the context is resolved but we have no user,
    // as we are waiting for the redirect to complete.
    if (!user) {
      return true;
    }
    // Auth is complete, and a user is present.
    return false;
  }, [user, userLoading]);

  useEffect(() => {
    // Only run redirection logic when userLoading is false and no user is present.
    // userLoading being false means the auth state is resolved.
    if (!userLoading && !user) {
      router.push(config.auth.loginUrl);
    }
    // This effect handles only the side-effect (redirection) and avoids setting state.
  }, [user, userLoading, router]);

  // The caller needs to handle the `isLoading` state before rendering protected content.
  return { user, isLoading };
};
