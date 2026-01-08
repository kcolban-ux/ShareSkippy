import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/community/profiles
 * Fetches a paginated list of community profiles with optional filtering by role and location.
 * * @param {string} cursor - Format: "ISOString|UUID" (Last seen online_at and ID)
 * @param {number} limit - Number of records to fetch (Max: 100)
 * @param {string} role - Filter by role ('dog_owner', 'petpal', 'both', or 'all-members')
 * @param {number} lat - Latitude for proximity search
 * @param {number} lng - Longitude for proximity search
 * @param {number} radius - Search radius in miles
 * @returns {NextResponse} JSON with items and nextCursor
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Parameter Parsing & Validation
    const MAX_LIMIT = 100;
    const MAX_RADIUS = 500;

    const limit = Math.min(parseInt(searchParams.get('limit') || '24', 10), MAX_LIMIT);
    const role = searchParams.get('role');
    const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')) : null;
    const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')) : null;
    const radius = searchParams.get('radius') ? parseInt(searchParams.get('radius'), 10) : null;
    const cursor = searchParams.get('cursor') || '';

    // Validation checks
    if (isNaN(limit) || limit < 1)
      return NextResponse.json({ message: 'Invalid limit' }, { status: 400 });
    if (lat !== null && (isNaN(lat) || lat < -90 || lat > 90))
      return NextResponse.json({ message: 'Invalid latitude' }, { status: 400 });
    if (lng !== null && (isNaN(lng) || lng < -180 || lng > 180))
      return NextResponse.json({ message: 'Invalid longitude' }, { status: 400 });
    if (radius !== null && (isNaN(radius) || radius < 0 || radius > MAX_RADIUS))
      return NextResponse.json({ message: 'Invalid radius' }, { status: 400 });

    let lastOnlineAt = null;
    let lastId = null;

    // 2. Cursor Decoding with Error Handling
    if (cursor && cursor.includes('|')) {
      const [datePart, idPart] = cursor.split('|');
      const parsedDate = new Date(datePart);
      if (!isNaN(parsedDate.getTime())) {
        lastOnlineAt = parsedDate.toISOString();
        lastId = idPart;
      }
    }

    const supabase = await createClient();

    // 3. Database Interaction
    const { data: profiles, error } = await supabase.rpc('get_paginated_profiles', {
      p_last_id: lastId,
      p_last_online_at: lastOnlineAt,
      p_lat: lat,
      p_limit: limit + 1,
      p_lng: lng,
      p_radius: radius,
      p_role: role,
    });

    if (error) {
      console.error('RPC Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 4. Safe Response Processing
    const safeProfiles = profiles ?? [];
    const hasNextPage = safeProfiles.length > limit;
    const resultProfiles = hasNextPage ? safeProfiles.slice(0, limit) : safeProfiles;

    let nextCursor = null;
    if (hasNextPage) {
      const last = resultProfiles[resultProfiles.length - 1];
      nextCursor = `${new Date(last.last_online_at).toISOString()}|${last.id}`;
    }

    return NextResponse.json({
      items: resultProfiles.map((p) => {
        // Fix: Truncation logic ensures "..." only if characters were actually cut
        const BIO_LIMIT = 140;
        const bioExcerpt =
          p.bio && p.bio.length > BIO_LIMIT
            ? p.bio.substring(0, BIO_LIMIT).trim() + '...'
            : p.bio || '';

        return {
          ...p,
          photo_url: p.profile_photo_url,
          bio_excerpt: bioExcerpt,
        };
      }),
      nextCursor,
    });
  } catch (err) {
    console.error('Server Error:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
