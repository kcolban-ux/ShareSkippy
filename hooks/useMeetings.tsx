import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/components/providers/SupabaseUserProvider';

// Fetch meetings
export const useMeetings = () => {
  const { user } = useUser();

  return useQuery({
    queryKey: ['meetings', user?.id],
    queryFn: async () => {
      if (!user) return { meetings: [] };

      // First, update any meetings that should be marked as completed
      await fetch('/api/meetings/update-status', { method: 'POST' });

      // Then fetch the updated meetings
      const response = await fetch('/api/meetings');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch meetings');
      }

      return data;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// ---

// Define a type for the mutation payload
type UpdateMeetingPayload = {
  meetingId: string;
  status: string;
  message: string;
};

// Update meeting status (Refactored)
export const useUpdateMeetingStatus = () => {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    // 1. The mutationFn is simplified to just the fetch logic
    mutationFn: async (payload: UpdateMeetingPayload) => {
      const { meetingId, status, message } = payload;

      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, message }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Throw an error to be caught by React Query
        throw new Error(data.error || 'Failed to update meeting status');
      }

      return data;
    },

    // 2. All retry logic is moved to React Query's options
    retry: (failureCount, error: Error) => {
      // failureCount is 0-indexed (0=1st retry, 1=2nd retry)
      // This gives 3 total attempts (1 initial + 2 retries)
      if (failureCount >= 2) {
        return false;
      }

      // Don't retry for authentication or validation errors
      if (
        error.message.includes('Unauthorized') ||
        error.message.includes('Invalid') ||
        error.message.includes('Cannot cancel')
      ) {
        return false;
      }

      return true; // Otherwise, retry
    },

    // 3. Built-in exponential backoff (1s, 2s)
    retryDelay: (attemptIndex) => {
      if (process.env.NODE_ENV === 'test') {
        return 0;
      }

      return Math.pow(2, attemptIndex) * 1000;
    },

    // 4. Invalidate queries on success
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', user?.id] });
    },
  });
};
