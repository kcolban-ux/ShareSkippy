"use client";
import { useState, useEffect } from 'react';
import { useSupabaseAuth } from '@/libs/supabase/hooks';
import { supabase } from '@/libs/supabase';

export default function MessageModal({ isOpen, onClose, recipient, availabilityPost }) {
  const { user } = useSupabaseAuth();
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Auto-generate subject based on availability post
  useEffect(() => {
    if (availabilityPost && !subject) {
      const postType = availabilityPost.post_type === 'dog_available' ? 'Dog Availability' : 'PetPal Availability';
      setSubject(`Re: ${postType} - ${availabilityPost.title}`);
    }
  }, [availabilityPost, subject]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !recipient || !message.trim()) return;

    setSending(true);
    setError(null);

    try {
      // First, check if a conversation already exists
      const { data: existingConversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${recipient.id},availability_id.eq.${availabilityPost.id}),and(participant1_id.eq.${recipient.id},participant2_id.eq.${user.id},availability_id.eq.${availabilityPost.id})`)
        .single();

      let conversationId;

      if (existingConversation) {
        conversationId = existingConversation.id;
        
        // Update the last_message_at timestamp
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId);
      } else {
        // Create a new conversation
        const { data: newConversation, error: newConvError } = await supabase
          .from('conversations')
          .insert({
            participant1_id: user.id,
            participant2_id: recipient.id,
            availability_id: availabilityPost.id
          })
          .select()
          .single();

        if (newConvError) throw newConvError;
        conversationId = newConversation.id;
      }

      // Send the message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: recipient.id,
          availability_id: availabilityPost.id,
          subject: subject || `Re: ${availabilityPost.title}`,
          content: message.trim()
        });

      if (messageError) throw messageError;

      setSuccess(true);
      setMessage('');
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);

    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Send Message</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
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
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center text-xl">
                  {recipient.first_name?.[0] || '👤'}
                </div>
              )}
              <div>
                <h3 className="font-medium text-gray-900">
                  {recipient.first_name} {recipient.last_name}
                </h3>
                <p className="text-sm text-gray-600">
                  {availabilityPost.post_type === 'dog_available' ? 'Dog Owner' : 'PetPal'}
                </p>
              </div>
            </div>
          </div>

          {/* Availability Post Info */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">About this availability:</h4>
            <p className="text-sm text-blue-800">{availabilityPost.title}</p>
            {availabilityPost.description && (
              <p className="text-sm text-blue-700 mt-1 line-clamp-2">
                {availabilityPost.description}
              </p>
            )}
          </div>

          {/* Message Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Message subject..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Write your message here..."
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                Message sent successfully! 🎉
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
