import '@testing-library/jest-dom';
import { describe, it, expect, jest, beforeEach, afterEach, beforeAll } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

const mockCreateClient = jest.fn<() => ReturnType<typeof createClient>>();

jest.mock('@/lib/supabase/client', () => ({
  createClient: mockCreateClient,
}));

type BrowserClient = Awaited<ReturnType<typeof import('@/lib/supabase/client').createClient>>;

let SupabaseUserProvider: typeof import('./SupabaseUserProvider').SupabaseUserProvider;
let useUserHook: typeof import('./SupabaseUserProvider').useUser;

beforeAll(async () => {
  // @ts-expect-error NodeNext requires extension enforcement, but Jest's ts-jest resolves the .tsx file at runtime.
  const routeModule = await import('./SupabaseUserProvider');
  SupabaseUserProvider = routeModule.SupabaseUserProvider;
  useUserHook = routeModule.useUser;
});

describe('SupabaseUserProvider', () => {
  const mockSignOut = jest.fn<() => Promise<{ error: Error | null }>>();
  const mockOnAuthStateChange = jest.fn(() => ({
    data: { subscription: { unsubscribe: jest.fn() } },
  }));
  const mockGetSession = jest.fn<() => Promise<{ data: { session: Session | null } }>>();
  const supabaseClient = {
    auth: {
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange,
      getSession: mockGetSession,
    },
  } as unknown as BrowserClient;

  const TestConsumer = () => {
    if (!useUserHook) {
      throw new Error('useUser hook not initialized');
    }
    const { user, signOut, loading } = useUserHook();

    return (
      <div>
        <span data-testid="user-id">{user?.id ?? 'no-user'}</span>
        <button
          onClick={() => {
            signOut().catch(() => {});
          }}
          disabled={loading}
        >
          Sign Out
        </button>
      </div>
    );
  };

  const initialSession = {
    user: { id: 'test-user' },
    access_token: 'token',
    refresh_token: 'refresh',
    expires_in: 3600,
    token_type: 'bearer',
    provider_token: 'provider-token',
    provider_refresh_token: 'provider-refresh',
  };

  const originalFetch = globalThis.fetch;
  type FetchResponse = {
    ok: boolean;
    json?: () => Promise<{ error: null }>;
    text?: () => Promise<string>;
  };

  // eslint-disable-next-line no-unused-vars
  const fetchMock = jest.fn<(..._args: Parameters<typeof fetch>) => Promise<FetchResponse>>();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ error: null }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    mockCreateClient.mockReturnValue(supabaseClient);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('calls the logout endpoint and signs out the Supabase client', async () => {
    mockSignOut.mockResolvedValue({ error: null });

    render(
      <SupabaseUserProvider initialSession={initialSession as Session}>
        <TestConsumer />
      </SupabaseUserProvider>
    );

    const button = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(button);

    await waitFor(() => expect(screen.getByTestId('user-id').textContent).toBe('no-user'));

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', {
      method: 'POST',
      cache: 'no-store',
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('throws when useUser is consumed outside the provider', () => {
    const BrokenConsumer = () => {
      if (!useUserHook) {
        throw new Error('useUser hook not initialized');
      }
      useUserHook();
      return null;
    };

    expect(() => render(<BrokenConsumer />)).toThrow(
      'useUser must be used within a SupabaseUserProvider.'
    );
  });

  it('loads the initial session client-side when none is provided', async () => {
    const sessionFromClient = {
      user: { id: 'remote-user', aud: 'authenticated' } as Session['user'],
      access_token: 'token',
      refresh_token: 'refresh',
      expires_in: 3600,
      token_type: 'bearer',
      provider_token: 'provider-token',
      provider_refresh_token: 'provider-refresh',
      app_metadata: { provider: 'email' },
      expires_at: Math.floor(Date.now() / 1000) + 60,
    } as Session;

    mockGetSession.mockResolvedValueOnce({ data: { session: sessionFromClient } });

    render(
      <SupabaseUserProvider initialSession={null}>
        <TestConsumer />
      </SupabaseUserProvider>
    );

    await waitFor(() => expect(mockGetSession).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('user-id').textContent).toBe('remote-user'));
  });

  it('does not clear user when logout endpoint fails', async () => {
    mockSignOut.mockResolvedValue({ error: null });
    fetchMock.mockResolvedValueOnce({ ok: false, text: async () => 'server down' });

    render(
      <SupabaseUserProvider initialSession={initialSession as Session}>
        <TestConsumer />
      </SupabaseUserProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByTestId('user-id').textContent).toBe('test-user');
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('retains user when Supabase signOut returns an error', async () => {
    const signOutError = new Error('bye');
    mockSignOut.mockResolvedValue({ error: signOutError });

    render(
      <SupabaseUserProvider initialSession={initialSession as Session}>
        <TestConsumer />
      </SupabaseUserProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    expect(screen.getByTestId('user-id').textContent).toBe('test-user');
  });
});
