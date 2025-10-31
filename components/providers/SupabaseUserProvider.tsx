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
  const [loading, setLoading] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!session) {
      setAuthLoading(true);
      supabase.auth.getSession().then(({ data: { session: newSession } }) => {
        setSession(newSession);
        setUser(newSession?.user || null);
        setAuthLoading(false);
      });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user || null);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase, session]);

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
    }
    setLoading(false);
    return { error };
  };

  const value: UserContextType = {
    user,
    session,
    signOut,
    loading: authLoading || loading,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
