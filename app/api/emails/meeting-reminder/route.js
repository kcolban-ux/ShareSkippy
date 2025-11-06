import { sendEmail } from '@/libs/email';
import { createClient } from '@/libs/supabase/server';

export async function POST(request) {
  try {
    const { meetingId, userId } = await request.json();

    if (!meetingId || !userId) {
      return Response.json(
        {
          error: 'Meeting ID and User ID are required',
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get meeting details
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select(
        `
        *,
        requester:profiles!meetings_requester_id_fkey(first_name, last_name, email),
        recipient:profiles!meetings_recipient_id_fkey(first_name, last_name, email)
      `
      )
      .eq('id', meetingId)
      .single();

    if (meetingError || !meeting) {
      return Response.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Determine if user is requester or recipient
    const isRequester = meeting.requester_id === userId;
    const otherParticipant = isRequester ? meeting.recipient : meeting.requester;
    const meetingTitle = meeting.title || 'Dog Activity Meeting';

    // Send meeting reminder
    await sendEmail({
      userId,
      to: user.email,
      emailType: 'meeting_reminder',
      payload: {
        userName: user.first_name || '',
        otherParticipantName: `${otherParticipant.first_name} ${otherParticipant.last_name}`.trim(),
        meetingTitle,
        meetingDate: new Date(meeting.starts_at).toLocaleDateString(),
        meetingTime: new Date(meeting.starts_at).toLocaleTimeString(),
        meetingLocation: meeting.location || 'Location TBD',
        meetingUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://shareskippy.com'}/meetings/${meetingId}`,
        isRequester,
      },
    });

    return Response.json({
      success: true,
      message: 'Meeting reminder sent successfully',
    });
  } catch (error) {
    console.error('Error sending meeting reminder:', error);
    return Response.json({ error: 'Failed to send meeting reminder' }, { status: 500 });
  }
}
