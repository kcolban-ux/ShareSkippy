import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import * as TanStackReactQuery from '@tanstack/react-query';
import { useUserReviews, useSubmitReview, ReviewStats, ReviewSubmissionData } from './useReviews';

// NOTE: Adjust the import path above to match your actual file location.

// #region Mock Setup
// Mock fetch globally
const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

// Mock QueryClientProvider wrapper
const createWrapper = () => {
  const queryClient = new TanStackReactQuery.QueryClient({
    defaultOptions: {
      queries: {
        // Turn off retries for predictable testing
        retry: false,
      },
    },
  });

  // Use a named component for display name integrity
  const QueryProvider = ({ children }: { children: React.ReactNode }) => (
    <TanStackReactQuery.QueryClientProvider client={queryClient}>
      {children}
    </TanStackReactQuery.QueryClientProvider>
  );

  QueryProvider.displayName = 'QueryProvider';
  return QueryProvider;
};

// Mock Data
const MOCK_USER_ID = 'user-abc';
const MOCK_REVIEWED_ID = 'user-xyz';
const MOCK_REVIEW_ID = 'review-123';

const mockReviewsData = {
  reviews: [
    {
      id: MOCK_REVIEW_ID,
      reviewed_id: MOCK_REVIEWED_ID,
      rating: 5,
      comment: 'Great!',
      reviewer_id: MOCK_USER_ID,
      created_at: '2025-11-01',
    },
  ],
  error: null,
};

const mockStats: ReviewStats = {
  averageRating: 4.5,
  reviewCount: 10,
  ratingDistribution: { 1: 0, 2: 0, 3: 1, 4: 4, 5: 5 },
};

const mockStatsData = { ...mockStats, error: null };

const mockSubmitData: ReviewSubmissionData = {
  reviewer_id: MOCK_USER_ID,
  reviewed_id: MOCK_REVIEWED_ID,
  rating: 5,
  comment: 'Excellent service!',
};

const mockSubmitSuccess = {
  success: true,
  reviewId: 'new-review-789',
};

const mockSubmitError = {
  success: false,
  error: 'Invalid input.',
};

// Spy on QueryClient for mutation tests
const invalidateQueriesMock = jest.fn();

jest.mock('@tanstack/react-query', () => {
  // Retain all actual imports except the one we want to mock
  const originalModule = jest.requireActual('@tanstack/react-query');
  return {
    ...originalModule,
    useQueryClient: () =>
      ({
        // This is the object returned by useQueryClient()
        invalidateQueries: invalidateQueriesMock,
        // Include other necessary methods for type safety if needed (e.g., for QueryClientProvider)
      }) as unknown as TanStackReactQuery.QueryClient,
  };
});

// #endregion

// #region Tests

describe('useUserReviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return initial loading state and disabled when userId is undefined', () => {
    const { result } = renderHook(() => useUserReviews(undefined), { wrapper: createWrapper() });

    // Expect data to be undefined, as the query is disabled.
    expect(result.current.data).toBeUndefined();

    // Check status properties (which are defined)
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
  });

  it('should fetch limited data and stats successfully (default limit 5)', async () => {
    // Mock the two parallel fetch calls
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockReviewsData,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatsData,
      } as Response);

    const { result } = renderHook(() => useUserReviews(MOCK_USER_ID), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.reviews).toHaveLength(1);
    expect(result.current.data?.stats.averageRating).toBe(4.5);

    // Check correct API calls were made (limit 5 is default)
    expect(mockFetch).toHaveBeenCalledWith(`/api/reviews?userId=${MOCK_USER_ID}&limit=5`);
    expect(mockFetch).toHaveBeenCalledWith(`/api/reviews/stats?userId=${MOCK_USER_ID}`);
  });

  it('should fetch all data and stats successfully when showAll is true (limit 50)', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockReviewsData,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatsData,
      } as Response);

    const { result } = renderHook(() => useUserReviews(MOCK_USER_ID, true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Check correct API calls were made (limit 50)
    expect(mockFetch).toHaveBeenCalledWith(`/api/reviews?userId=${MOCK_USER_ID}&limit=50`);
  });

  it('should handle reviews fetch failure gracefully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ reviews: [], error: 'Network error' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatsData, // Stats fetch succeeds
      } as Response);

    const { result } = renderHook(() => useUserReviews(MOCK_USER_ID), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain('Network error');
  });

  it('should handle stats fetch failure gracefully by returning default stats', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockReviewsData, // Reviews fetch succeeds
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Stats unavailable' }),
      } as Response);

    const { result } = renderHook(() => useUserReviews(MOCK_USER_ID), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Expect reviews to be present
    expect(result.current.data?.reviews).toHaveLength(1);
    // Expect stats to fall back to defaults
    expect(result.current.data?.stats.reviewCount).toBe(0);
    expect(result.current.data?.stats.averageRating).toBe(0);
  });
});

describe('useSubmitReview', () => {
  beforeEach(() => {
    invalidateQueriesMock.mockClear();
    jest.clearAllMocks();
  });

  it('should successfully submit a review', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSubmitSuccess,
    } as Response);

    const { result } = renderHook(() => useSubmitReview(), { wrapper: createWrapper() });

    // Execute the mutation
    result.current.mutate(mockSubmitData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Check API call details
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/reviews',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(mockSubmitData),
      })
    );

    // Check cache invalidation on success
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['reviews', MOCK_REVIEWED_ID],
    });
  });

  it('should handle submission failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => mockSubmitError,
    } as Response);

    const { result } = renderHook(() => useSubmitReview(), { wrapper: createWrapper() });

    // Execute the mutation
    result.current.mutate(mockSubmitData);

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Check error message
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain('Invalid input');

    // Check cache invalidation was NOT called on failure
    expect(invalidateQueriesMock).not.toHaveBeenCalled();
  });
});

// #endregion Tests
