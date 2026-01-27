import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
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

    // Get URL parameters for filtering
    const { searchParams } = new URL(request.url);
    const placeType = searchParams.get('type');
    const dogFriendly = searchParams.get('dog_friendly');
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = parseInt(searchParams.get('offset')) || 0;

    // Build query with optimized select
    let query = supabase
      .from('local_places')
      .select(
        `
        id,
        name,
        type,
        description,
        address,
        rating,
        dog_friendly,
        created_at,
        created_by:profiles!local_places_created_by_fkey(
          id,
          first_name,
          last_name
        )
      `
      )
      .order('rating', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (placeType) {
      query = query.eq('type', placeType);
    }

    if (dogFriendly !== null) {
      query = query.eq('dog_friendly', dogFriendly === 'true');
    }

    const { data: places, error } = await query;

    if (error) {
      console.error('Error fetching places:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch places',
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(places || []);
  } catch (error) {
    console.error('Places API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
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

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.address || !body.type) {
      return NextResponse.json(
        {
          error: 'Missing required fields: name, address, type',
        },
        { status: 400 }
      );
    }

    // Create place
    const { data: place, error } = await supabase
      .from('local_places')
      .insert({
        name: body.name,
        type: body.type,
        address: body.address,
        description: body.description,
        dog_friendly: body.dog_friendly !== false, // Default to true
        photo_url: body.photo_url,
        latitude: body.latitude,
        longitude: body.longitude,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating place:', error);
      return NextResponse.json(
        {
          error: 'Failed to create place',
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(place);
  } catch (error) {
    console.error('Create place API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
