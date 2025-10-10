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

    const { recipient_id, availability_id, subject, content } = await request.json();

    if (!recipient_id || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if a conversation already exists
    let existingConversation;
    if (availability_id) {
      // Look for conversation with specific availability post
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${recipient_id},availability_id.eq.${availability_id}),and(participant1_id.eq.${recipient_id},participant2_id.eq.${user.id},availability_id.eq.${availability_id})`)
        .single();
      existingConversation = data;
    } else {
      // Look for general conversation between these two users (no availability post)
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${recipient_id},availability_id.is.null),and(participant1_id.eq.${recipient_id},participant2_id.eq.${user.id},availability_id.is.null)`)
        .single();
      existingConversation = data;
    }

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
          participant2_id: recipient_id,
          availability_id: availability_id || null
        })
        .select()
        .single();

      if (newConvError) throw newConvError;
      conversationId = newConversation.id;
    }

    // Send the message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        recipient_id: recipient_id,
        availability_id: availability_id || null,
        subject: subject || 'New Message',
        content: content
      })
      .select()
      .single();

    if (messageError) throw messageError;

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

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    // Fetch messages for the conversation
    const { data: messages, error } = await supabase
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
      .eq('availability_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ messages });

  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
