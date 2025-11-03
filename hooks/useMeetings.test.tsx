import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMeetings, useUpdateMeetingStatus } from './useMeetings';
// 1. Import the specific hook to mock
import { useUser } from '@/components/providers/SupabaseUserProvider';

// 2. Mock the module with a factory, providing a jest.fn() for the hook
jest.mock('@/components/providers/SupabaseUserProvider', () => ({
  useUser: jest.fn(),
}));

// 3. Cast the imported hook to a Jest mock for type safety
const useUserMock = useUser as jest.Mock;

// 4. Cast globalThis.fetch to a mock to satisfy TypeScript
(globalThis.fetch as jest.Mock) = jest.fn();
// Create a typed alias for easier use
const fetchMock = globalThis.fetch as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      // THIS BLOCK IS REQUIRED TO MAKE THE TEST PASS
      mutations: {
        retry: false,
      },
      //
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useMeetings', () => {
  beforeEach(() => {
    // Clear mocks for both fetch and the user hook
    fetchMock.mockClear();
    useUserMock.mockClear();

    // Set a default successful user mock
    useUserMock.mockReturnValue({ user: { id: '123' }, loading: false });
  });

  it('should fetch meetings successfully', async () => {
    const meetings = [{ id: 1, name: 'Meeting 1' }];

    // 6. Provide *two* mocks, one for each call
    fetchMock
      .mockResolvedValueOnce({
        // First call: /api/meetings/update-status
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        // Second call: /api/meetings
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ meetings }), // <-- Return the expected payload
      });

    const { result } = renderHook(() => useMeetings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith('/api/meetings/update-status', {
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/meetings');
    // This will now pass
    expect(result.current.data.meetings).toEqual(meetings);
  });

  it('should return an error if fetching meetings fails', async () => {
    // 7. Mock the second call as a failure
    fetchMock
      .mockResolvedValueOnce({
        // First call: /api/meetings/update-status (Succeeds)
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        // Second call: /api/meetings (Fails)
        ok: false, // <-- Set to false
        status: 500,
        headers: new Headers(),
        json: async () => ({ error: 'Failed to fetch' }), // <-- Return error payload
      });

    const { result } = renderHook(() => useMeetings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    // This will now pass
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

    // 8. Add status and headers to the mock
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ success: true }),
    });

    const { result } = renderHook(() => useUpdateMeetingStatus(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ meetingId, status, message });

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

    // 9. Add status and headers to the mock
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      json: async () => ({ error: 'Update failed' }),
    });

    const { result } = renderHook(() => useUpdateMeetingStatus(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ meetingId, status, message });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Update failed');
  });
});
