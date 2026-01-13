/**
 * @fileoverview This file defines the main Messages page for the application.
 * It handles fetching conversations, displaying a selected conversation's
 * messages, and sending new messages. It uses a protected route hook
 * to ensure the user is authenticated.
 * @path /app/(main)/messages/page.tsx
 */

'use client';

// #region Imports
import {
  useCallback,
  useState,
  useEffect,
  useMemo,
  useRef,
  ReactElement,
  FormEvent,
  ChangeEvent,
  KeyboardEvent,
  SyntheticEvent,
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FaCalendarAlt } from 'react-icons/fa';
import { CgProfile } from 'react-icons/cg';
import { MdPostAdd } from 'react-icons/md';
import { supabase } from '@/libs/supabase';
import MessageModal from '@/components/MessageModal';
import MeetingModal from '@/components/MeetingModal';
import { useProtectedRoute } from '@/hooks/useProtectedRoute'; // Assumed path
import { getRoleLabel, formatParticipantLocation, formatTime, formatDate } from '@/libs/utils';

// --- Supabase Types ---
import { User } from '@supabase/supabase-js';
// #endregion

// #region Types
/**
 * @description Basic profile structure for participants and senders.
 */
interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_url: string | null;
  role?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
}

/**
 * @description Basic availability post details.
 */
interface Availability {
  id: string;
  title: string | null;
  post_type: string | null;
}

/**
 * @description The raw conversation object from Supabase, including nested relations.
 */
interface RawConversation {
  id: string;
  created_at: string;
  participant1_id: string;
  participant2_id: string;
  availability_id: string | null;
  last_message_at: string;
  participant1: Profile;
  participant2: Profile;
  availability: Availability | null;
}

/**
 * @description The processed conversation object used for state and rendering.
 * Includes the "otherParticipant" helper properties.
 */
export interface Conversation extends RawConversation {
  otherParticipant: Profile;
  displayName: string;
  profilePhoto: string | null;
}

/**
 * @description The message object as returned by the 'messages' table.
 * The component only uses fields from the table itself.
 */
export interface Message {
  id: string;
  created_at: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  conversation_id?: string | null;
  availability_id?: string | null;
}

/**
 * @description State for the new message modal.
 */
interface MessageModalState {
  isOpen: boolean;
  recipient: Profile | null;
  availabilityPost: Availability | null;
}

/**
 * @description State for the meeting modal.
 */
interface MeetingModalState {
  isOpen: boolean;
  recipient: Profile | null;
  conversation: Conversation | null;
}
// #endregion

