// #region Imports
'use client';

import { useEffect, useState } from 'react';
import { supabase } from './index'; // Assuming './index' exports the initialized Supabase client instance
import { AuthError, Session, Subscription, User } from '@supabase/supabase-js';
// #endregion Imports

// #region Types
/**
 * @interface UserHookReturn
 * @description The return signature for the useUser hook.
 */
interface UserHookReturn {
  user: User | null;
  loading: boolean;
}

/**
 * @interface SupabaseAuthHookReturn
 * @description The return signature for the useSupabaseAuth hook.
 * Extends the basic return with authentication actions.
 */
interface SupabaseAuthHookReturn extends UserHookReturn {
  signOut: () => Promise<{ error: AuthError | null }>;
}
// #endregion Types

// #region Hooks
/**
 * @hook useUser
 * @description Provides the current Supabase user session data and loading status.
 * @returns {UserHookReturn}
 */
export function useUser(): UserHookReturn {
  // FIX: State explicitly typed as User | null
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // #region Initial Load
    /**
     * @async
     * @function getUser
     * @description Fetches the initial user session upon component mount.
     */
    const getUser = async (): Promise<void> => {
      const {
        data: { user: currentUser }, // Rename local variable to avoid conflict
      } = await supabase.auth.getUser();
      setUser(currentUser);
      setLoading(false);
    };

    getUser();
    // #endregion Initial Load

    // #region Auth State Change Subscription
    // FIX: Explicitly type the subscription data structure
    const {
      data: { subscription },
    }: { data: { subscription: Subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        // FIX: Ensure session?.user is used safely
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // FIX: Ensure cleanup function unsubscribes
    return () => subscription.unsubscribe();
    // #endregion Auth State Change Subscription
  }, []);

  return { user, loading };
}

/**
 * @hook useSupabaseAuth
 * @description Provides the current Supabase user session data, loading status, and signOut function.
 * @returns {SupabaseAuthHookReturn}
 */
export function useSupabaseAuth(): SupabaseAuthHookReturn {
  // FIX: State explicitly typed as User | null
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // #region Initial Load
    const getUser = async (): Promise<void> => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);
      setLoading(false);
    };

    getUser();
    // #endregion Initial Load

    // #region Auth State Change Subscription
    const {
      data: { subscription },
    }: { data: { subscription: Subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
    // #endregion Auth State Change Subscription
  }, []);

  /**
   * @async
   * @function signOut
   * @description Handles signing out the user.
   * @returns {Promise<{ error: AuthError | null }>}
   */
  const signOut = async (): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
    }
    return { error };
  };

  return { user, loading, signOut };
}
// #endregion Hooks
