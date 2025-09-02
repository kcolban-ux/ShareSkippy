import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required', 
        details: userError 
      }, { status: 401 });
    }

    // Get URL parameters for filtering
    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('event_type');
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = parseInt(searchParams.get('offset')) || 0;

    // Build query
    let query = supabase
      .from('community_events')
      .select(`
        *,
        organizer:profiles!community_events_organizer_id_fkey(
          id,
          first_name,
          last_name,
          profile_photo_url
        )
      `)
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('Error fetching events:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch events', 
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json(events || []);
    
  } catch (error) {
    console.error('Events API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required', 
        details: userError 
      }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.event_date || !body.location) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, event_date, location' 
      }, { status: 400 });
    }

    // Create event
    const { data: event, error } = await supabase
      .from('community_events')
      .insert({
        title: body.title,
        description: body.description,
        event_date: body.event_date,
        location: body.location,
        organizer_id: user.id,
        max_participants: body.max_participants || 50,
        event_type: body.event_type || 'meetup'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      return NextResponse.json({ 
        error: 'Failed to create event', 
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json(event);
    
  } catch (error) {
    console.error('Create event API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}
