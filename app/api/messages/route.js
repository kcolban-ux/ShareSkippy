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

    const { recipient_id, availability_id, content } = await request.json();

    if (!recipient_id || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // availability_id is now optional - we'll ignore it for new messages

    // Normalize participant order (canonical: p1 < p2)
    const p1_id = user.id < recipient_id ? user.id : recipient_id;
    const p2_id = user.id < recipient_id ? recipient_id : user.id;

    // Check if a conversation already exists between these two users (canonical order)
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('participant1_id', p1_id)
      .eq('participant2_id', p2_id)
      .is('availability_id', null)
      .single();

    let conversationId;

    if (existingConversation) {
      conversationId = existingConversation.id;
    } else {
      // Create a new conversation (profile-based only, canonical order)
      const { data: newConversation, error: newConvError } = await supabase
        .from('conversations')
        .insert({
          participant1_id: p1_id,
          participant2_id: p2_id,
          availability_id: null, // Always null for profile-based conversations
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();

      if (newConvError) {
        // If conflict (race condition), fetch the existing one
        const { data: conflictConv } = await supabase
          .from('conversations')
          .select('*')
          .eq('participant1_id', p1_id)
          .eq('participant2_id', p2_id)
          .is('availability_id', null)
          .single();
        
        if (conflictConv) {
          conversationId = conflictConv.id;
        } else {
          throw newConvError;
        }
      } else {
        conversationId = newConversation.id;
      }
    }

    // Send the message (profile-based only)
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        recipient_id: recipient_id,
        conversation_id: conversationId,
        availability_id: null, // Always null for new messages
        subject: null, // Subject is no longer used
        content: content
      })
      .select()
      .single();

    if (messageError) throw messageError;

    // Update conversation's last_message_at timestamp
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Send email notification to recipient using centralized email system
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/emails/send-new-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: recipient_id,
          senderId: user.id,
          messagePreview: content.substring(0, 100),
          messageId: message.id,
          threadId: conversationId
        })
      });
    } catch (emailError) {
      console.error('Error sending message notification email:', emailError);
      // Don't fail the message creation if email fails
    }

    return NextResponse.json({ 
      success: true, 
      message: message,
      conversation_id: conversationId 
    });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversation_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const before = searchParams.get('before'); // ISO timestamp for pagination

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    // Verify user is a participant in this conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('participant1_id, participant2_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (conversation.participant1_id !== user.id && conversation.participant2_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Build query for messages
    let query = supabase
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
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false }) // Newest first for pagination
      .limit(limit + 1); // Fetch one extra to determine if there are more

    // Add pagination cursor if provided
    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;

    if (error) throw error;

    // Check if there are more messages
    const hasMore = messages.length > limit;
    const messagesToReturn = hasMore ? messages.slice(0, limit) : messages;
    
    // Reverse to return oldest→newest for UI
    messagesToReturn.reverse();
    
    // Get the oldest message timestamp for nextBefore cursor
    const nextBefore = hasMore && messagesToReturn.length > 0 
      ? messagesToReturn[0].created_at 
      : null;

    return NextResponse.json({ 
      messages: messagesToReturn,
      nextBefore 
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
