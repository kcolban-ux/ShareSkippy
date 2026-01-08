'use client';

import { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  FC,
  useMemo,
  useCallback,
} from 'react';
import { createClient } from '@/lib/supabase/client';

// 1. Define the Context Value Type
interface UserContextType {
  user: User | null;
  session: Session | null;
  signOut: () => Promise<{ error: Error | null }>;
  loading: boolean;
}

// 2. Create the Context
const UserContext = createContext<UserContextType | undefined>(undefined);

/**
 * Custom hook to access the authenticated user, session, loading state, and sign-out function.
 */
export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a SupabaseUserProvider.');
  }
  return context;
}

interface SupabaseUserProviderProps {
  initialSession: Session | null;
  children: ReactNode;
}

/**
 * Supplies Supabase auth context to descendant components, handling hydration and sign-out logic.
 *
 * @param props.initialSession - SSR-provided session used to prevent flash-of-unauthenticated content.
 * @param props.children - Descendant UI that relies on `useUser`.
 */
export const SupabaseUserProvider: FC<SupabaseUserProviderProps> = ({
  initialSession,
  children,
}) => {
  const supabase = createClient();

  const [session, setSession] = useState<Session | null>(initialSession);
  const [user, setUser] = useState<User | null>(initialSession?.user || null);
  const [saving, setSaving] = useState<boolean>(false);

  // Set initial auth loading based on whether a session was passed in
  // If initialSession is null, we are loading; otherwise, we are done.
  const [authLoading, setAuthLoading] = useState<boolean>(!initialSession);

  useEffect(() => {
    let _isMounted = true; // Flag to prevent state update on unmounted component

    // 1. Set up the real-time listener for *subsequent* auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // This handles sign-outs, token refreshes, etc.
      if (_isMounted) {
        setSession(newSession);
        setUser(newSession?.user || null);
      }
    });

    // 2. Handle the *initial* client-side session load
    const getInitialClientSession = async () => {
      // We only run this if authLoading is true (meaning initialSession was null)
      if (_isMounted) {
        // getSession() will parse the URL hash from the auth redirect
        const {
          data: { session: newSession },
        } = await supabase.auth.getSession();

        // Only update state if the component is still mounted
        if (_isMounted) {
          setSession(newSession);
          setUser(newSession?.user || null);
          setAuthLoading(false); // Initial load is now complete.
        }
      }
    };

    // Run the initial load function only if the server didn't provide the session.
    if (authLoading) {
      getInitialClientSession();
    }

    return () => {
      _isMounted = false; // Cleanup flag
      subscription?.unsubscribe();
    };

    // This effect MUST only run once on mount.
  }, [supabase, authLoading]);

  const signOut = useCallback(async () => {
    setSaving(true);
    let finalError: Error | null = null;

    try {
      const logoutResponse = await fetch('/api/auth/logout', {
        method: 'POST',
        cache: 'no-store',
      });

      if (!logoutResponse.ok) {
        const serverMessage =
          (await logoutResponse.text()) ?? 'Failed to revoke session on server.';
        throw new Error(serverMessage);
      }

      const { error: authError } = await supabase.auth.signOut();
      if (authError) {
        throw authError;
      }
    } catch (error) {
      console.error('Error signing out:', error);
      const fallback = typeof error === 'string' ? error : 'Unexpected logout error';
      finalError = error instanceof Error ? error : new Error(fallback);
    } finally {
      setSaving(false);
    }

    if (!finalError) {
      setUser(null);
      setSession(null);
    }

    return { error: finalError };
  }, [supabase]); // Supabase client is stable, state setters are stable

  const value: UserContextType = useMemo(
    () => ({
      user,
      session,
      signOut,
      loading: authLoading || saving,
    }),
    [user, session, signOut, authLoading, saving]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
