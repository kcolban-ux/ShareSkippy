import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') || '';
    const limit = parseInt(searchParams.get('limit') || '24');
    const role = searchParams.get('role');
    const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')) : null;
    const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')) : null;
    const radius = searchParams.get('radius') ? parseInt(searchParams.get('radius')) : null;

    let lastOnlineAt = null;
    let lastId = null;

    if (cursor && cursor.includes('|')) {
      const parts = cursor.split('|');
      lastOnlineAt = new Date(parts[0]).toISOString();
      lastId = parts[1];
    }

    const supabase = await createClient();

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
      return NextResponse.json({ error }, { status: 500 });
    }

    const hasNextPage = profiles.length > limit;
    const resultProfiles = hasNextPage ? profiles.slice(0, limit) : profiles;

    let nextCursor = null;
    if (hasNextPage) {
      const last = resultProfiles[resultProfiles.length - 1];
      nextCursor = `${new Date(last.last_online_at).toISOString()}|${last.id}`;
    }

    return NextResponse.json({
      items: resultProfiles.map((p) => ({
        ...p,
        photo_url: p.profile_photo_url,
        bio_excerpt: p.bio?.substring(0, 140) + (p.bio?.length > 140 ? '...' : ''),
      })),
      nextCursor,
    });
  } catch (err) {
    console.error('Server Error:', err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
