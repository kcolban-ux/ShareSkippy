'use client';

import { renderHook, act, waitFor } from '@testing-library/react';
import { useUser, useSupabaseAuth } from './hooks';
import type { User, Session } from '@supabase/supabase-js';

// #region Mocks and Setup
// ========================================================================= //

/**
 * Mock User object for testing.
 */
const mockUser: User = {
  id: 'a0e-user-id-123',
  app_metadata: {},
  user_metadata: { name: 'Test User' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

/**
 * Mock Session object for testing.
 */
const mockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
};

// --- Supabase Mock ---

// Mock functions to spy on
const mockGetUser = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockSignOut = jest.fn();
const mockUnsubscribe = jest.fn();

/**
 * Mock the entire './index' module to control the supabase client.
 */
jest.mock('./index', () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
      // eslint-disable-next-line no-unused-vars
      onAuthStateChange: (callback: (event: string, session: Session | null) => void) =>
        mockOnAuthStateChange(callback),
      signOut: () => mockSignOut(),
    },
  },
}));

/**
 * Type alias for the auth state change callback.
 */
// eslint-disable-next-line no-unused-vars
type AuthChangeCallback = (event: string, session: Session | null) => void;

/**
 * Extend the globalThis type to include our mock callback for tests.
 * This removes the need for `as any`.
 */
declare global {
  var authCallback: AuthChangeCallback | undefined;
}

// --- Test Hooks ---

beforeEach(() => {
  // Clear all mock call history before each test
  jest.clearAllMocks();

  // Reset default mock implementations
  mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
  mockOnAuthStateChange.mockImplementation((callback: AuthChangeCallback) => {
    // Store the callback to trigger it manually
    globalThis.authCallback = callback;
    return {
      data: {
        subscription: { unsubscribe: mockUnsubscribe },
      },
    };
  });
  mockSignOut.mockResolvedValue({ error: null });
});

// #endregion Mocks and Setup
// ========================================================================= //

// #region useUser
// ========================================================================= //

describe('useUser', () => {
  /**
   * @test Tests the initial state and successful data fetching.
   */
  it('should start loading, then set user from getUser', async () => {
    const { result } = renderHook(() => useUser());

    // 1. Initial state
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBe(null);

    // 2. Wait for useEffect's async getUser to resolve
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toBe(mockUser);
    });

    // 3. Verify mocks were called
    expect(mockGetUser).toHaveBeenCalledTimes(1);
    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
  });

  /**
   * @test Tests that the onAuthStateChange listener updates the user.
   */
  it('should update user when onAuthStateChange fires', async () => {
    const { result } = renderHook(() => useUser());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.user).toBe(mockUser);
    });

    const newUser: User = { ...mockUser, id: 'new-user-456' };
    const newSession: Session = { ...mockSession, user: newUser };

    // 1. Simulate SIGNED_IN event
    act(() => {
      // Use optional chaining as globalThis.authCallback is typed as potentially undefined
      globalThis.authCallback?.('SIGNED_IN', newSession);
    });

    expect(result.current.loading).toBe(false); // Stays false
    expect(result.current.user).toBe(newUser);

    // 2. Simulate SIGNED_OUT event
    act(() => {
      globalThis.authCallback?.('SIGNED_OUT', null);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBe(null);
  });

  /**
   * @test Tests the cleanup function for the subscription.
   */
  it('should unsubscribe on unmount', async () => {
    const { unmount } = renderHook(() => useUser());

    // Wait for effect to run
    await waitFor(() => {
      expect(mockOnAuthStateChange).toHaveBeenCalled();
    });

    // Trigger cleanup
    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});

// #endregion useUser
// ========================================================================= //

// #region useSupabaseAuth
// ========================================================================= //

describe('useSupabaseAuth', () => {
  /**
   * @test Tests the initial state and successful data fetching.
   */
  it('should start loading, then set user from getUser', async () => {
    const { result } = renderHook(() => useSupabaseAuth());

    // 1. Initial state
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBe(null);

    // 2. Wait for useEffect's async getUser to resolve
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toBe(mockUser);
    });

    expect(mockGetUser).toHaveBeenCalledTimes(1);
    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
  });

  /**
   * @test Tests that the onAuthStateChange listener updates the user.
   */
  it('should update user when onAuthStateChange fires', async () => {
    const { result } = renderHook(() => useSupabaseAuth());

    await waitFor(() => {
      expect(result.current.user).toBe(mockUser);
    });

    // Simulate SIGNED_OUT event
    act(() => {
      globalThis.authCallback?.('SIGNED_OUT', null);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBe(null);
  });

  /**
   * @test Tests the cleanup function for the subscription.
   */
  it('should unsubscribe on unmount', async () => {
    const { unmount } = renderHook(() => useSupabaseAuth());

    await waitFor(() => {
      expect(mockOnAuthStateChange).toHaveBeenCalled();
    });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  /**
   * @test Tests the signOut function on a successful call.
   */
  it('should call supabase.auth.signOut and set user to null on success', async () => {
    const { result } = renderHook(() => useSupabaseAuth());

    // Wait for user to be set
    await waitFor(() => {
      expect(result.current.user).toBe(mockUser);
    });

    let signOutResult: { error: Error | null } | undefined;

    // Call signOut
    await act(async () => {
      signOutResult = await result.current.signOut();
    });

    // 1. Check mock
    expect(mockSignOut).toHaveBeenCalledTimes(1);

    // 2. Check hook state
    expect(result.current.user).toBe(null);

    // 3. Check returned value
    expect(signOutResult?.error).toBe(null);
  });

  /**
   * @test Tests the signOut function when it returns an error.
   */
  it('should return an error and not clear user on signOut failure', async () => {
    const mockError = new Error('SignOut Failed');
    mockSignOut.mockResolvedValue({ error: mockError });

    const { result } = renderHook(() => useSupabaseAuth());

    // Wait for user to be set
    await waitFor(() => {
      expect(result.current.user).toBe(mockUser);
    });

    let signOutResult: { error: Error | null } | undefined;

    // Call signOut
    await act(async () => {
      signOutResult = await result.current.signOut();
    });

    // 1. Check mock
    expect(mockSignOut).toHaveBeenCalledTimes(1);

    // 2. Check hook state (user should NOT be cleared)
    expect(result.current.user).toBe(mockUser);

    // 3. Check returned value
    expect(signOutResult?.error).toBe(mockError);
  });
});

// #endregion useSupabaseAuth
// ========================================================================= //
