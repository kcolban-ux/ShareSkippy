import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import { calculateDistance } from '@/libs/distance';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '4');

    const supabase = createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's profile (for location and role)
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_lat, display_lng, role, first_name')
      .eq('id', user.id)
      .single();

    if (profileError || !currentProfile) {
      console.error('Error fetching current profile:', profileError);
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (!currentProfile.display_lat || !currentProfile.display_lng) {
      return NextResponse.json(
        { error: 'Location not set', needsLocation: true },
        { status: 400 }
      );
    }

    console.log('Current user profile:', {
      id: currentProfile.id,
      role: currentProfile.role,
      location: {
        lat: currentProfile.display_lat,
        lng: currentProfile.display_lng,
      },
    });

    // Determine matching strategy based on current user's role
    let targetRoles = [];
    let needsBothLogic = false;

    if (currentProfile.role === 'dog_owner') {
      // Dog owners should see petpals with a bio
      targetRoles = ['petpal', 'both'];
    } else if (currentProfile.role === 'petpal') {
      // Petpals should see dog owners who have dogs
      targetRoles = ['dog_owner', 'both'];
    } else if (currentProfile.role === 'both') {
      // "Both" users see everyone, but with quality filtering
      targetRoles = ['dog_owner', 'petpal', 'both'];
      needsBothLogic = true; // Special filtering for "both" users
    }

    console.log('Matching criteria:', { targetRoles, needsBothLogic });

    // Get all potential match profiles with location (bio not required)
    let profileQuery = supabase
      .from('profiles')
      .select(
        `
        id,
        first_name,
        profile_photo_url,
        bio,
        city,
        neighborhood,
        role,
        display_lat,
        display_lng
      `
      )
      .in('role', targetRoles)
      .neq('id', user.id)
      .not('display_lat', 'is', null)
      .not('display_lng', 'is', null);
      // Removed bio requirement to match community page behavior

    const { data: profiles, error: profilesError } = await profileQuery;

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json(
        { error: 'Failed to fetch profiles' },
        { status: 500 }
      );
    }

    console.log(`Found ${profiles?.length || 0} potential matches`);

    // Get dog ownership information for filtering
    let dogOwnerIds = new Set();
    let currentUserHasDogs = false;
    
    // Check if current user (if "both") has dogs
    if (needsBothLogic) {
      const { data: currentUserDogs, error: currentDogsError } = await supabase
        .from('dogs')
        .select('id')
        .eq('owner_id', currentProfile.id)
        .limit(1);
      
      if (currentDogsError) {
        console.error('Error checking current user dogs:', currentDogsError);
      } else {
        currentUserHasDogs = (currentUserDogs?.length || 0) > 0;
        console.log(`Current "both" user has dogs: ${currentUserHasDogs}`);
      }
    }
    
    // For petpals and "both" users, get which dog owners actually have dogs
    const potentialDogOwners = profiles.filter(
      (p) => p.role === 'dog_owner' || p.role === 'both'
    );

    if (
      potentialDogOwners.length > 0 &&
      (currentProfile.role === 'petpal' || needsBothLogic)
    ) {
      const ownerIds = potentialDogOwners.map((p) => p.id);
      const { data: dogs, error: dogsError } = await supabase
        .from('dogs')
        .select('owner_id')
        .in('owner_id', ownerIds);

      if (dogsError) {
        console.error('Error fetching dogs:', dogsError);
      } else {
        dogOwnerIds = new Set(dogs?.map((d) => d.owner_id) || []);
        console.log(
          `Found ${dogOwnerIds.size} dog owners with actual dogs`
        );
      }
    }

    // Filter profiles based on matching criteria
    let filteredProfiles = profiles.filter((profile) => {
      // For petpals viewing dog owners: ensure they have dogs
      if (
        currentProfile.role === 'petpal' &&
        (profile.role === 'dog_owner' || profile.role === 'both')
      ) {
        if (!dogOwnerIds.has(profile.id)) {
          return false; // Skip dog owners without dogs
        }
      }

      // For "both" users: apply quality filtering
      if (needsBothLogic) {
        // If the match is a dog_owner or "both", they must have dogs
        if (profile.role === 'dog_owner' || profile.role === 'both') {
          if (!dogOwnerIds.has(profile.id)) {
            return false; // Skip dog owners without dogs
          }
        }
        
        // If the match is a petpal (or "both" acting as petpal)
        // Current user must have dogs to see them
        if (profile.role === 'petpal' || profile.role === 'both') {
          if (!currentUserHasDogs) {
            return false; // "Both" users without dogs can't see petpals
          }
          // Otherwise, petpals just need a bio (already filtered in query)
        }
      }

      // Dog owners viewing petpals: just need bio (already filtered in query)
      return true;
    });

    console.log(`After filtering: ${filteredProfiles.length} matches`);

    // Calculate distances and sort
    const matchesWithDistance = filteredProfiles.map((profile) => {
      const distance = calculateDistance(
        currentProfile.display_lat,
        currentProfile.display_lng,
        profile.display_lat,
        profile.display_lng
      );
      
      console.log(`Distance to ${profile.first_name} (${profile.city}):`, {
        distance: distance.toFixed(2),
        fromLat: currentProfile.display_lat,
        fromLng: currentProfile.display_lng,
        toLat: profile.display_lat,
        toLng: profile.display_lng
      });
      
      return {
        ...profile,
        distance
      };
    });

    // Sort by distance and limit
    const nearestMatches = matchesWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    console.log(`Sorted matches by distance:`, nearestMatches.map(m => ({
      name: m.first_name,
      city: m.city,
      distance: m.distance.toFixed(2)
    })));
    
    console.log(`Returning top ${nearestMatches.length} nearest matches`);

    // Fetch dogs for dog owners in the results
    const matchIds = nearestMatches.map((m) => m.id);
    let dogsMap = {};

    if (matchIds.length > 0) {
      const { data: dogsData, error: dogsError } = await supabase
        .from('dogs')
        .select('owner_id, name, breed, photo_url, size')
        .in('owner_id', matchIds);

      if (dogsError) {
        console.error('Error fetching dogs for matches:', dogsError);
      } else {
        dogsMap = (dogsData || []).reduce((acc, dog) => {
          if (!acc[dog.owner_id]) acc[dog.owner_id] = [];
          acc[dog.owner_id].push(dog);
          return acc;
        }, {});
      }
    }

    // Enrich matches with dogs
    const enrichedMatches = nearestMatches.map((match) => ({
      ...match,
      dogs: dogsMap[match.id] || [],
    }));

    return NextResponse.json({
      matches: enrichedMatches,
      total: enrichedMatches.length,
    });
  } catch (error) {
    console.error('Error in matches API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

