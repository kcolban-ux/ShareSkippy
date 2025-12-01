'use client';

import { useState, ReactElement } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useMeetings, useUpdateMeetingStatus } from '@/hooks/useMeetings';
import { useQueryClient, UseQueryResult } from '@tanstack/react-query';
import ReviewModal from '@/components/ReviewModal';

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
 * @description The main Meeting object structure, including nested participants.
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
  has_reviewed: boolean; // Assuming this field exists from the hook
  requester: Profile;
  recipient: Profile;
}

/**
 * @description The data shape required by the ReviewModal.
 */
interface PendingReview {
  meeting_id: string;
  meeting_title: string;
  other_participant_name: string;
}

/**
 * @description Type for the `useMeetings` hook's return data.
 */
interface MeetingsData {
  meetings: Meeting[];
}

/**
 * @description Type for the arguments passed to the update meeting mutation.
 */
interface UpdateMeetingPayload {
  meetingId: string;
  status: MeetingStatus;
  message: string;
}
// #endregion

// #region Component
export default function MeetingsPage(): ReactElement {
  // #region State & Hooks
  /**
   * @description Handles user authentication and redirection for the page.
   * `authLoading` is true while the user's session is being verified.
   * The hook redirects to the login page if the user is not authenticated.
   */
  const { user, isLoading: authLoading } = useProtectedRoute();

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [selectedReview, setSelectedReview] = useState<PendingReview | null>(null);
  const queryClient = useQueryClient();

  const { data: meetingsData, isLoading: loading } = useMeetings() as UseQueryResult<
    MeetingsData,
    Error
  >;
  const updateMeetingStatusMutation = useUpdateMeetingStatus();
  // #endregion

  // #region Data
  const meetings: Meeting[] = meetingsData?.meetings || [];
  // #endregion

  // #region Handlers
  /**
   * @description Updates a meeting's status via the mutation hook.
   */
  const updateMeetingStatus = async (
    meetingId: string,
    status: MeetingStatus,
    message: string
  ): Promise<void> => {
    try {
      setActionLoading(meetingId);

      await updateMeetingStatusMutation.mutateAsync({
        meetingId,
        status,
        message,
      } as UpdateMeetingPayload);
    } catch (error: unknown) {
      console.error('Error updating meeting:', error);
      alert(
        `Failed to update meeting: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * @description Cancels a meeting with a confirmation and timeout.
   */
  const cancelMeeting = async (meetingId: string): Promise<void> => {
    if (!confirm('Are you sure you want to cancel this meeting?')) return;

    // The `if (!user)` check was removed. The `useProtectedRoute`
    // hook ensures a user is present, or it redirects.

    try {
      setActionLoading(meetingId);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - please try again')), 10000);
      });

      const updatePromise = updateMeetingStatusMutation.mutateAsync({
        meetingId,
        status: 'cancelled',
        message: 'This meeting has been cancelled.',
      } as UpdateMeetingPayload);

      await Promise.race([updatePromise, timeoutPromise]);
    } catch (error: unknown) {
      console.error('Error cancelling meeting:', error);

      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please check your internet connection and try again.';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.message.includes('Unauthorized')) {
          errorMessage =
            'You are not authorized to cancel this meeting. Please refresh the page and try again.';
        } else {
          errorMessage = error.message;
        }
      }

      alert(`Failed to cancel meeting: ${errorMessage}`);
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * @description Opens the review modal and sets the selected meeting.
   */
  const handleReviewClick = (meeting: Meeting): void => {
    // This check is kept to satisfy TypeScript, as `user` is technically `User | null`
    if (!user) return;

    const otherPerson = meeting.requester_id === user.id ? meeting.recipient : meeting.requester;
    setSelectedReview({
      meeting_id: meeting.id,
      meeting_title: meeting.title,
      other_participant_name: `${otherPerson.first_name || ''} ${
        otherPerson.last_name || ''
      }`.trim(),
    });
    setIsReviewModalOpen(true);
  };

  /**
   * @description Handles successful review submission.
   */
  const handleReviewSubmitted = (): void => {
    // Invalidate and refetch meetings to update the review status
    queryClient.invalidateQueries({ queryKey: ['meetings', user?.id] });
    setIsReviewModalOpen(false);
    setSelectedReview(null);
  };

  /**
   * @description Closes the review modal.
   */
  const handleCloseReviewModal = (): void => {
    setIsReviewModalOpen(false);
    setSelectedReview(null);
  };
  // #endregion

  // #region Helpers
  /**
   * @description Gets the Tailwind CSS color classes for a given status.
   */
  const getStatusColor = (status: MeetingStatus): string => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'scheduled':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * @description Formats a date string into readable date and time.
   */
  const formatDateTime = (dateString: string): { date: string; time: string } => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    };
  };

  /**
   * @description Checks if a meeting can be cancelled.
   */
  const canCancel = (meeting: Meeting): boolean => {
    return meeting.status === 'scheduled' && new Date(meeting.start_datetime) > new Date();
  };

  /**
   * @description Checks if a meeting can be scheduled (accepted).
   * The `user?.id` syntax is null-safe.
   */
  const canSchedule = (meeting: Meeting): boolean => {
    return meeting.status === 'pending' && meeting.recipient_id === user?.id;
  };

  /**
   * @description Checks if a meeting can be reviewed.
   */
  const canReview = (meeting: Meeting): boolean => {
    return (
      meeting.status === 'completed' &&
      new Date(meeting.end_datetime) < new Date() &&
      !meeting.has_reviewed
    );
  };
  // #endregion

  // #region Render Logic
  /**
   * @description Renders the main content (loading, empty, or list).
   */
  const renderMeetingsContent = (): ReactElement => {
    // This check handles both auth loading and data fetching loading
    if (loading || authLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    // This guard satisfies TypeScript and handles any edge cases
    // where the user is null after auth loading is complete.
    // `useProtectedRoute` should redirect, but this is a safe fallback.
    if (!user) {
      return (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Redirecting...</p>
        </div>
      );
    }

    if (meetings.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-6xl mb-4">📅</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No meetings yet</h2>
          <p className="text-gray-600 mb-4">
            Start a conversation with someone in the community and schedule your first meeting!
          </p>
          <Link
            href="/messages"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Messages
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {meetings.map((meeting) => {
          // The `if (!user) return null` check is no longer needed
          // because of the top-level guard in this function.

          const isRequester = meeting.requester_id === user.id;
          const otherPerson = isRequester ? meeting.recipient : meeting.requester;
          const startDateTime = formatDateTime(meeting.start_datetime);
          const endDateTime = formatDateTime(meeting.end_datetime);

          return (
            <div key={meeting.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Meeting Header */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4">
                    {otherPerson.profile_photo_url ? (
                      <Image
                        src={otherPerson.profile_photo_url}
                        alt={`${otherPerson.first_name || ''} ${otherPerson.last_name || ''}`}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-12 h-12 bg-linear-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center text-lg font-medium text-gray-600 shrink-0">
                        {otherPerson.first_name?.[0] || '👤'}
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{meeting.title}</h3>
                      <p className="text-sm text-gray-500">
                        {isRequester ? 'Meeting with' : 'Meeting from'} {otherPerson.first_name}{' '}
                        {otherPerson.last_name}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        meeting.status
                      )}`}
                    >
                      {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                    </span>
                  </div>

                  {/* Meeting Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Date & Time</h4>
                      <p className="text-sm text-gray-600">{startDateTime.date}</p>
                      <p className="text-sm text-gray-600">
                        {startDateTime.time} - {endDateTime.time}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Location</h4>
                      <p className="text-sm text-gray-600">{meeting.meeting_place}</p>
                    </div>
                  </div>

                  {meeting.description && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-1">Details</h4>
                      <p className="text-sm text-gray-600">{meeting.description}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col space-y-2 ml-4 shrink-0">
                  {canSchedule(meeting) && (
                    <button
                      onClick={() =>
                        updateMeetingStatus(
                          meeting.id,
                          'scheduled',
                          'I have accepted your meeting request! Looking forward to seeing you.'
                        )
                      }
                      disabled={actionLoading === meeting.id}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === meeting.id ? 'Processing...' : 'Accept Meeting'}
                    </button>
                  )}

                  {canCancel(meeting) && (
                    <button
                      onClick={() => cancelMeeting(meeting.id)}
                      disabled={actionLoading === meeting.id}
                      className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === meeting.id ? 'Processing...' : 'Cancel'}
                    </button>
                  )}

                  {canReview(meeting) && (
                    <button
                      onClick={() => handleReviewClick(meeting)}
                      className="px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-colors"
                    >
                      Leave Review
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  // #endregion

  // #region JSX
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            📅 Meetings
          </h1>
          <p className="text-gray-600">
            Schedule and manage dog walking meetups with other community members
          </p>
        </div>

        {/* Content Area */}
        {renderMeetingsContent()}
      </div>

      {/* Review Modal */}
      {selectedReview && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={handleCloseReviewModal}
          pendingReview={selectedReview}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}
    </div>
  );
  // #endregion
}
// #endregion
