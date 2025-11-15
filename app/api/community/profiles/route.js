import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

// Ensure the data is always fresh, bypassing Vercel/Next.js caching
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const filterRole = searchParams.get('role');
    // Ensure limit is a safe number
    const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 60);

    const supabase = createClient();

    // 1. Fetch all user IDs with active availability posts (to exclude them)
    // This is a fast, small query.
    const { data: activeAvailability } = await supabase
      .from('availability')
      .select('owner_id')
      .eq('status', 'active');

    const ownersToExclude = Array.from(
        new Set((activeAvailability || []).map((post) => post.owner_id))
    );

    // 2. Build the main profiles query with all filters applied to the database
    let profilesQuery = supabase
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
      // Standard filtering applied to the DB
      .not('bio', 'is', null)
      .neq('bio', '')
      .in('role', ['dog_owner', 'petpal', 'both']); // Keep all eligible roles initially

    // Apply role filter (e.g., dog_owner only)
    if (filterRole) {
      profilesQuery = profilesQuery.eq('role', filterRole);
    }

    // Apply the exclusion filter directly to the DB query
    if (ownersToExclude.length > 0) {
        // FIX: Manually format the list of IDs with parentheses and join them.
        // This ensures the PostgREST API correctly parses the list, fixing the PGRST100 error.
        const ownersList = ownersToExclude.join(',');
        profilesQuery = profilesQuery.not('id', 'in', `(${ownersList})`);
    }
    
    // Apply Keyset Pagination (Cursor) logic to the database query
    if (cursor) {
      try {
        // Cursor format: 'updated_at|lastId'
        const [lastSortKey, lastId] = cursor.split('|'); 
        
        // This query instructs the database to only return rows *after* the cursor
        profilesQuery = profilesQuery.or(
          `updated_at.lt.${lastSortKey},and(updated_at.eq.${lastSortKey},id.lt.${lastId})`
        );
      } catch (error) {
        console.error('Error processing cursor:', error);
      }
    } 

    // 3. Execute the query, ordering and limiting on the database side
    const { data: rawProfiles, error: profilesError } = await profilesQuery
        // Sort by updated_at (primary) and ID (secondary)
        .order('updated_at', { ascending: false })
        .order('id', { ascending: false }) 
        .limit(limit + 1); // Fetch one extra for the next cursor check

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    // 4. Process the small result set for the final output format (In-Memory Transformation)
    const hasNextPage = rawProfiles.length > limit;
    const items = rawProfiles.slice(0, limit);

    const resultItems = items.map(profile => {
      // Calculate last_online_at 
      let lastOnlineAt = profile.updated_at;
      
      if (profile.user_activity && profile.user_activity.length > 0) {
        const mostRecentActivity = profile.user_activity.sort(
          (a, b) => new Date(b.at) - new Date(a.at)
        )[0];
        if (mostRecentActivity && mostRecentActivity.at) {
          lastOnlineAt = mostRecentActivity.at;
        }
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
        // We include updated_at here for cursor generation
        updated_at: profile.updated_at
      };
    });

    // 5. Generate next cursor
    let nextCursor = null; 
    if (hasNextPage) {
      const lastProfile = items[items.length - 1];
      // Cursor relies on the database's primary sort key: updated_at
      nextCursor = `${lastProfile.updated_at}|${lastProfile.id}`;
    }
    
    return NextResponse.json({
      items: resultItems,
      nextCursor,
    });
    
  } catch (error) {
    console.error('General Error fetching profiles in API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}