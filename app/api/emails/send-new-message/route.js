import { sendEmail } from '@/libs/email';
import { createClient } from '@/lib/supabase/server';

export async function POST(request) {
  try {
    const { recipientId, senderId, messagePreview, messageId, threadId } = await request.json();

    if (!recipientId || !senderId || !messagePreview) {
      return Response.json(
        {
          error: 'Recipient ID, sender ID, and message preview are required',
        },
        { status: 400 }
      );
    }

    // Don't send email to the sender
    if (recipientId === senderId) {
      return Response.json({
        success: true,
        message: 'Skipped - sender and recipient are the same',
      });
    }

    const supabase = await createClient();

    // Get recipient data
    const { data: recipient, error: recipientError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', recipientId)
      .single();

    if (recipientError || !recipient) {
      return Response.json({ error: 'Recipient not found' }, { status: 404 });
    }

    // Get sender data
    const { data: sender, error: senderError } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', senderId)
      .single();

    if (senderError || !sender) {
      return Response.json({ error: 'Sender not found' }, { status: 404 });
    }

    // Send new message notification
    await sendEmail({
      userId: recipientId,
      to: recipient.email,
      emailType: 'new_message',
      payload: {
        recipientName: recipient.first_name || '',
        senderName: `${sender.first_name} ${sender.last_name}`.trim(),
        senderInitial: (sender.first_name || 'U')[0].toUpperCase(),
        messagePreview:
          messagePreview.substring(0, 100) + (messagePreview.length > 100 ? '...' : ''),
        messageTime: new Date().toLocaleString(),
        messageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://shareskippy.com'}/messages/${messageId}`,
        threadId: threadId || messageId,
      },
    });

    return Response.json({
      success: true,
      message: 'New message notification sent successfully',
    });
  } catch (error) {
    console.error('Error sending new message notification:', error);
    return Response.json({ error: 'Failed to send new message notification' }, { status: 500 });
  }
}
