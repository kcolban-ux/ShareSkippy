// /api/profiles/route.js (or similar)

import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Helper function to safely parse the cursor string
const parseCursor = (cursor) => {
  if (!cursor) return { lastOnlineAt: null, lastId: null };
  try {
    const [lastOnlineAt, lastId] = cursor.split('|');
    // Ensure the date is valid before returning
    const date = new Date(lastOnlineAt);
    if (isNaN(date.getTime()) || !lastId) {
      throw new Error('Invalid cursor format or date.');
    }
    return { lastOnlineAt, lastId };
  } catch (error) {
    console.warn('Invalid cursor received. Resetting pagination.', error);
    return { lastOnlineAt: null, lastId: null };
  }
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 60);

    const supabase = await createClient();
    const { lastOnlineAt, lastId } = parseCursor(cursor);

    console.log('Profiles API called with params:', { cursor, limit, lastOnlineAt, lastId });

    // 1. Use the server-side RPC/Stored Procedure for efficient fetching
    //    We fetch limit + 1 to check if there is a next page.
    const { data: profiles, error } = await supabase.rpc('get_paginated_profiles', {
      p_last_online_at: lastOnlineAt, // null on first load
      p_last_id: lastId, // null on first load
      p_limit: limit + 1,
    });

    if (error) {
      console.error('Error fetching profiles via RPC:', error);
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    console.log('Raw profiles fetched via RPC:', profiles?.length || 0);

    // 2. Process profiles and determine the next cursor
    const hasNextPage = profiles.length > limit;
    const resultProfiles = hasNextPage ? profiles.slice(0, limit) : profiles;

    let nextCursor = null;

    if (hasNextPage) {
      const lastProfile = resultProfiles[resultProfiles.length - 1];
      // The RPC result already includes the calculated last_online_at
      nextCursor = `${lastProfile.last_online_at}|${lastProfile.id}`;
    }

    const finalProfiles = resultProfiles.map((profile) => {
      // Truncate bio to ~140 characters
      const bioExcerpt = profile.bio
        ? profile.bio.length > 140
          ? profile.bio.substring(0, 140) + '...'
          : profile.bio
        : '';

      // Final output shaping
      return {
        id: profile.id,
        first_name: profile.first_name,
        photo_url: profile.profile_photo_url,
        city: profile.city,
        neighborhood: profile.neighborhood,
        role: profile.role,
        bio_excerpt: bioExcerpt,
        display_lat: profile.display_lat,
        display_lng: profile.display_lng,
        last_online_at: profile.last_online_at, // Directly from RPC
      };
    });

    console.log('Returning profiles:', finalProfiles.length, 'nextCursor:', nextCursor);

    return NextResponse.json({
      items: finalProfiles,
      nextCursor,
    });
  } catch (error) {
    console.error('Error in profiles API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
