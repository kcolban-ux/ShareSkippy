/**
 * @fileoverview FINAL FIX - useUnreadMessages hook with proper read marking
 * @path /hooks/useUnreadMessages.ts
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/libs/supabase';
import type { User } from '@supabase/supabase-js';

interface NotificationState {
  totalUnread: number;
  unreadByConversation: Map<string, number>;
  hasNewMessages: boolean;
  lastChecked: Date | null;
}

interface RealtimePayload {
  new: {
    id: string;
    is_read: boolean;
    conversation_id: string;
    recipient_id: string;
  };
  old: {
    is_read: boolean;
  };
}

export function useUnreadMessages(user: User | null) {
  const [notificationState, setNotificationState] = useState<NotificationState>({
    totalUnread: 0,
    unreadByConversation: new Map(),
    hasNewMessages: false,
    lastChecked: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  /**
   * Fetch unread message counts
   */
  const fetchUnreadCounts = useCallback(async () => {
    if (!user) {
      setNotificationState({
        totalUnread: 0,
        unreadByConversation: new Map(),
        hasNewMessages: false,
        lastChecked: null,
      });
      setIsLoading(false);
      return;
    }

    try {
      console.log('[fetchUnreadCounts] 🔍 Fetching unread messages for user:', user.id);

      // Fetch ALL unread messages where YOU are the recipient
      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, created_at')
        .eq('recipient_id', user.id) // YOU are receiving
        .eq('is_read', false) // Message is unread
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[fetchUnreadCounts] ❌ Error:', error);
        throw error;
      }

      if (!isMountedRef.current) return;

      const unreadCount = data?.length || 0;
      console.log('[fetchUnreadCounts] 📊 Total unread messages:', unreadCount);

      // Group by conversation_id
      const conversationMap = new Map<string, number>();

      data?.forEach((msg) => {
        if (msg.conversation_id) {
          const current = conversationMap.get(msg.conversation_id) || 0;
          conversationMap.set(msg.conversation_id, current + 1);
        }
      });

      console.log(
        '[fetchUnreadCounts] 📊 Unread by conversation:',
        Object.fromEntries(conversationMap)
      );

      setNotificationState({
        totalUnread: unreadCount,
        unreadByConversation: conversationMap,
        hasNewMessages: unreadCount > 0,
        lastChecked: new Date(),
      });
    } catch (error) {
      console.error('[fetchUnreadCounts] ❌ Error:', error);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [user]);

  /**
   * Mark messages as read for a specific conversation
   */
  const markConversationAsRead = useCallback(
    async (
      conversationId: string,
      participant1Id: string,
      participant2Id: string
    ): Promise<void> => {
      if (!user) {
        console.log('[markConversationAsRead] ❌ No user found');
        return;
      }

      console.log('[markConversationAsRead] 🔄 Starting for conversation:', conversationId);
      console.log('[markConversationAsRead] 📋 Params:', {
        conversationId,
        participant1Id,
        participant2Id,
        currentUserId: user.id,
      });

      try {
        // METHOD 1: Mark by conversation_id (most reliable)
        console.log('[markConversationAsRead] 🔄 Method 1: Marking by conversation_id...');

        const { data: method1Data, error: method1Error } = await supabase
          .from('messages')
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .eq('conversation_id', conversationId)
          .eq('recipient_id', user.id)
          .eq('is_read', false)
          .select('id, sender_id, recipient_id');

        if (method1Error) {
          console.error('[markConversationAsRead] ❌ Method 1 error:', method1Error);
        } else {
          console.log(
            '[markConversationAsRead] ✅ Method 1 marked:',
            method1Data?.length || 0,
            'messages'
          );
          if (method1Data && method1Data.length > 0) {
            console.log(
              '[markConversationAsRead] 📝 Message IDs:',
              method1Data.map((m) => m.id)
            );
          }
        }

        // METHOD 2: Mark by participants (backup method)
        // Only mark messages where:
        // - You are the recipient
        // - The sender is the other participant
        // - Message is unread
        console.log('[markConversationAsRead] 🔄 Method 2: Marking by participants...');

        const otherParticipantId = participant1Id === user.id ? participant2Id : participant1Id;

        const { data: method2Data, error: method2Error } = await supabase
          .from('messages')
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .eq('recipient_id', user.id)
          .eq('sender_id', otherParticipantId)
          .eq('is_read', false)
          .select('id, sender_id, recipient_id');

        if (method2Error) {
          console.error('[markConversationAsRead] ❌ Method 2 error:', method2Error);
        } else {
          console.log(
            '[markConversationAsRead] ✅ Method 2 marked:',
            method2Data?.length || 0,
            'messages'
          );
          if (method2Data && method2Data.length > 0) {
            console.log(
              '[markConversationAsRead] 📝 Message IDs:',
              method2Data.map((m) => m.id)
            );
          }
        }

        const totalMarked = (method1Data?.length || 0) + (method2Data?.length || 0);
        console.log('[markConversationAsRead] 📊 Total messages marked:', totalMarked);

        if (totalMarked === 0) {
          console.log('[markConversationAsRead] ⚠️ No messages were marked. Possible reasons:');
          console.log('  - All messages already marked as read');
          console.log('  - conversation_id mismatch');
          console.log('  - No unread messages in this conversation');
        }

        // Wait for database to propagate
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Fetch fresh counts
        console.log('[markConversationAsRead] 🔄 Fetching fresh counts...');
        await fetchUnreadCounts();

        console.log('[markConversationAsRead] ✅ Complete');
      } catch (error) {
        console.error('[markConversationAsRead] ❌ Unexpected error:', error);
        console.error('[markConversationAsRead] 📋 Error details:', JSON.stringify(error, null, 2));

        // Still try to refresh counts
        await fetchUnreadCounts();
      }
    },
    [user, fetchUnreadCounts]
  );

  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotificationState({
        totalUnread: 0,
        unreadByConversation: new Map(),
        hasNewMessages: false,
        lastChecked: new Date(),
      });
    } catch (error) {
      console.error('[markAllAsRead] Error:', error);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true;

    if (user) {
      console.log('[useUnreadMessages] Initial fetch for user:', user.id);
      fetchUnreadCounts();
    } else {
      setIsLoading(false);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [user, fetchUnreadCounts]);

  // Real-time subscription for message changes
  useEffect(() => {
    if (!user) return;

    console.log('[useUnreadMessages] Setting up real-time subscription');

    const channel = supabase
      .channel('unread-messages-global')
      .on(
        'postgres_changes' as never,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload: RealtimePayload) => {
          console.log(
            '[Real-time HOOK] New message inserted:',
            payload.new.id,
            'is_read:',
            payload.new.is_read
          );
          // Only refresh if the message is unread
          if (payload.new.is_read === false) {
            fetchUnreadCounts();
          }
        }
      )
      .on(
        'postgres_changes' as never,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload: RealtimePayload) => {
          console.log('[Real-time HOOK] Message updated:', payload.new.id);

          // Only process if this update affects the current user
          if (payload.new.recipient_id === user.id) {
            console.log('[Real-time HOOK] Update is for current user');

            // If message was marked as read, immediately update local state
            if (payload.new.is_read === true && payload.old.is_read === false) {
              const convId = payload.new.conversation_id;
              console.log('[Real-time HOOK] Message marked as read, updating state optimistically');

              setNotificationState((prev) => {
                const newMap = new Map(prev.unreadByConversation);
                const currentCount = newMap.get(convId) || 0;

                if (currentCount > 0) {
                  newMap.set(convId, currentCount - 1);
                  if (currentCount - 1 === 0) {
                    newMap.delete(convId);
                  }
                }

                return {
                  totalUnread: Math.max(0, prev.totalUnread - 1),
                  unreadByConversation: newMap,
                  hasNewMessages: prev.totalUnread - 1 > 0,
                  lastChecked: new Date(),
                };
              });
            }

            // Still fetch to ensure consistency
            setTimeout(() => fetchUnreadCounts(), 100);
          }
        }
      )
      .subscribe((status) => {
        console.log('[Real-time HOOK] Subscription status:', status);
      });

    return () => {
      console.log('[useUnreadMessages] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return {
    ...notificationState,
    isLoading,
    fetchUnreadCounts,
    markConversationAsRead,
    markAllAsRead,
  };
}

/**
 * DEBUGGING TIPS:
 *
 * 1. Open browser console and watch for these logs:
 *    - [fetchUnreadCounts] - shows how many unread messages found
 *    - [markConversationAsRead] - shows marking process
 *    - [Real-time HOOK] - shows real-time updates in the hook
 *
 * 2. Check your database:
 *    SELECT id, sender_id, recipient_id, conversation_id, is_read, created_at
 *    FROM messages
 *    WHERE recipient_id = 'YOUR_USER_ID'
 *    ORDER BY created_at DESC;
 *
 * 3. Verify conversation_id is set:
 *    - All messages should have a conversation_id
 *    - If null, the message won't be tracked properly
 *
 * 4. Check your /api/messages endpoint:
 *    - Make sure it sets conversation_id when creating messages
 *    - Make sure it sets is_read to false by default
 */
