'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import MeetingModal from '@/components/MeetingModal';
import MessageModal from '@/components/MessageModal';
import { supabase } from '@/libs/supabase';
import { useSupabaseAuth } from '@/libs/supabase/hooks';

export default function MessagesPage() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);

  // Debug messages state changes
  useEffect(() => {
    console.log('[Messages] State updated - messages count:', messages.length);
    if (messages.length > 0) {
      console.log('[Messages] First message:', messages[0]);
    }
  }, [messages]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [messageModal, setMessageModal] = useState({
    isOpen: false,
    recipient: null,
    availabilityPost: null,
  });
  const [meetingModal, setMeetingModal] = useState({
    isOpen: false,
    recipient: null,
    conversation: null,
  });
  const [showConversations, setShowConversations] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  // Create a stable key that changes per conversation selection
  const selectedConversationKey = useMemo(() => {
    const c = selectedConversation;
    if (!c) return 'none';
    return [c.id ?? 'noid', c.participant1_id, c.participant2_id, c.availability_id ?? 'na'].join(
      ':'
    );
  }, [selectedConversation]);

  useEffect(() => {
    if (user && !authLoading) {
      fetchConversations();
    }
  }, [user, authLoading, fetchConversations]);

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      setError(null);
      return;
    }

    console.log('[Messages] Starting fetch for conversation:', selectedConversation.id);

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    let cancelled = false;

    setLoading(true);
    // Don't clear messages immediately - let the new data replace it
    setError(null);

    (async () => {
      try {
        const data = await fetchMessages(selectedConversation.id);
        console.log('[Messages] fetchMessages returned:', data?.length ?? 0, 'messages');
        // Only update if not cancelled and not aborted
        if (!cancelled && !abortControllerRef.current?.signal.aborted) {
          console.log('[Messages] Setting messages in state...');
          setMessages(data || []);
          // Add a small delay to see if messages persist
          setTimeout(() => {
            console.log('[Messages] Messages after 1 second:', data?.length ?? 0);
          }, 1000);
        } else {
          console.log('[Messages] Request was cancelled or aborted, not updating state');
        }
      } catch (e) {
        // Only show error if not cancelled and not aborted
        if (!cancelled && !abortControllerRef.current?.signal.aborted) {
          console.error('load messages failed', e);
          setError('Failed to load messages. Please try again.');
        }
      } finally {
        // Only update loading state if not cancelled and not aborted
        if (!cancelled && !abortControllerRef.current?.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      // Don't call setState after unmount/switch
    };
  }, [selectedConversationKey]); // IMPORTANT: depend on the key

  // Real-time updates for the active conversation
  useEffect(() => {
    if (!selectedConversation) return;

    const { participant1_id, participant2_id } = selectedConversation;

    const channel = supabase
      .channel(`messages:${selectedConversationKey}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        const m = payload.new;

        const matchesParticipants =
          (m.sender_id === participant1_id && m.recipient_id === participant2_id) ||
          (m.sender_id === participant2_id && m.recipient_id === participant1_id);

        // Only check participants, ignore availability_id completely
        if (matchesParticipants) {
          setMessages((prev) => {
            // avoid duplicates
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversationKey, selectedConversation]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch conversations where the current user is a participant
      const { data, error } = await supabase
        .from('conversations')
        .select(
          `
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
        `
        )
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Process conversations to show the other participant
      const processedConversations = data.map((conv) => {
        const otherParticipant =
          conv.participant1_id === user.id ? conv.participant2 : conv.participant1;
        return {
          ...conv,
          otherParticipant,
          displayName: `${otherParticipant.first_name} ${otherParticipant.last_name}`,
          profilePhoto: otherParticipant.profile_photo_url,
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
    if (!conversationId || !selectedConversation) return;

    try {
      const { participant1_id, participant2_id, availability_id } = selectedConversation;

      // Log what we're querying
      console.log('[fetchMessages] args', {
        p1: participant1_id,
        p2: participant2_id,
        availability_id: availability_id ?? null,
        conversationId,
      });

      // First, let's test if we can fetch ANY messages at all
      const { data: testMessages, error: testError } = await supabase
        .from('messages')
        .select('id, sender_id, recipient_id, content')
        .limit(3);

      console.log('[fetchMessages] Test - any messages in DB:', testMessages?.length ?? 0);
      if (testMessages && testMessages.length > 0) {
        console.log('[fetchMessages] Sample message:', testMessages[0]);
      }
      if (testError) {
        console.error('[fetchMessages] Test error:', testError);
      }

      // Simplified query - only filter by participants, ignore availability_id completely
      const { data, error } = await supabase
        .from('messages')
        .select(
          `
          *,
          sender:profiles!messages_sender_id_fkey (
            id,
            first_name,
            last_name,
            profile_photo_url
          )
        `
        )
        .or(
          `and(sender_id.eq.${participant1_id},recipient_id.eq.${participant2_id}),and(sender_id.eq.${participant2_id},recipient_id.eq.${participant1_id})`
        )
        .order('created_at', { ascending: true });

      // Log result size/errors
      console.log('[fetchMessages] Filtered rows', data?.length ?? 0);
      if (error) {
        console.error('[fetchMessages] supabase error', error);
        throw error;
      }

      console.log('[fetchMessages] Returning messages:', data?.length ?? 0);

      // Return the data so it can be used by the caller
      return data || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return []; // Return empty array on error
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
          content: newMessage.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const _result = await response.json();

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

  const _openMessageModal = (recipient, availabilityPost) => {
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
        conversation: selectedConversation,
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
      hour12: true,
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
    <div
      className="
        flex flex-col
        h-[calc(100dvh)] md:h-screen
        overflow-hidden
        bg-white
        messages-page
      "
    >
      {/* Header */}
      <div className="flex-shrink-0 border-b px-4 py-4 bg-white">
        <h1 className="text-lg sm:text-xl font-semibold">💬 Messages</h1>
        <p className="text-sm text-gray-600 mt-1">
          Connect with other dog lovers in your community
        </p>
      </div>

      {/* Body: Sidebar + Thread */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`w-full lg:w-80 border-r border-gray-200 bg-gray-50 flex flex-col min-h-0 ${showConversations ? 'flex' : 'hidden lg:flex'}`}
        >
          <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
            <button
              onClick={() => setShowConversations(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto ios-scroll">
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
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
                      <h3 className="font-semibold text-gray-900 truncate">
                        {conversation.displayName}
                      </h3>
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {conversation.availability?.title || 'Availability Post'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(conversation.last_message_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Thread */}
        <section className="flex-1 min-h-0 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Conversation Header */}
              <div className="flex-shrink-0 border-b px-4 py-4 bg-white">
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
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center text-lg font-medium text-gray-600">
                        {selectedConversation.displayName?.[0] || '👤'}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {selectedConversation.displayName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {selectedConversation.availability?.post_type === 'dog_available'
                          ? 'Dog Owner'
                          : 'PetPal'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                    <div className="text-sm text-gray-500 truncate">
                      {selectedConversation.availability?.title}
                    </div>
                    <button
                      onClick={openMeetingModal}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap font-medium"
                    >
                      📅 Schedule Meeting
                    </button>
                  </div>
                </div>
              </div>

              {/* Scrollable Messages */}
              <div
                key={selectedConversationKey}
                id="message-scroll"
                className="
                  flex-1 min-h-0
                  overflow-y-auto overflow-x-hidden ios-scroll
                  px-4 py-4
                  bg-gray-50
                  break-words
                  space-y-3
                  max-w-full
                "
              >
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'} message-container`}
                  >
                    <div
                      className={`message-bubble px-4 py-3 rounded-2xl break-words shadow-sm max-w-full ${
                        message.sender_id === user.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                      <p
                        className={`text-xs mt-2 ${
                          message.sender_id === user.id ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                      <div className="text-red-600 mr-2">⚠️</div>
                      <div>
                        <p className="text-red-800 font-medium">Failed to load messages</p>
                        <p className="text-red-600 text-sm">{error}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setError(null);
                        if (selectedConversation) {
                          fetchMessages(selectedConversation.id);
                        }
                      }}
                      className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                )}

                <div id="bottom-anchor" />
              </div>

              {/* Message Input */}
              <div className="flex-shrink-0 border-t bg-white p-4 p-safe">
                <form
                  onSubmit={sendMessage}
                  className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 message-input"
                >
                  <textarea
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      // Auto-resize textarea
                      const textarea = e.target;
                      textarea.style.height = 'auto';
                      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'; // Max 6 lines (20px per line)
                    }}
                    onInput={(e) => {
                      // Auto-resize on input (for mobile)
                      const textarea = e.target;
                      textarea.style.height = 'auto';
                      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
                    }}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm auto-resize-textarea"
                    disabled={sending}
                    rows={1}
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap font-medium text-sm self-end"
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
        </section>
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
  );
}
