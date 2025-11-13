import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';

export async function GET(request, { params }) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Fetch specific meeting
    const { data: meeting, error } = await supabase
      .from('meetings')
      .select(
        `
        *,
        requester:profiles!meetings_requester_id_fkey (
          id,
          first_name,
          last_name,
          profile_photo_url
        ),
        recipient:profiles!meetings_recipient_id_fkey (
          id,
          first_name,
          last_name,
          profile_photo_url
        ),
        availability:availability!meetings_availability_id_fkey (
          id,
          title,
          post_type
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) throw error;

    // Check if user is involved in this meeting
    if (meeting.requester_id !== user.id && meeting.recipient_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ meeting });
  } catch (error) {
    console.error('Error fetching meeting:', error);
    return NextResponse.json({ error: 'Failed to fetch meeting' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    console.log('PATCH request for meeting ID:', id);

    let requestBody;
    try {
      requestBody = await request.json();
      console.log('Request body:', requestBody);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { status, message } = requestBody;

    // Validate status
    const validStatuses = ['pending', 'scheduled', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status: ${status}. Valid statuses are: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch current meeting
    const { data: currentMeeting, error: fetchError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Check if user is involved in this meeting
    if (currentMeeting.requester_id !== user.id && currentMeeting.recipient_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Validate status transitions
    console.log('Current meeting status:', currentMeeting.status, 'Trying to set to:', status);
    if (status === 'scheduled' && currentMeeting.status !== 'pending') {
      return NextResponse.json(
        {
          error: `Can only schedule pending meetings. Current status: ${currentMeeting.status}`,
        },
        { status: 400 }
      );
    }

    if (status === 'cancelled' && ['completed'].includes(currentMeeting.status)) {
      return NextResponse.json({ error: 'Cannot cancel completed meetings' }, { status: 400 });
    }

    // Update meeting status
    const { data: meeting, error: updateError } = await supabase
      .from('meetings')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(
        `
        *,
        requester:profiles!meetings_requester_id_fkey (
          id,
          first_name,
          last_name,
          profile_photo_url
        ),
        recipient:profiles!meetings_recipient_id_fkey (
          id,
          first_name,
          last_name,
          profile_photo_url
        )
      `
      )
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    // Send a message in the chat about the status change
    if (message) {
      const recipientId =
        currentMeeting.requester_id === user.id
          ? currentMeeting.recipient_id
          : currentMeeting.requester_id;

      await supabase.from('messages').insert({
        sender_id: user.id,
        recipient_id: recipientId,
        availability_id: currentMeeting.availability_id,
        subject: `Meeting Update: ${meeting.title}`,
        content: message,
      });
    }

    return NextResponse.json({ meeting });
  } catch (error) {
    console.error('Error updating meeting:', error);
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    // Provide more specific error messages
    let errorMessage = 'Failed to update meeting';
    if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Fetch current meeting
    const { data: currentMeeting, error: fetchError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Only the requester can delete a meeting
    if (currentMeeting.requester_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the meeting requester can delete meetings' },
        { status: 403 }
      );
    }

    // Cannot delete completed meetings
    if (currentMeeting.status === 'completed') {
      return NextResponse.json({ error: 'Cannot delete completed meetings' }, { status: 400 });
    }

    // Delete meeting
    const { error: deleteError } = await supabase.from('meetings').delete().eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 });
  }
}