// #region Component
export default function MessagesPage(): ReactElement {
  // #region State & Hooks
  /**
   * @description Handles user authentication and redirection for the page.
   * `authLoading` is true while the user's session is being verified.
   * The hook redirects to the login page if the user is not authenticated.
   * We assert `user` as `User` because the hook guarantees it post-loading.
   */
  const { user, isLoading: authLoading } = useProtectedRoute() as {
    user: User;
    isLoading: boolean;
  };

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [newMessage, setNewMessage] = useState<string>('');
  const [messageModal, setMessageModal] = useState<MessageModalState>({
    isOpen: false,
    recipient: null,
    availabilityPost: null,
  });
  const [meetingModal, setMeetingModal] = useState<MeetingModalState>({
    isOpen: false,
    recipient: null,
    conversation: null,
  });
  const [showConversations, setShowConversations] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * @description Ref to hold an AbortController for cancelling in-flight message fetches.
   */
  const abortControllerRef = useRef<AbortController | null>(null);
  /**
   * @description Ref to the message scrolling container for auto-scrolling.
   */
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // #endregion

  // #region Memos
  /**
   * @description Creates a unique key for the selected conversation.
   * This is used to reset the message-fetching useEffect and Supabase channel subscription.
   */
  const selectedConversationKey = useMemo(() => {
    const c = selectedConversation;
    if (!c) return 'none';
    return [c.id ?? 'noid', c.participant1_id, c.participant2_id, c.availability_id ?? 'na'].join(
      ':'
    );
  }, [selectedConversation]);
  // #endregion

  // #region Handlers
  /**
   * @description Fetches all messages for the currently selected conversation.
   */
  const fetchMessages = useCallback(
    async (conversationId: string): Promise<Message[]> => {
      if (!conversationId || !selectedConversation) return [];

      try {
        const { participant1_id, participant2_id } = selectedConversation;

        const { data, error } = await supabase
          .from('messages')
          .select('*') // OPTIMIZATION: Removed unused 'sender' join.
          .or(
            // Filter for messages between p1 and p2 in either direction
            `and(sender_id.eq.${participant1_id},recipient_id.eq.${participant2_id}),and(sender_id.eq.${participant2_id},recipient_id.eq.${participant1_id})`
          )
          .order('created_at', { ascending: true });

        if (error) {
          console.error('[fetchMessages] supabase error', error);
          throw error;
        }

        return (data as Message[]) || [];
      } catch (error) {
        console.error('Error fetching messages:', error);
        return [];
      }
    },
    [selectedConversation] // Depends on selectedConversation to get participant IDs
  );

  /**
   * @description Fetches all conversations for the currently authenticated user.
   */
  const fetchConversations = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('conversations')
        .select(
          `
          *,
          participant1:profiles!conversations_participant1_id_fkey (
            id,
            first_name,
            last_name,
            profile_photo_url,
            role,
            neighborhood,
            city,
            state
          ),
          participant2:profiles!conversations_participant2_id_fkey (
            id,
            first_name,
            last_name,
            profile_photo_url,
            role,
            neighborhood,
            city,
            state
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

      // Process conversations to identify the "other participant"
      const processedConversations = (data as RawConversation[]).map((conv): Conversation => {
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
  }, [user, selectedConversation]);

  /**
   * @description Sends a new message via the API route.
   */
  const sendMessage = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation?.otherParticipant) return;

    try {
      setSending(true);

      //create temp message
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        sender_id: user!.id,
        recipient_id: selectedConversation.otherParticipant.id,
        content: newMessage.trim(),
        created_at: new Date().toISOString(),
        availability_id: selectedConversation.availability_id,
        conversation_id: selectedConversation.id,
      };

      //update it to the chatbox for sender
      setMessages((prev) => [...prev, tempMessage]);
      setNewMessage('');

      //send to backend
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: selectedConversation.otherParticipant.id,
          availability_id: selectedConversation.availability_id,
          content: tempMessage.content,
        }),
      });

      if (!response.ok) {
        //remove the tempMessage
        setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      await fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again');
    } finally {
      setSending(false);
    }
  };

  /**
   * @description Closes the new message modal.
   */
  const closeMessageModal = (): void => {
    setMessageModal({ isOpen: false, recipient: null, availabilityPost: null });
  };

  /**
   * @description Opens the meeting scheduling modal.
   */
  const openMeetingModal = (): void => {
    if (selectedConversation) {
      setMeetingModal({
        isOpen: true,
        recipient: selectedConversation.otherParticipant,
        conversation: selectedConversation,
      });
    }
  };

  /**
   * @description Closes the meeting scheduling modal.
   */
  const closeMeetingModal = (): void => {
    setMeetingModal({ isOpen: false, recipient: null, conversation: null });
  };

  /**
   * @description Callback fired after a meeting is created to refresh data.
   */
  const handleMeetingCreated = async (): Promise<void> => {
    if (selectedConversation) {
      await fetchMessages(selectedConversation.id);
      await fetchConversations();
    }
  };
  // #endregion

  // #region Effects
  /**
   * @description Fetches messages when the selected conversation changes.
   * This effect includes cleanup logic to abort stale requests
   * if the user quickly switches between conversations.
   */
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      setError(null);
      return;
    }

    // Abort any previous fetch that is still in progress
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    let cancelled = false;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await fetchMessages(selectedConversation.id);

        if (!cancelled && !abortControllerRef.current?.signal.aborted) {
          setMessages(data || []);
        }
      } catch (e) {
        if (!cancelled && !abortControllerRef.current?.signal.aborted) {
          console.error('load messages failed', e);
          setError('Failed to load messages. Please try again.');
        }
      } finally {
        if (!cancelled && !abortControllerRef.current?.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    // Cleanup function to set a cancellation flag
    return () => {
      cancelled = true;
    };
  }, [selectedConversation, selectedConversationKey, fetchMessages]);

  /**
   * @description Subscribes to Supabase real-time changes for new messages
   * in the currently active conversation.
   */
  useEffect(() => {
    if (!selectedConversation || !user) return;

    const { participant1_id, participant2_id } = selectedConversation;

    const channel = supabase
      .channel(`messages:${selectedConversationKey}`)
      .on(
        'postgres_changes' as never,
        { event: '*', schema: 'public', table: 'messages' },
        (payload: { new: Message }) => {
          const m = payload.new;

          // Check if the new message belongs to this conversation
          const matchesParticipants =
            (m.sender_id === participant1_id && m.recipient_id === participant2_id) ||
            (m.sender_id === participant2_id && m.recipient_id === participant1_id);

          if (matchesParticipants) {
            setMessages((prev: Message[]) => {
              //delete mapped tempMessage
              const withoutTemps = prev.filter((x) => {
                const isTemp = x.id.startsWith('temp-');
                if (!isTemp) return true;

                return !(
                  x.sender_id === m.sender_id &&
                  x.recipient_id === m.recipient_id &&
                  x.content === m.content
                );
              });

              // Avoid duplicates
              if (withoutTemps.some((x) => x.id === m.id)) return withoutTemps;
              // Add new message and re-sort
              return [...withoutTemps, m].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
            });
          }
        }
      )
      .subscribe();

    // Unsubscribe from the channel on cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversationKey, selectedConversation, user]);

  /**
   * @description Fetches the initial list of conversations once the user is loaded.
   */
  useEffect(() => {
    if (user && !authLoading) {
      fetchConversations();
    }
  }, [user, authLoading, fetchConversations]);

  /**
   * @description Auto-scrolls the message container to the bottom when new messages are added.
   */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  // #endregion

  // #region Render Logic
  /**
   * @description Primary loading state while verifying authentication.
   */
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

  /**
   * @description This `if (!user)` block is no longer needed.
   * The `useProtectedRoute` hook handles redirection automatically
   * if the user is not authenticated. If the code reaches this point,
   * `user` is guaranteed to be present.
   */
  // if (!user) { ... } // <-- This block is now removed.

  // #endregion

  // #region JSX
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
      <div className="shrink-0 border-b px-4 py-4 bg-white">
        <h1 className="text-lg sm:text-xl font-semibold">💬 Messages</h1>
        <p className="text-sm text-gray-600 mt-1">
          Connect with other dog lovers in your community
        </p>
      </div>

      {/* Body: Sidebar + Thread */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`w-full lg:w-80 border-r border-gray-200 bg-gray-50 flex flex-col min-h-0 ${
            showConversations ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
            <button
              onClick={() => setShowConversations(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
              aria-label="Close conversations list"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto ios-scroll">
            {loading && (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            )}
            {!loading && conversations.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                <p>No conversations yet</p>
                <p className="text-sm mt-2">Start messaging someone from the community!</p>
              </div>
            )}
            {!loading &&
              conversations.length > 0 &&
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => {
                    setSelectedConversation(conversation);
                    setShowConversations(false); // Hide sidebar on mobile after selection
                  }}
                  onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedConversation(conversation);
                      setShowConversations(false);
                    }
                  }}
                  tabIndex={0}
                  className={`w-full text-left p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors ${
                    selectedConversation?.id === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {conversation.profilePhoto ? (
                      <Image
                        src={conversation.profilePhoto}
                        alt={conversation.displayName}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-12 h-12 bg-linear-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center text-lg font-medium text-gray-600">
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
                </button>
              ))}
          </div>
        </aside>

        {/* Thread */}
        <section className="flex-1 min-h-0 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Conversation Header */}
              <div className="shrink-0 border-b px-4 py-4 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowConversations(true)}
                      className="lg:hidden text-gray-500 hover:text-gray-700 mr-2"
                      aria-label="Back to conversations list"
                    >
                      ←
                    </button>
                    {selectedConversation.profilePhoto ? (
                      <Image
                        src={selectedConversation.profilePhoto}
                        alt={selectedConversation.displayName}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-12 h-12 bg-linear-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center text-lg font-medium text-gray-600">
                        {selectedConversation.displayName?.[0] || '👤'}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {selectedConversation.displayName}
                      </h3>
                      <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                        {selectedConversation.otherParticipant?.role
                          ? getRoleLabel(selectedConversation.otherParticipant.role)
                          : selectedConversation.availability?.post_type === 'dog_available'
                            ? 'Dog Owner'
                            : 'PetPal'}
                      </p>
                      {formatParticipantLocation(selectedConversation.otherParticipant) && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatParticipantLocation(selectedConversation.otherParticipant)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                    <div className="text-sm text-gray-500 truncate">
                      {selectedConversation.availability?.title}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/profile/${selectedConversation.otherParticipant?.id}`}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap font-medium"
                      >
                        <CgProfile className="text-lg" />
                        View Profile
                      </Link>
                      {(selectedConversation.availability?.id ||
                        selectedConversation.availability_id) && (
                        <Link
                          href={`/community/availability/${selectedConversation.availability?.id || selectedConversation.availability_id}`}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap font-medium"
                        >
                          <MdPostAdd />
                          View Post
                        </Link>
                      )}
                      <button
                        onClick={openMeetingModal}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap font-medium"
                      >
                        <FaCalendarAlt /> Schedule Meeting
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scrollable Messages */}
              <div
                key={selectedConversationKey}
                ref={scrollRef}
                id="message-scroll"
                className="
                  flex-1 min-h-0
                  overflow-y-auto overflow-x-hidden ios-scroll
                  px-4 py-4
                  bg-gray-50
                  wrap-break-word
                  space-y-3
                  max-w-full
                "
              >
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender_id === user.id ? 'justify-end' : 'justify-start'
                    } message-container`}
                  >
                    <div
                      className={`message-bubble px-4 py-3 rounded-2xl wrap-break-word shadow-xs max-w-full ${
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
                      className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded-sm hover:bg-red-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                )}

                <div id="bottom-anchor" />
              </div>

              {/* Message Input */}
              <div className="shrink-0 border-t bg-white p-4 p-safe">
                <form
                  onSubmit={sendMessage}
                  className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 message-input"
                >
                  <textarea
                    value={newMessage}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                      setNewMessage(e.target.value);
                      // Auto-resize textarea
                      const textarea = e.target;
                      textarea.style.height = 'auto';
                      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'; // Max 6 lines
                    }}
                    onInput={(e: SyntheticEvent<HTMLTextAreaElement>) => {
                      // Auto-resize on input (for mobile)
                      const textarea = e.target as HTMLTextAreaElement;
                      textarea.style.height = 'auto';
                      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
                    }}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm auto-resize-textarea"
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
  // #endregion
}
// #endregion
