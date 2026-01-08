'use client';

import { renderHook, act, waitFor } from '@testing-library/react';
import { useUser, useSupabaseAuth } from './hooks';
import type { User, Session } from '@supabase/supabase-js';

// --- Mock data
const mockUser: User = {
  id: 'user-123',
  app_metadata: {},
  user_metadata: { name: 'Test' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

const mockSession: Session = {
  access_token: 'access',
  refresh_token: 'refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
};

// --- Mocks
const mockGetUser = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockSignOut = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('./client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
      // eslint-disable-next-line no-unused-vars
      onAuthStateChange: (cb: (event: string, session: Session | null) => void) =>
        mockOnAuthStateChange(cb),
      signOut: mockSignOut,
    },
  })),
}));

// expose typed auth callback on globalThis for tests
// eslint-disable-next-line no-unused-vars
type AuthChangeCallback = (event: string, session: Session | null) => void;

declare global {
  var authCallback: AuthChangeCallback | undefined;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
  mockOnAuthStateChange.mockImplementation((callback: AuthChangeCallback) => {
    globalThis.authCallback = callback;
    return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
  });
  mockSignOut.mockResolvedValue({ error: null });
});

describe('useUser', () => {
  it('loads initial user and subscribes to auth changes', async () => {
    const { result } = renderHook(() => useUser());

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBe(null);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toBe(mockUser);
    });

    expect(mockGetUser).toHaveBeenCalled();
    expect(mockOnAuthStateChange).toHaveBeenCalled();
  });

  it('updates user on auth state change and clears on sign out', async () => {
    const { result } = renderHook(() => useUser());

    await waitFor(() => expect(result.current.user).toBe(mockUser));

    const newUser = { ...mockUser, id: 'user-456' } as User;
    const newSession = { ...mockSession, user: newUser } as Session;

    act(() => {
      globalThis.authCallback?.('SIGNED_IN', newSession);
    });

    expect(result.current.user).toBe(newUser);

    act(() => globalThis.authCallback?.('SIGNED_OUT', null));

    expect(result.current.user).toBe(null);
  });

  it('unsubscribes on unmount', async () => {
    const { unmount } = renderHook(() => useUser());

    await waitFor(() => expect(mockOnAuthStateChange).toHaveBeenCalled());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});

describe('useSupabaseAuth', () => {
  it('loads initial user and provides signOut', async () => {
    const { result } = renderHook(() => useSupabaseAuth());

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBe(null);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toBe(mockUser);
    });

    expect(typeof result.current.signOut).toBe('function');
    expect(mockGetUser).toHaveBeenCalled();
    expect(mockOnAuthStateChange).toHaveBeenCalled();
  });

  it('signOut clears user on success', async () => {
    const { result } = renderHook(() => useSupabaseAuth());

    await waitFor(() => expect(result.current.user).toBe(mockUser));

    let signOutRes: { error: Error | null } | undefined;
    await act(async () => {
      signOutRes = await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(signOutRes?.error).toBeNull();

    // simulate auth listener when sign out completes
    act(() => globalThis.authCallback?.('SIGNED_OUT', null));

    await waitFor(() => expect(result.current.user).toBeNull());
  });

  it('does not clear user on signOut error and returns error', async () => {
    const error = new Error('Sign out failed');
    mockSignOut.mockResolvedValueOnce({ error });

    const { result } = renderHook(() => useSupabaseAuth());

    await waitFor(() => expect(result.current.user).toBe(mockUser));

    let signOutRes: { error: Error | null } | undefined;
    await act(async () => {
      signOutRes = await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(result.current.user).toBe(mockUser);
    expect(signOutRes?.error).toBe(error);
  });

  it('unsubscribes on unmount', async () => {
    const { unmount } = renderHook(() => useSupabaseAuth());

    await waitFor(() => expect(mockOnAuthStateChange).toHaveBeenCalled());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
