"use client";
import { useState, useEffect } from 'react';
import { useSupabaseAuth } from '@/libs/supabase/hooks';
import { supabase } from '@/libs/supabase';
import MessageModal from '@/components/MessageModal';
import MeetingModal from '@/components/MeetingModal';

export default function MessagesPage() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [messageModal, setMessageModal] = useState({ isOpen: false, recipient: null, availabilityPost: null });
  const [meetingModal, setMeetingModal] = useState({ isOpen: false, recipient: null, conversation: null });
  const [showConversations, setShowConversations] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      fetchConversations();
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch conversations where the current user is a participant
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participant1:profiles!conversations_participant1_id_fkey (
            id,
            first_name,
            last_name,
            profile_photo_url
          ),
          participant2:profiles!conversations_participant2_id_fkey (
            id,
            first_name,
            last_name,
            profile_photo_url
          ),
          availability:availability!conversations_availability_id_fkey (
            id,
            title,
            post_type
          )
        `)
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Process conversations to show the other participant
      const processedConversations = data.map(conv => {
        const otherParticipant = conv.participant1_id === user.id ? conv.participant2 : conv.participant1;
        return {
          ...conv,
          otherParticipant,
          displayName: `${otherParticipant.first_name} ${otherParticipant.last_name}`,
          profilePhoto: otherParticipant.profile_photo_url
        };
      });

      setConversations(processedConversations);
      
      // Select the first conversation if none is selected
      if (processedConversations.length > 0 && !selectedConversation) {
        setSelectedConversation(processedConversations[0]);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (
            id,
            first_name,
            last_name,
            profile_photo_url
          )
        `)
        .eq('availability_id', selectedConversation.availability_id)
        .or(`and(sender_id.eq.${selectedConversation.participant1_id},recipient_id.eq.${selectedConversation.participant2_id}),and(sender_id.eq.${selectedConversation.participant2_id},recipient_id.eq.${selectedConversation.participant1_id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setSending(true);
      
      // Use the API route which handles both message creation and email sending
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: selectedConversation.otherParticipant.id,
          availability_id: selectedConversation.availability_id,
          subject: `Re: ${selectedConversation.availability.title}`,
          content: newMessage.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const result = await response.json();
      
      // Refresh messages and conversations
      setNewMessage('');
      await fetchMessages(selectedConversation.id);
      await fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const openMessageModal = (recipient, availabilityPost) => {
    setMessageModal({ isOpen: true, recipient, availabilityPost });
  };

  const closeMessageModal = () => {
    setMessageModal({ isOpen: false, recipient: null, availabilityPost: null });
  };

  const openMeetingModal = () => {
    if (selectedConversation) {
      setMeetingModal({ 
        isOpen: true, 
        recipient: selectedConversation.otherParticipant, 
        conversation: selectedConversation 
      });
    }
  };

  const closeMeetingModal = () => {
    setMeetingModal({ isOpen: false, recipient: null, conversation: null });
  };

  const handleMeetingCreated = async () => {
    if (selectedConversation) {
      await fetchMessages(selectedConversation.id);
      await fetchConversations();
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // Reset time to start of day for accurate date comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (messageDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else if (now.getTime() - messageDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
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
          <p className="text-gray-600">You need to be signed in to view messages.</p>
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
            💬 Messages
          </h1>
          <p className="text-gray-600">Connect with other dog lovers in your community</p>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="flex flex-col lg:flex-row h-[600px]">
            {/* Conversations Sidebar */}
            <div className={`w-full lg:w-1/3 border-r border-gray-200 bg-gray-50 ${showConversations ? 'block' : 'hidden lg:block'}`}>
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
                <button
                  onClick={() => setShowConversations(false)}
                  className="lg:hidden text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="overflow-y-auto h-full">
                {loading ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <p>No conversations yet</p>
                    <p className="text-sm mt-2">Start messaging someone from the community!</p>
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => {
                        setSelectedConversation(conversation);
                        setShowConversations(false); // Hide sidebar on mobile after selection
                      }}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors ${
                        selectedConversation?.id === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {conversation.profilePhoto ? (
                          <img
                            src={conversation.profilePhoto}
                            alt={conversation.displayName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center text-lg font-medium text-gray-600">
                            {conversation.displayName?.[0] || '👤'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {conversation.displayName}
                          </h3>
                          <p className="text-sm text-gray-500 truncate">
                            {conversation.availability?.title || 'Availability Post'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatDate(conversation.last_message_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col w-full lg:w-auto">
              {selectedConversation ? (
                <>
                  {/* Conversation Header */}
                  <div className="p-4 border-b border-gray-200 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setShowConversations(true)}
                          className="lg:hidden text-gray-500 hover:text-gray-700 mr-2"
                        >
                          ←
                        </button>
                        {selectedConversation.profilePhoto ? (
                          <img
                            src={selectedConversation.profilePhoto}
                            alt={selectedConversation.displayName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center text-lg font-medium text-gray-600">
                            {selectedConversation.displayName?.[0] || '👤'}
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {selectedConversation.displayName}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {selectedConversation.availability?.post_type === 'dog_available' ? 'Dog Owner' : 'PetPal'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                        <div className="text-sm text-gray-500 truncate">
                          {selectedConversation.availability?.title}
                        </div>
                        <button
                          onClick={openMeetingModal}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors whitespace-nowrap"
                        >
                          📅 Schedule Meeting
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.sender_id === user.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender_id === user.id ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {formatTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200">
                    <form onSubmit={sendMessage} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        disabled={sending}
                      />
                      <button
                        type="submit"
                        disabled={sending || !newMessage.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {sending ? 'Sending...' : 'Send'}
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div className="text-6xl mb-4">💬</div>
                    <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
                    <p className="mb-4">Choose a conversation from the sidebar to start messaging</p>
                    <button
                      onClick={() => setShowConversations(true)}
                      className="lg:hidden px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      View Conversations
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Message Modal */}
        <MessageModal
          isOpen={messageModal.isOpen}
          onClose={closeMessageModal}
          recipient={messageModal.recipient}
          availabilityPost={messageModal.availabilityPost}
        />

        {/* Meeting Modal */}
        <MeetingModal
          isOpen={meetingModal.isOpen}
          onClose={closeMeetingModal}
          recipient={meetingModal.recipient}
          conversation={meetingModal.conversation}
          onMeetingCreated={handleMeetingCreated}
        />
      </div>
    </div>
  );
}
