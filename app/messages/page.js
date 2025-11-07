'use client';
import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSupabaseAuth } from '@/libs/supabase/hooks';
import { supabase } from '@/libs/supabase';
import MessageModal from '@/components/MessageModal';
import MeetingModal from '@/components/MeetingModal';
import MessagesProfileCard from '@/components/messages/ProfileCard';
import AvailabilityCard from '@/components/messages/AvailabilityCard';

export default function MessagesPage() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);

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
  const [filter, setFilter] = useState(() => {
    // Load filter from localStorage, default to 'all'
    if (typeof window !== 'undefined') {
      return localStorage.getItem('messages-filter') || 'all';
    }
    return 'all';
  });
  const abortControllerRef = useRef(null);
  const recentlyMarkedReadRef = useRef(new Set()); // Track conversations we just marked as read

  const selectedConversationKey = useMemo(() => {
    const c = selectedConversation;
    if (!c) return 'none';
    return [c.id ?? 'noid', c.participant1_id, c.participant2_id, c.availability_id ?? 'na'].join(
      ':'
    );
  }, [selectedConversation]);

  // Filter conversations based on selected filter
  const filteredConversations = useMemo(() => {
    if (filter === 'unread') {
      return conversations.filter(conv => conv.unreadCount > 0);
    }
    return conversations;
  }, [conversations, filter]);

  // Update localStorage when filter changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('messages-filter', filter);
    }
  }, [filter]);

  const fetchMessages = useCallback(
    async (conversationId) => {
      if (!conversationId || !selectedConversation) return;

      try {
        const { participant1_id, participant2_id } = selectedConversation;

        // Always use participant-based query (works with or without conversation_id)
        // This is more reliable and works for both new and legacy messages
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

        if (error) {
          console.error('[fetchMessages] supabase error', error);
          throw error;
        }

        return data || [];
      } catch (error) {
        console.error('Error fetching messages:', error);
        return [];
      }
    },
    [selectedConversation]
  );

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      setError(null);
      return;
    }

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
          
          // Mark messages as read after fetching them
          try {
            const markReadResponse = await fetch('/api/messages/mark-read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ conversation_id: selectedConversation.id }),
            });
            
            if (markReadResponse.ok) {
              const responseData = await markReadResponse.json();
              console.log('Mark read successful:', responseData);
              
              // Track that we just marked this conversation as read
              recentlyMarkedReadRef.current.add(selectedConversation.id);
              
              // Clear the flag after 5 seconds (enough time for DB to update)
              setTimeout(() => {
                recentlyMarkedReadRef.current.delete(selectedConversation.id);
              }, 5000);
              
              // Update local messages state to mark them as read immediately
              setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                  msg.recipient_id === user.id && !msg.is_read
                    ? { ...msg, is_read: true }
                    : msg
                )
              );

              // Update selected conversation's unread count immediately
              setSelectedConversation((prev) => {
                if (prev && prev.id === selectedConversation.id) {
                  return { ...prev, unreadCount: 0 };
                }
                return prev;
              });

              // Also update the conversation in the conversations list immediately
              setConversations((prevConvs) =>
                prevConvs.map((conv) =>
                  conv.id === selectedConversation.id
                    ? { ...conv, unreadCount: 0 }
                    : conv
                )
              );

              // Refresh conversations to update unread counts after a delay
              // This allows the database update to propagate and ensures we get fresh counts
              setTimeout(() => {
                fetchConversations();
              }, 2000);
            } else {
              const errorData = await markReadResponse.json().catch(() => ({}));
              console.error('Mark read failed:', markReadResponse.status, errorData);
            }
          } catch (markReadError) {
            console.error('Error marking messages as read:', markReadError);
            // Don't fail the message fetch if mark-read fails
          }
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

    return () => {
      cancelled = true;
    };
  }, [selectedConversationKey, fetchMessages]);

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

        if (matchesParticipants) {
          setMessages((prev) => {
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

  const fetchConversations = useCallback(async () => {
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
            role
          ),
          participant2:profiles!conversations_participant2_id_fkey (
            id,
            first_name,
            last_name,
            profile_photo_url,
            role
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

      // Handle case where data might be null
      if (!data) {
        console.warn('No conversations data returned');
        setConversations([]);
        setLoading(false);
        return;
      }

      // Fetch unread counts for all conversations
      const conversationIds = data ? data.map((conv) => conv.id).filter(Boolean) : [];
      let unreadCounts = {};
      
      if (conversationIds.length > 0) {
        // First, try to get unread messages with conversation_id
        const { data: unreadMessagesWithConv, error: unreadError1 } = await supabase
          .from('messages')
          .select('conversation_id')
          .in('conversation_id', conversationIds)
          .eq('recipient_id', user.id)
          .eq('is_read', false);

        if (!unreadError1 && unreadMessagesWithConv) {
          // Count unread messages per conversation
          unreadMessagesWithConv.forEach((msg) => {
            if (msg.conversation_id) {
              unreadCounts[msg.conversation_id] = (unreadCounts[msg.conversation_id] || 0) + 1;
            }
          });
        }

        // Also check for unread messages without conversation_id (legacy messages)
        // Query all unread messages for this user without conversation_id
        const { data: unreadLegacy, error: unreadError2 } = await supabase
          .from('messages')
          .select('sender_id, recipient_id')
          .eq('recipient_id', user.id)
          .eq('is_read', false)
          .is('conversation_id', null);

        if (!unreadError2 && unreadLegacy) {
          // Match legacy messages to conversations by participant pairs
          unreadLegacy.forEach((msg) => {
            const matchingConv = data.find(
              (conv) =>
                (conv.participant1_id === msg.sender_id && conv.participant2_id === user.id) ||
                (conv.participant2_id === msg.sender_id && conv.participant1_id === user.id)
            );
            if (matchingConv) {
              unreadCounts[matchingConv.id] = (unreadCounts[matchingConv.id] || 0) + 1;
            }
          });
        }
      }

      // Fetch last message preview for each conversation
      const lastMessages = {};
      if (data && data.length > 0) {
        try {
          const conversationIds = data.map((conv) => conv.id).filter(Boolean);
          if (conversationIds.length > 0) {
            const { data: lastMessagesData, error: lastMsgError } = await supabase
              .from('messages')
              .select('conversation_id, content, created_at')
              .in('conversation_id', conversationIds)
              .order('created_at', { ascending: false });
            
            if (lastMsgError) {
              console.error('Error fetching last messages:', lastMsgError);
              // Continue without last message previews
            } else if (lastMessagesData) {
              lastMessagesData.forEach((msg) => {
                if (msg.conversation_id && !lastMessages[msg.conversation_id]) {
                  lastMessages[msg.conversation_id] = msg;
                }
              });
            }
          }
        } catch (lastMsgError) {
          console.error('Error processing last messages:', lastMsgError);
          // Continue without last message previews
        }
      }

      // Process conversations - ensure we always set conversations even if processing fails
      let processedConversations = [];
      try {
        processedConversations = (data || []).map((conv) => {
          const otherParticipant =
            conv.participant1_id === user.id ? conv.participant2 : conv.participant1;
          
          // Handle case where participant might be null
          if (!otherParticipant) {
            console.warn('Missing participant for conversation:', conv.id);
            return null;
          }
          
          const unreadCount = unreadCounts[conv.id] || 0;
          const lastMessage = lastMessages[conv.id];
          return {
            ...conv,
            otherParticipant,
            displayName: `${otherParticipant.first_name || ''} ${otherParticipant.last_name || ''}`.trim() || 'Unknown',
            profilePhoto: otherParticipant.profile_photo_url,
            role: otherParticipant.role,
            unreadCount: unreadCount,
            lastMessagePreview: lastMessage?.content || null,
            lastMessageTime: lastMessage?.created_at || conv.last_message_at,
          };
        }).filter(Boolean); // Remove any null entries
      } catch (processError) {
        console.error('Error processing conversations:', processError);
        // Fallback: create basic conversation objects
        processedConversations = (data || []).map((conv) => ({
          ...conv,
          otherParticipant: conv.participant1_id === user.id ? conv.participant2 : conv.participant1,
          displayName: 'Unknown',
          unreadCount: 0,
        })).filter(conv => conv.otherParticipant);
      }

      setConversations(processedConversations);
      
      // Update selected conversation's unread count if it exists
      // But preserve unreadCount: 0 if we just marked messages as read
      if (selectedConversation) {
        const updatedSelected = processedConversations.find(
          (c) => c.id === selectedConversation.id
        );
        if (updatedSelected) {
          // If we recently marked this conversation as read, force unreadCount to 0
          const wasRecentlyMarkedRead = recentlyMarkedReadRef.current.has(selectedConversation.id);
          
          if (wasRecentlyMarkedRead) {
            // Force unread count to 0 for recently marked conversations
            setSelectedConversation({ ...updatedSelected, unreadCount: 0 });
            // Also update in the conversations list
            setConversations((prevConvs) =>
              prevConvs.map((conv) =>
                conv.id === selectedConversation.id
                  ? { ...conv, unreadCount: 0 }
                  : conv
              )
            );
          } else {
            // Normal update - use the fetched count
            setSelectedConversation(updatedSelected);
          }
        }
      }
      
      // Also update conversations list to force unreadCount: 0 for recently marked conversations
      setConversations((prevConvs) =>
        prevConvs.map((conv) =>
          recentlyMarkedReadRef.current.has(conv.id)
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );

      // Handle URL parameter for deep linking
      const conversationIdFromUrl = searchParams.get('c');
      if (conversationIdFromUrl) {
        const urlConversation = processedConversations.find(c => c.id === conversationIdFromUrl);
        if (urlConversation) {
          setSelectedConversation(urlConversation);
        } else if (processedConversations.length > 0) {
          // URL conversation not found, but we have conversations - clear URL param
          router.replace('/messages', { scroll: false });
          setSelectedConversation(processedConversations[0]);
        }
      } else if (processedConversations.length > 0 && !selectedConversation) {
        // Select the first conversation if none is selected and no URL param
        setSelectedConversation(processedConversations[0]);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError('Failed to load conversations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, searchParams, router, selectedConversation]);

  // Real-time subscription for unread count updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('messages-unread-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          // When a message's is_read status changes, refresh conversations
          // This ensures unread counts stay in sync
          if (payload.new.is_read !== payload.old.is_read) {
            console.log('Message read status changed, refreshing conversations');
            // Debounce to avoid too many refreshes
            setTimeout(() => {
              fetchConversations();
            }, 500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  useEffect(() => {
    if (user && !authLoading) {
      fetchConversations();
    }
  }, [user, authLoading, fetchConversations]);

  // Real-time subscription for unread message counts
  useEffect(() => {
    if (!user) return;

    let timeoutId;
    const channel = supabase
      .channel(`unread-messages-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          // Debounce refresh to avoid too many rapid updates
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            fetchConversations();
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [user]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    const messageContent = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    
    // Create optimistic message
    const optimisticMessage = {
      id: tempId,
      sender_id: user.id,
      recipient_id: selectedConversation.otherParticipant.id,
      conversation_id: selectedConversation.id,
      content: messageContent,
      created_at: new Date().toISOString(),
      is_read: false,
      sender: {
        id: user.id,
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        profile_photo_url: user.user_metadata?.profile_photo_url || null,
      },
    };

    // Add optimistic message immediately
    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage('');
    
    // Scroll to bottom
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);

    try {
      setSending(true);

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: selectedConversation.otherParticipant.id,
          availability_id: selectedConversation.availability_id,
          content: messageContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const { message: serverMessage } = await response.json();

      // Replace optimistic message with server message
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === tempId ? serverMessage : msg
        )
      );

      // Refresh conversations to update the 'last_message_at' for the sidebar
      await fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      
      // Restore message content for retry
      setNewMessage(messageContent);
      
      // Show error toast
      if (typeof window !== 'undefined' && window.toast) {
        window.toast.error('Failed to send message. Please try again.');
      }
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

  const formatTimestamp = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let datePart;
    if (messageDate.getTime() === today.getTime()) {
      datePart = 'Today';
    } else if (messageDate.getTime() === yesterday.getTime()) {
      datePart = 'Yesterday';
    } else if (now.getTime() - messageDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
      datePart = date.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
      datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    const timePart = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return `${datePart}, ${timePart}`;
  };

  const formatRole = (role) => {
    if (!role) return null;
    // Normalize role values
    const normalized = role.toLowerCase();
    if (normalized === 'owner' || normalized === 'dog_owner') return 'Owner';
    if (normalized === 'petpal' || normalized === 'dog_sitter') return 'PetPal';
    if (normalized === 'both') return 'Owner · PetPal';
    return null;
  };

  const formatInboxTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
          className={`w-full lg:w-80 border-r border-gray-200 bg-gray-50 flex flex-col min-h-0 ${showConversations ? 'flex' : 'hidden lg:flex'}`}
        >
          <div className="p-4 border-b border-gray-200 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
              <button
                onClick={() => setShowConversations(false)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            {/* Filter Pills */}
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors relative ${
                  filter === 'unread'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Unread
                {conversations.filter(c => c.unreadCount > 0).length > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-xs font-semibold rounded-full h-4 w-4 min-w-[16px] inline-flex items-center justify-center">
                    {conversations.filter(c => c.unreadCount > 0).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto ios-scroll">
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p>{filter === 'unread' ? 'No unread conversations' : 'No conversations yet'}</p>
                <p className="text-sm mt-2">
                  {filter === 'unread' 
                    ? 'All caught up!' 
                    : 'Start messaging someone from the community!'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => {
                    setSelectedConversation(conversation);
                    setShowConversations(false); // Hide sidebar on mobile after selection
                    // Update URL with shallow routing
                    router.replace(`/messages?c=${conversation.id}`, { scroll: false });
                  }}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors ${
                    selectedConversation?.id === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Link
                      href={`/profile/${conversation.otherParticipant.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0"
                    >
                      {conversation.profilePhoto ? (
                        <img
                          src={conversation.profilePhoto}
                          alt={conversation.displayName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-linear-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center text-lg font-medium text-gray-600">
                          {conversation.displayName?.[0] || '👤'}
                        </div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <Link
                          href={`/profile/${conversation.otherParticipant.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="block flex-1 min-w-0"
                        >
                          <h3 className={`truncate hover:text-blue-600 transition-colors ${
                            conversation.unreadCount > 0 
                              ? 'font-bold text-gray-900' 
                              : 'font-semibold text-gray-900'
                          }`}>
                            {conversation.displayName}
                          </h3>
                        </Link>
                        {conversation.unreadCount > 0 && (
                          <span className="flex-shrink-0 bg-red-500 text-white text-xs font-semibold rounded-full h-5 w-5 min-w-[20px] flex items-center justify-center">
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mb-1">
                        {formatRole(conversation.role) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {formatRole(conversation.role)}
                          </span>
                        )}
                        <p className={`text-sm truncate flex-1 ${
                          conversation.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
                        }`}>
                          {conversation.lastMessagePreview 
                            ? (conversation.lastMessagePreview.length > 50 
                                ? conversation.lastMessagePreview.substring(0, 50) + '...' 
                                : conversation.lastMessagePreview)
                            : 'No messages yet'}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400">
                        {formatInboxTime(conversation.lastMessageTime)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Thread */}
        <section className="flex-1 min-h-0 flex flex-col lg:flex-row">
          {/* Main Thread Content */}
          <div className="flex-1 min-h-0 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Conversation Header */}
              <div className="shrink-0 border-b px-4 py-4 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowConversations(true)}
                      className="lg:hidden text-gray-500 hover:text-gray-700 mr-2"
                    >
                      ←
                    </button>
                    <Link
                      href={`/profile/${selectedConversation.otherParticipant.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0"
                    >
                      {selectedConversation.profilePhoto ? (
                        <img
                          src={selectedConversation.profilePhoto}
                          alt={selectedConversation.displayName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-linear-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center text-lg font-medium text-gray-600">
                          {selectedConversation.displayName?.[0] || '👤'}
                        </div>
                      )}
                    </Link>
                    <div>
                      <Link
                        href={`/profile/${selectedConversation.otherParticipant.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="block"
                      >
                        <h3 className="font-semibold text-gray-900 text-lg hover:text-blue-600 transition-colors">
                          {selectedConversation.displayName}
                        </h3>
                      </Link>
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
                    className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'} message-container`}
                  >
                    <div className={`flex flex-col ${message.sender_id === user.id ? 'items-end' : 'items-start'}`}>
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
                        <div className={`flex items-center space-x-2 mt-2 ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                          <p
                            className={`text-xs ${
                              message.sender_id === user.id ? 'text-blue-100' : 'text-gray-500'
                            }`}
                          >
                            {formatTimestamp(message.created_at)}
                          </p>
                          {/* Read receipt checkmarks - only show if read_at exists */}
                          {message.sender_id === user.id && message.read_at && (
                            <span className="text-xs text-blue-100">
                              ✓✓
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Read Receipt - only show if read_at column exists */}
                      {message.sender_id === user.id && message.read_at && (
                        <p className="text-xs text-gray-400 mt-1 px-1">
                          Seen at {formatTimestamp(message.read_at)}
                        </p>
                      )}
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
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      // Auto-resize textarea
                      const textarea = e.target;
                      textarea.style.height = 'auto';
                      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'; // Max 6 lines
                    }}
                    onInput={(e) => {
                      // Auto-resize on input (for mobile)
                      const textarea = e.target;
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
          </div>

          {/* Right Sidebar - Profile & Availability Cards (Desktop) */}
          {selectedConversation && (
            <aside className="hidden lg:flex lg:flex-col lg:w-80 lg:border-l lg:border-gray-200 lg:bg-gray-50 lg:p-4 lg:space-y-4 lg:overflow-y-auto">
              <MessagesProfileCard 
                profile={selectedConversation.otherParticipant} 
                userId={user?.id}
              />
              {selectedConversation.availability_id && (
                <AvailabilityCard 
                  availabilityId={selectedConversation.availability_id}
                  userId={user?.id}
                />
              )}
            </aside>
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
