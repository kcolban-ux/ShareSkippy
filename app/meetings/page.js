'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import ReviewModal from '@/components/ReviewModal';
import { useUser } from '@/contexts/UserContext';
import { useMeetings, useUpdateMeetingStatus } from '@/hooks/useMeetings';

export default function MeetingsPage() {
  const { user, loading: authLoading } = useUser();
  const [actionLoading, setActionLoading] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const queryClient = useQueryClient();

  const { data: meetingsData, isLoading: loading } = useMeetings();
  const updateMeetingStatusMutation = useUpdateMeetingStatus();

  const meetings = meetingsData?.meetings || [];

  const updateMeetingStatus = async (meetingId, status, message) => {
    try {
      setActionLoading(meetingId);

      await updateMeetingStatusMutation.mutateAsync({
        meetingId,
        status,
        message,
      });
    } catch (error) {
      console.error('Error updating meeting:', error);
      alert(`Failed to update meeting: ${error.message || 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const cancelMeeting = async (meetingId) => {
    if (!confirm('Are you sure you want to cancel this meeting?')) return;

    // Check if user is authenticated
    if (!user) {
      alert('You must be logged in to cancel meetings. Please refresh the page and try again.');
      return;
    }

    try {
      setActionLoading(meetingId);

      // Add a timeout to the request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - please try again')), 10000);
      });

      const updatePromise = updateMeetingStatusMutation.mutateAsync({
        meetingId,
        status: 'cancelled',
        message: 'This meeting has been cancelled.',
      });

      await Promise.race([updatePromise, timeoutPromise]);
    } catch (error) {
      console.error('Error cancelling meeting:', error);

      // Provide more specific error messages
      let errorMessage = 'Unknown error';
      if (error.message) {
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

  const getStatusColor = (status) => {
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

  const formatDateTime = (dateString) => {
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

  const canCancel = (meeting) => {
    return meeting.status === 'scheduled' && new Date(meeting.start_datetime) > new Date();
  };

  const canSchedule = (meeting) => {
    return meeting.status === 'pending' && meeting.recipient_id === user?.id;
  };

  const canReview = (meeting) => {
    return (
      meeting.status === 'completed' &&
      new Date(meeting.end_datetime) < new Date() &&
      !meeting.has_reviewed
    ); // We'll need to check this in the API
  };

  const handleReviewClick = (meeting) => {
    const otherPerson = meeting.requester_id === user.id ? meeting.recipient : meeting.requester;
    setSelectedReview({
      meeting_id: meeting.id,
      meeting_title: meeting.title,
      other_participant_name: `${otherPerson.first_name} ${otherPerson.last_name}`,
    });
    setIsReviewModalOpen(true);
  };

  const handleReviewSubmitted = (_review) => {
    // Invalidate and refetch meetings to update the review status
    queryClient.invalidateQueries({ queryKey: ['meetings', user?.id] });
    setIsReviewModalOpen(false);
    setSelectedReview(null);
  };

  const handleCloseReviewModal = () => {
    setIsReviewModalOpen(false);
    setSelectedReview(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in</h1>
          <p className="text-gray-600">You need to be signed in to view meetings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            📅 Meetings
          </h1>
          <p className="text-gray-600">
            Schedule and manage dog walking meetups with other community members
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : meetings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No meetings yet</h2>
            <p className="text-gray-600 mb-4">
              Start a conversation with someone in the community and schedule your first meeting!
            </p>
            <a
              href="/messages"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Messages
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {meetings.map((meeting) => {
              const isRequester = meeting.requester_id === user.id;
              const otherPerson = isRequester ? meeting.recipient : meeting.requester;
              const startDateTime = formatDateTime(meeting.start_datetime);
              const endDateTime = formatDateTime(meeting.end_datetime);

              return (
                <div key={meeting.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Meeting Header */}
                      <div className="flex items-center space-x-3 mb-4">
                        {otherPerson.profile_photo_url ? (
                          <img
                            src={otherPerson.profile_photo_url}
                            alt={`${otherPerson.first_name} ${otherPerson.last_name}`}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center text-lg font-medium text-gray-600">
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
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(meeting.status)}`}
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
                    <div className="flex flex-col space-y-2 ml-4">
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
        )}
      </div>

      {/* Review Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={handleCloseReviewModal}
        pendingReview={selectedReview}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </div>
  );
}
