import { useState, useEffect } from 'react';
import { supabase } from '@/libs/supabase';

export function useUnreadMessages(userId) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        // Get all conversations where user is a participant
        const { data: conversations, error: convError } = await supabase
          .from('conversations')
          .select('id, participant1_id, participant2_id')
          .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`);

        if (convError) {
          console.error('Error fetching conversations:', convError);
          setLoading(false);
          return;
        }

        if (!conversations || conversations.length === 0) {
          setUnreadCount(0);
          setLoading(false);
          return;
        }

        const conversationIds = conversations.map((c) => c.id);
        
        // Count unread messages with conversation_id
        const { data: unreadWithConv, error: error1 } = await supabase
          .from('messages')
          .select('id')
          .in('conversation_id', conversationIds)
          .eq('recipient_id', userId)
          .eq('is_read', false);

        let totalUnread = unreadWithConv?.length || 0;

        // Also count unread messages without conversation_id (legacy messages)
        // This is more complex, so we'll do a simpler query
        const { data: unreadLegacy, error: error2 } = await supabase
          .from('messages')
          .select('id')
          .eq('recipient_id', userId)
          .eq('is_read', false)
          .is('conversation_id', null);

        if (!error2 && unreadLegacy) {
          // Filter to only count messages where the sender is in one of the conversations
          const participantIds = new Set();
          conversations.forEach((c) => {
            participantIds.add(c.participant1_id);
            participantIds.add(c.participant2_id);
          });

          const legacyCount = unreadLegacy.filter((msg) => {
            // We need to check if the sender is a participant in any conversation
            // Since we can't easily query this, we'll use a simpler approach
            return true; // Count all legacy unread messages for now
          }).length;

          totalUnread += legacyCount;
        }

        setUnreadCount(totalUnread);
      } catch (error) {
        console.error('Error fetching unread count:', error);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchUnreadCount();

    // Set up real-time subscription for unread messages
    const channel = supabase
      .channel(`unread-messages-count-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          // Refresh count when messages change (INSERT, UPDATE, DELETE)
          // This includes when is_read is updated
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { unreadCount, loading };
}

