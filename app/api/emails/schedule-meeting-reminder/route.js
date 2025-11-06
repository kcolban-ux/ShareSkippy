import { scheduleMeetingReminder } from '@/libs/email';
import { createClient } from '@/libs/supabase/server';

export async function POST(request) {
  try {
    const { userId, meetingId, meetingTitle, startsAt } = await request.json();

    if (!userId || !meetingId || !meetingTitle || !startsAt) {
      return Response.json(
        {
          error: 'User ID, meeting ID, meeting title, and start time are required',
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify meeting exists and user has access
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('id, requester_id, recipient_id, title, start_datetime')
      .eq('id', meetingId)
      .single();

    if (meetingError || !meeting) {
      return Response.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Check if user is involved in the meeting
    if (meeting.requester_id !== userId && meeting.recipient_id !== userId) {
      return Response.json({ error: 'User not authorized for this meeting' }, { status: 403 });
    }

    // Schedule meeting reminder (1 day before)
    await scheduleMeetingReminder({
      userId,
      meetingId,
      meetingTitle: meetingTitle || meeting.title,
      startsAt: new Date(startsAt),
      payload: {
        meetingId,
        title: meetingTitle || meeting.title,
        startsAt: new Date(startsAt).toISOString(),
      },
    });

    return Response.json({
      success: true,
      message: 'Meeting reminder scheduled successfully',
    });
  } catch (error) {
    console.error('Error scheduling meeting reminder:', error);
    return Response.json({ error: 'Failed to schedule meeting reminder' }, { status: 500 });
  }
}
