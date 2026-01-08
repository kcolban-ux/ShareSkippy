import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          details: userError,
        },
        { status: 401 }
      );
    }

    const eventId = params.id;

    // Check if event exists and has space
    const { data: event, error: eventError } = await supabase
      .from('community_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        {
          error: 'Event not found',
        },
        { status: 404 }
      );
    }

    // Check if event is full
    if (event.current_participants >= event.max_participants) {
      return NextResponse.json(
        {
          error: 'Event is full',
        },
        { status: 400 }
      );
    }

    // Check if user is already participating
    const { data: existingParticipation } = await supabase
      .from('event_participants')
      .select('*')
      .eq('event_id', eventId)
      .eq('participant_id', user.id)
      .single();

    if (existingParticipation) {
      return NextResponse.json(
        {
          error: 'Already participating in this event',
        },
        { status: 400 }
      );
    }

    // Join the event
    const { data: participation, error: joinError } = await supabase
      .from('event_participants')
      .insert({
        event_id: eventId,
        participant_id: user.id,
      })
      .select()
      .single();

    if (joinError) {
      console.error('Error joining event:', joinError);
      return NextResponse.json(
        {
          error: 'Failed to join event',
          details: joinError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully joined event',
      participation,
    });
  } catch (error) {
    console.error('Join event API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          details: userError,
        },
        { status: 401 }
      );
    }

    const eventId = params.id;

    // Leave the event
    const { error: leaveError } = await supabase
      .from('event_participants')
      .delete()
      .eq('event_id', eventId)
      .eq('participant_id', user.id);

    if (leaveError) {
      console.error('Error leaving event:', leaveError);
      return NextResponse.json(
        {
          error: 'Failed to leave event',
          details: leaveError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully left event',
    });
  } catch (error) {
    console.error('Leave event API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
