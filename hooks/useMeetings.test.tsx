// #region Imports
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMeetings, useUpdateMeetingStatus } from './useMeetings';
import { useUser } from '@/components/providers/SupabaseUserProvider';
// #endregion Imports

// #region Mocks
/**
 * Mock the SupabaseUserProvider module to gain control over the useUser hook.
 */
jest.mock('@/components/providers/SupabaseUserProvider', () => ({
  useUser: jest.fn(),
}));

/**
 * Create a typed mock reference for the useUser hook.
 */
const useUserMock = useUser as jest.Mock;

/**
 * Mock the global fetch function for intercepting API calls.
 */
(globalThis.fetch as jest.Mock) = jest.fn();
const fetchMock = globalThis.fetch as jest.Mock;
// #endregion Mocks

// #region Test Helpers
/**
 * Creates a React Query client and a wrapper component for testing hooks.
 * Disables query/mutation retries to ensure tests run quickly and are deterministic.
 *
 * @returns {React.ComponentType<{ children: React.ReactNode }>} A QueryClientProvider component.
 */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const QueryProvider = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  QueryProvider.displayName = 'QueryProvider';

  return QueryProvider;
};
// #endregion Test Helpers

// #region Test Suites
describe('useMeetings', () => {
  beforeEach(() => {
    fetchMock.mockClear();
    useUserMock.mockClear();
    useUserMock.mockReturnValue({ user: { id: '123' }, loading: false });
  });

  it('should fetch meetings successfully', async () => {
    const meetings = [{ id: 1, name: 'Meeting 1' }];

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ meetings }),
      });

    const { result } = renderHook(() => useMeetings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith('/api/meetings/update-status', {
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/meetings');
    expect(result.current.data?.meetings).toEqual(meetings);
  });

  it('should return an error if fetching meetings fails', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers(),
        json: async () => ({ error: 'Failed to fetch' }),
      });

    const { result } = renderHook(() => useMeetings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Failed to fetch');
  });

  it('should not fetch meetings if there is no user', () => {
    useUserMock.mockReturnValue({ user: null, loading: false });

    renderHook(() => useMeetings(), { wrapper: createWrapper() });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('useUpdateMeetingStatus', () => {
  beforeEach(() => {
    fetchMock.mockClear();
    useUserMock.mockClear();
    useUserMock.mockReturnValue({ user: { id: '123' }, loading: false });
  });

  it('should update meeting status successfully', async () => {
    const meetingId = 'm1';
    const status = 'confirmed';
    const message = 'Confirmed';

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ success: true }),
    });

    const { result } = renderHook(() => useUpdateMeetingStatus(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      meetingId,
      status: status as Parameters<typeof result.current.mutate>[0]['status'],
      message,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(`/api/meetings/${meetingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, message }),
    });
  });

  it('should handle error when updating meeting status', async () => {
    const meetingId = 'm1';
    const status = 'confirmed';
    const message = 'Confirmed';

    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      json: async () => ({ error: 'Update failed' }),
    });

    const { result } = renderHook(() => useUpdateMeetingStatus(), {
      wrapper: createWrapper(),
    });

    const originalSetTimeout = globalThis.setTimeout;
    const immediateSetTimeout = ((callback: TimerHandler, _delay?: number, ...args: any[]) => {
      if (typeof callback === 'function') {
        act(() => {
          callback(...args);
        });
      }
      return originalSetTimeout(() => undefined, 0);
    }) as unknown as typeof setTimeout;
    (immediateSetTimeout as unknown as { __promisify__?: typeof setTimeout }).__promisify__ = (
      originalSetTimeout as unknown as { __promisify__?: typeof setTimeout }
    ).__promisify__;
    globalThis.setTimeout = immediateSetTimeout;

    try {
      await expect(
        result.current.mutateAsync({
          meetingId,
          status: status as Parameters<typeof result.current.mutate>[0]['status'],
          message,
        })
      ).rejects.toThrow('Update failed');
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }

    expect(result.current.error?.message).toBe('Update failed');
  });
});
// #endregion Test Suites
