'use client';

import { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useState, useEffect, ReactNode, FC } from 'react';
import { createClient } from '@/libs/supabase/client';

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

export const SupabaseUserProvider: FC<SupabaseUserProviderProps> = ({
  initialSession,
  children,
}) => {
  const supabase = createClient();

  const [session, setSession] = useState<Session | null>(initialSession);
  const [user, setUser] = useState<User | null>(initialSession?.user || null);
  // Renamed internal 'loading' to 'saving' for clarity (tracks sign-out)
  const [saving, setSaving] = useState<boolean>(false);

  // Set initial auth loading based on whether a session was passed in
  // If initialSession is null, we are loading; otherwise, we are done.
  const [authLoading, setAuthLoading] = useState<boolean>(!initialSession);

  useEffect(() => {
    let _isMounted = true; // Flag to prevent state update on unmounted component

    // 1. Fetch Session if we didn't receive one from the server (Server is our source of truth)
    if (!initialSession) {
      // NOTE: We do NOT call setAuthLoading(true) here, as it's initialized that way.
      supabase.auth.getSession().then(({ data: { session: newSession } }) => {
        if (_isMounted) {
          setSession(newSession);
          setUser(newSession?.user || null);
          setAuthLoading(false); // Only set to false when session is resolved
        }
      });
    }

    // 2. Set up the real-time listener for Auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (_isMounted) {
        setSession(newSession);
        setUser(newSession?.user || null);

        // Ensure authLoading is false after the first state change listener fires
        if (authLoading) {
          setAuthLoading(false);
        }
      }
    });

    return () => {
      _isMounted = false; // Cleanup flag
      subscription?.unsubscribe();
    };
  }, [supabase, initialSession, authLoading]);

  const signOut = async () => {
    setSaving(true);
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
    }
    setSaving(false);
    return { error };
  };

  const value: UserContextType = {
    user,
    session,
    signOut,
    loading: authLoading || saving, // FIX: Combined authLoading with new 'saving' state
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
