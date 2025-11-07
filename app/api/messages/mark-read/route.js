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

    // Mark all unread messages in this conversation as read for the current user
    // Only mark messages where the current user is the recipient
    // Try conversation_id first, then fall back to participant-based matching
    const updateData = { is_read: true };
    
    let updatedMessages = [];
    let updateError = null;
    
    // First, try to update messages with conversation_id
    const { data: updatedWithConv, error: error1 } = await supabase
      .from('messages')
      .update(updateData)
      .eq('conversation_id', conversation_id)
      .eq('recipient_id', user.id)
      .eq('is_read', false)
      .select('id');

    if (error1) {
      console.error('Error updating messages with conversation_id:', error1);
      updateError = error1;
    } else {
      updatedMessages = updatedWithConv || [];
    }

    // Also update legacy messages (without conversation_id) by participant pair
    // Only update messages where the current user is the recipient
    // Use separate queries for each direction to avoid OR query issues
    if (user.id === conversation.participant2_id) {
      // User is participant2, so update messages where participant1 sent to participant2
      const { data: updatedLegacy1, error: error2 } = await supabase
        .from('messages')
        .update(updateData)
        .eq('sender_id', conversation.participant1_id)
        .eq('recipient_id', conversation.participant2_id)
        .eq('is_read', false)
        .is('conversation_id', null)
        .select('id');

      if (!error2 && updatedLegacy1) {
        updatedMessages = [...updatedMessages, ...updatedLegacy1];
      }
    }

    if (user.id === conversation.participant1_id) {
      // User is participant1, so update messages where participant2 sent to participant1
      const { data: updatedLegacy2, error: error3 } = await supabase
        .from('messages')
        .update(updateData)
        .eq('sender_id', conversation.participant2_id)
        .eq('recipient_id', conversation.participant1_id)
        .eq('is_read', false)
        .is('conversation_id', null)
        .select('id');

      if (!error3 && updatedLegacy2) {
        updatedMessages = [...updatedMessages, ...updatedLegacy2];
      }
    }

    if (!error3 && updatedLegacy2) {
      updatedMessages = [...updatedMessages, ...updatedLegacy2];
    }

    // If we had an error with conversation_id query and no legacy messages were updated, throw
    if (updateError && updatedMessages.length === 0) {
      console.error('Error updating messages:', updateError);
      throw updateError;
    }

    console.log(`Marked ${updatedMessages?.length || 0} messages as read for conversation ${conversation_id}`);

    return NextResponse.json({ 
      success: true,
      messagesUpdated: updatedMessages?.length || 0
    });

  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 });
  }
}

