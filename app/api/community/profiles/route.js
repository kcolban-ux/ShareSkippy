import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 60);

    const supabase = await createClient();

    console.log('Profiles API called with params:', { cursor, limit });

    // 1. Fetch all eligible profiles from the database.
    // The query remains a full fetch to avoid PostgREST URL length error (PGRST100)
    let query = supabase
      .from('profiles')
      .select(
        `
        id,
        first_name,
        profile_photo_url,
        city,
        neighborhood,
        role,
        bio,
        display_lat,
        display_lng,
        updated_at,
        user_activity(at)
      `
      )
      .not('bio', 'is', null)
      .neq('bio', '')
      .in('role', ['dog_owner', 'petpal', 'both']);

    const { data: profiles, error } = await query;

    if (error) {
      console.error('Error fetching profiles:', error);
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    console.log('Raw profiles fetched:', profiles?.length || 0);

    // 2. Get users with active availability posts to exclude them
    const { data: activeAvailabilityUsers, error: availabilityError } = await supabase
      .from('availability')
      .select('owner_id')
      .eq('status', 'active');

    if (availabilityError) {
      console.error('Error fetching active availability users:', availabilityError);
      return NextResponse.json({ error: 'Failed to fetch availability data' }, { status: 500 });
    }

    const excludedUserIds = new Set(activeAvailabilityUsers?.map((item) => item.owner_id) || []);

    // 3. Filter, decorate, and sort (all in-memory due to performance workaround)
    const filteredProfiles = profiles.filter((profile) => !excludedUserIds.has(profile.id));

    console.log(
      'Filtered profiles (after excluding active availability):',
      filteredProfiles.length
    );

    const processedProfiles = filteredProfiles.map((profile) => {
      let lastOnlineAt = profile.updated_at; // Default to updated_at

      if (profile.user_activity && profile.user_activity.length > 0) {
        // OPTIMIZATION: Use reduce to find the latest time, which is much faster than sorting the array
        const latestActivityTime = profile.user_activity.reduce((latestTime, currentActivity) => {
          const currentActivityTime = new Date(currentActivity.at).getTime();
          const latestTimeValue = new Date(latestTime).getTime();

          return currentActivityTime > latestTimeValue ? currentActivity.at : latestTime;
        }, lastOnlineAt);
        lastOnlineAt = latestActivityTime;
      }

      // Truncate bio to ~140 characters
      const bioExcerpt = profile.bio
        ? profile.bio.length > 140
          ? profile.bio.substring(0, 140) + '...'
          : profile.bio
        : '';

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
        last_online_at: lastOnlineAt,
      };
    });

    // Sort by last_online_at desc, then id desc
    processedProfiles.sort((a, b) => {
      const dateA = new Date(a.last_online_at);
      const dateB = new Date(b.last_online_at);

      if (dateA.getTime() !== dateB.getTime()) {
        return dateB.getTime() - dateA.getTime();
      }

      return b.id.localeCompare(a.id);
    });

    // Apply cursor-based filtering if provided
    let paginatedProfiles = processedProfiles;
    if (cursor) {
      try {
        const [lastOnlineAt, lastId] = cursor.split('|');
        const cursorDate = new Date(lastOnlineAt);

        paginatedProfiles = processedProfiles.filter((profile) => {
          const profileDate = new Date(profile.last_online_at);
          if (profileDate.getTime() !== cursorDate.getTime()) {
            return profileDate < cursorDate;
          }
          return profile.id < lastId;
        });
      } catch (error) {
        console.error('Error processing cursor:', error);
        // If cursor is invalid, return empty results
        paginatedProfiles = [];
      }
    }

    // Take only the requested limit
    const resultProfiles = paginatedProfiles.slice(0, limit);

    // Generate next cursor if there are more results
    let nextCursor = null;
    if (resultProfiles.length === limit && paginatedProfiles.length > limit) {
      const lastProfile = resultProfiles[resultProfiles.length - 1];
      nextCursor = `${lastProfile.last_online_at}|${lastProfile.id}`;
    }

    console.log('Returning profiles:', resultProfiles.length, 'nextCursor:', nextCursor);

    return NextResponse.json({
      items: resultProfiles,
      nextCursor,
    });
  } catch (error) {
    console.error('Error in profiles API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
