/**
 * @fileoverview This file defines custom React Query hooks for fetching
 * and managing user meetings.
 * @path /hooks/useMeetings.ts
 */

// #region Imports
import {
  useMutation,
  UseMutationResult,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from '@tanstack/react-query';
import { useUser } from '@/components/providers/SupabaseUserProvider';

// --- Supabase Types ---
import { User } from '@supabase/supabase-js';
// #endregion

// #region Types
/**
 * @description Basic profile structure for meeting participants.
 */
interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_url: string | null;
}

/**
 * @description Defines the possible states for a meeting.
 */
type MeetingStatus = 'pending' | 'scheduled' | 'cancelled' | 'completed';

/**
 * @description The main Meeting object structure.
 */
interface Meeting {
  id: string;
  requester_id: string;
  recipient_id: string;
  title: string;
  description: string | null;
  start_datetime: string;
  end_datetime: string;
  meeting_place: string;
  status: MeetingStatus;
  has_reviewed: boolean;
  requester: Profile;
  recipient: Profile;
}

/**
 * @description The shape of the data returned from the /api/meetings endpoint.
 */
interface MeetingsResponse {
  meetings: Meeting[];
}

/**
 * @description The payload for the update meeting mutation.
 */
interface UpdateMeetingPayload {
  meetingId: string;
  status: MeetingStatus;
  message: string;
}

/**
 * @description The expected response from a successful meeting update.
 * Assuming it returns the single updated meeting.
 */
type UpdateMeetingResponse = Meeting;
// #endregion

// #region useMeetings
/**
 * @description Fetches the user's meetings.
 * Automatically triggers an API route to update meeting statuses before fetching.
 */
export const useMeetings = (): UseQueryResult<MeetingsResponse, Error> => {
  const { user } = useUser() as { user: User | null };

  return useQuery<MeetingsResponse, Error, MeetingsResponse, (string | undefined)[]>({
    queryKey: ['meetings', user?.id],
    queryFn: async (): Promise<MeetingsResponse> => {
      if (!user) return { meetings: [] };

      // First, update any meetings that should be marked as completed
      await fetch('/api/meetings/update-status', { method: 'POST' });

      // Then fetch the updated meetings
      const response = await fetch('/api/meetings');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch meetings');
      }

      return data as MeetingsResponse;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
// #endregion

// #region Helper Functions (External)

/**
 * @description Checks if an error message indicates a non-retriable, fatal error.
 * @param {string} message - The error message.
 * @returns {boolean} True if the error should not be retried.
 */
function isFatalError(message: string): boolean {
  // Complexity Cost: 1 (Fn) + 2 (||) = 3
  return (
    message.includes('Unauthorized') ||
    message.includes('Invalid') ||
    message.includes('Cannot cancel')
  );
}

/**
 * @description Handles the direct API call for updating a meeting.
 * Throws an Error on a failed response or network issue.
 * @param {UpdateMeetingPayload} payload - The update parameters.
 * @returns {Promise<UpdateMeetingResponse>} The successful update response.
 */
async function callUpdateMeetingAPI({
  meetingId,
  status,
  message,
}: UpdateMeetingPayload): Promise<UpdateMeetingResponse> {
  // CC = 1 (Fn) + 1 (if) = 2
  try {
    const response = await fetch(`/api/meetings/${meetingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, message }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update meeting status');
    }

    return data as UpdateMeetingResponse;
  } catch (error: unknown) {
    const currentError = error instanceof Error ? error : new Error(String(error));

    // Specific network error check logic
    if (currentError.name === 'TypeError' && currentError.message.includes('fetch')) {
      throw new Error(
        'Network error: Unable to connect to server. Please check your internet connection and try again.'
      );
    }

    throw currentError;
  }
}

/**
 * @description Handles the API call and retry logic for updating a meeting status.
 * @param {UpdateMeetingPayload} payload - The update parameters.
 * @param {number} maxRetries - Maximum number of retries.
 * @returns {Promise<UpdateMeetingResponse>} The successful update response.
 */
async function retryMeetingUpdate(
  payload: UpdateMeetingPayload,
  maxRetries: number = 3
): Promise<UpdateMeetingResponse> {
  let lastError: Error = new Error('Meeting update failed due to unexpected error.');

  // Cognitive Complexity: 4
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callUpdateMeetingAPI(payload);
    } catch (error: unknown) {
      const currentError = error instanceof Error ? error : new Error(String(error));
      lastError = currentError;

      // 1. FATAL/NON-RETRIABLE CHECK
      if (isFatalError(currentError.message)) {
        throw currentError;
      }

      // 2. LAST ATTEMPT CHECK - Throws the standard error
      if (attempt === maxRetries) {
        throw currentError;
      }

      // 3. RETRY WAIT (Exponential backoff)
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
// #endregion

// #region useUpdateMeetingStatus
/**
 * @description Provides a mutation to update a meeting's status with retry logic.
 * The mutation logic is delegated to the external `retryMeetingUpdate` function
 * to adhere to the Cognitive Complexity limit.
 */
export const useUpdateMeetingStatus = (): UseMutationResult<
  UpdateMeetingResponse,
  Error,
  UpdateMeetingPayload
> => {
  const queryClient = useQueryClient();
  const { user } = useUser() as { user: User | null };

  return useMutation<UpdateMeetingResponse, Error, UpdateMeetingPayload>({
    mutationFn: async (payload: UpdateMeetingPayload): Promise<UpdateMeetingResponse> => {
      // Logging for transparency (can be removed if performance is critical)
      console.log(`Starting meeting update for ${payload.meetingId}.`);

      // ✅ Proper usage of the helper function:
      // Delegation to the helper function flattens the mutationFn complexity.
      const result = await retryMeetingUpdate(payload);

      return result;
    },
    onSuccess: () => {
      // Invalidate and refetch meetings
      queryClient.invalidateQueries({ queryKey: ['meetings', user?.id] });
    },
  });
};
// #endregion
