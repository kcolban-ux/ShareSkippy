import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

// Ensure the data is always fresh, bypassing Vercel/Next.js caching
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const filterRole = searchParams.get('role'); // Get the required role
    // Ensure limit is a safe number
    const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 60);

    const supabase = createClient(); // --- 1. Fetch only the owner IDs of active availability posts (Optimized) ---
    // This small query runs concurrently with the profiles query's preparation.
    const { data: activeAvailability } = await supabase
      .from('availability')
      .select('owner_id')
      .eq('status', 'active');
    const ownersWithActivePosts = new Set((activeAvailability || []).map((post) => post.owner_id)); // --- 2. Fetch Profiles with Server-Side Filtering (CRITICAL OPTIMIZATION) ---

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
        updated_at,
        user_activity(at) 
      `
      )
      .not('bio', 'is', null) // Must have a bio
      .neq('bio', '')
      .in('role', ['dog_owner', 'petpal', 'both']) // Must have a valid role
      .order('updated_at', { ascending: false }); // Apply role filter DIRECTLY to the DB query
    if (filterRole) {
      profilesQuery = profilesQuery.eq('role', filterRole);
    } // Apply cursor BEFORE fetching (CRITICAL OPTIMIZATION)

    let nextSortKey = null;
    if (cursor) {
      try {
        // Cursor format: 'sortKey|lastId'
        const [lastSortKey, lastId] = cursor.split('|'); // This uses standard keyset pagination logic
        profilesQuery = profilesQuery.or(
          `updated_at.lt.${lastSortKey},and(updated_at.eq.${lastSortKey},id.lt.${lastId})`
        );
        nextSortKey = lastSortKey; // Keep for next cursor generation logic
      } catch (error) {
        console.error('Error processing cursor:', error);
      }
    } // Fetch only LIMIT + 1 to check for the next page

    profilesQuery = profilesQuery.limit(limit + 1);

    const { data: allProfiles, error: profilesError } = await profilesQuery;
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    } // --- 3. Filter profiles in memory (only for exclusion list) ---
    // This should be a small set due to limit + 1

    const filteredProfiles = (allProfiles || [])
      .filter((profile) => {
        // Exclude profiles that have an active availability post
        return !ownersWithActivePosts.has(profile.id);
      })
      .map((profile) => ({
        ...profile,
        sortKey: profile.updated_at,
      })); // --- 4. Final Pagination and Cursor Generation ---

    const resultProfiles = filteredProfiles.slice(0, limit);
    let nextCursor = null; // Check if we fetched one extra profile OR if the initial database query returned more than the limit
    if (filteredProfiles.length > limit) {
      const lastProfile = resultProfiles[resultProfiles.length - 1];
      nextCursor = `${lastProfile.sortKey}|${lastProfile.id}`;
    }
    return NextResponse.json({
      items: resultProfiles,
      nextCursor,
    });
  } catch (error) {
    console.error('General Error fetching profiles in API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}