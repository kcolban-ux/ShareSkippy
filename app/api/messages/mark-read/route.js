import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';

export async function POST(request) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversation_id } = await request.json();

    if (!conversation_id) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    // Fetch the conversation to verify the user is a participant
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('participant1_id, participant2_id')
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Verify user is a participant
    if (conversation.participant1_id !== user.id && conversation.participant2_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Mark all unread messages in this conversation as read for the current user
    // Only mark messages where the current user is the recipient
    const { error: updateError } = await supabase
      .from('messages')
      .update({ 
        is_read: true,
        read_at: now
      })
      .eq('conversation_id', conversation_id)
      .eq('recipient_id', user.id)
      .eq('is_read', false);

    if (updateError) {
      throw updateError;
    }

    // Also mark legacy messages (without conversation_id) as read
    // Match by participant pairs
    const { error: legacyUpdateError } = await supabase
      .from('messages')
      .update({ 
        is_read: true,
        read_at: now
      })
      .or(`and(sender_id.eq.${conversation.participant1_id},recipient_id.eq.${conversation.participant2_id}),and(sender_id.eq.${conversation.participant2_id},recipient_id.eq.${conversation.participant1_id})`)
      .eq('recipient_id', user.id)
      .eq('is_read', false)
      .is('conversation_id', null);

    if (legacyUpdateError) {
      console.error('Error marking legacy messages as read:', legacyUpdateError);
      // Don't fail if legacy update fails
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 });
  }
}

