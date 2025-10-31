"use client";
import { useState } from 'react';
import { supabase } from '@/libs/supabase';
import DatePicker from '@/components/ui/DatePicker';

// Utility function to format date as YYYY-MM-DD without timezone issues
const formatDateForInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function MeetingModal({ isOpen, onClose, recipient, conversation, onMeetingCreated }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    meeting_place: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate form data
      if (!formData.title.trim()) {
        throw new Error('Meeting title is required');
      }
      if (!formData.start_date || !formData.start_time) {
        throw new Error('Start date and time are required');
      }
      if (!formData.end_date || !formData.end_time) {
        throw new Error('End date and time are required');
      }
      if (!formData.meeting_place.trim()) {
        throw new Error('Meeting place is required');
      }

      // Combine date and time
      const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`);
      const endDateTime = new Date(`${formData.end_date}T${formData.end_time}`);

      // Validate dates
      if (startDateTime >= endDateTime) {
        throw new Error('End time must be after start time');
      }
      if (startDateTime < new Date()) {
        throw new Error('Meeting cannot be scheduled in the past');
      }

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('You must be logged in to schedule a meeting');
      }

      // Create meeting
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .insert({
          requester_id: user.id,
          recipient_id: recipient.id,
          availability_id: conversation?.availability_id,
          conversation_id: conversation?.id,
          title: formData.title.trim(),
          description: formData.description.trim(),
          meeting_place: formData.meeting_place.trim(),
          start_datetime: startDateTime.toISOString(),
          end_datetime: endDateTime.toISOString(),
          status: 'pending'
        })
        .select()
        .single();

      if (meetingError) throw meetingError;

      // Send a message in the chat about the meeting request
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: recipient.id,
          availability_id: conversation?.availability_id,
          subject: `Meeting Request: ${formData.title}`,
          content: `I've sent you a meeting request for "${formData.title}" on ${startDateTime.toLocaleDateString()} at ${startDateTime.toLocaleTimeString()}. Please check your meetings page to accept or reject.`
        });

      if (messageError) {
        console.error('Error sending meeting message:', messageError);
        // Don't throw here as the meeting was created successfully
      }

      // Update conversation timestamp
      if (conversation?.id) {
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversation.id);
      }

      // Reset form and close modal
      setFormData({
        title: '',
        description: '',
        meeting_place: '',
        start_date: '',
        start_time: '',
        end_date: '',
        end_time: ''
      });
      onClose();
      
      // Send meeting confirmation emails to both participants
      try {
        // Send to requester
        await fetch('/api/emails/meeting-scheduled', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meetingId: meeting.id,
            userId: user.id
          })
        });

        // Send to recipient
        await fetch('/api/emails/meeting-scheduled', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meetingId: meeting.id,
            userId: recipient.id
          })
        });
      } catch (emailError) {
        console.error('Error sending meeting confirmation emails:', emailError);
        // Don't fail the meeting creation if email fails
      }

      // Call the callback to refresh messages
      if (onMeetingCreated) {
        onMeetingCreated();
      }
      
      // Show success message (you might want to add a toast notification here)
      alert('Meeting request sent successfully!');

    } catch (error) {
      console.error('Error creating meeting:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      meeting_place: '',
      start_date: '',
      start_time: '',
      end_date: '',
      end_time: ''
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-4" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto my-4 sm:my-0">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Schedule Meeting</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Recipient Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {recipient.profile_photo_url ? (
                <img
                  src={recipient.profile_photo_url}
                  alt={`${recipient.first_name} ${recipient.last_name}`}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-linear-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center text-lg font-medium text-gray-600">
                  {recipient.first_name?.[0] || '👤'}
                </div>
              )}
              <div>
                <h3 className="font-medium text-gray-900">
                  {recipient.first_name} {recipient.last_name}
                </h3>
                <p className="text-sm text-gray-500">Meeting with</p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Meeting Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Meeting Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Dog Walking Meetup"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-black"
                required
              />
            </div>

            {/* Start Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <DatePicker
                  selectedDate={formData.start_date}
                  onDateSelect={(date) => setFormData(prev => ({ ...prev, start_date: date }))}
                  minDate={formatDateForInput(new Date())}
                  placeholder="Select start date"
                />
              </div>
              <div>
                <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time *
                </label>
                <input
                  type="time"
                  id="start_time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-black"
                  required
                />
              </div>
            </div>

            {/* End Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <DatePicker
                  selectedDate={formData.end_date}
                  onDateSelect={(date) => setFormData(prev => ({ ...prev, end_date: date }))}
                  minDate={formData.start_date || formatDateForInput(new Date())}
                  maxDate={formData.start_date ? formatDateForInput(new Date(new Date(formData.start_date).getTime() + 30 * 24 * 60 * 60 * 1000)) : null}
                  placeholder="Select end date"
                />
              </div>
              <div>
                <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-1">
                  End Time *
                </label>
                <input
                  type="time"
                  id="end_time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-black"
                  required
                />
              </div>
            </div>

            {/* Meeting Place */}
            <div>
              <label htmlFor="meeting_place" className="block text-sm font-medium text-gray-700 mb-1">
                Meeting Place *
              </label>
              <input
                type="text"
                id="meeting_place"
                name="meeting_place"
                value={formData.meeting_place}
                onChange={handleInputChange}
                placeholder="e.g., Central Park, 123 Main St, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-black"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Details (Optional)
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Any additional details about the meeting..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-black"
              />
            </div>

            {/* Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Meeting Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
