'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/libs/supabase/client';
import MessageModal from '@/components/MessageModal';
import LocationFilter from '@/components/LocationFilter'; // Assuming this component exists
import { calculateDistance } from '@/libs/distance'; // Assuming this helper exists

// ===================================
//              HELPERS
// ===================================

const formatAvailabilitySchedule = (enabledDays, daySchedules) => {
  if (!enabledDays || !daySchedules) return [];
  
  const dayNames = {
    monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
    thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday'
  };
  
  const formattedSchedule = [];
  
  enabledDays.forEach(day => {
    const schedule = daySchedules[day];
    if (schedule && schedule.enabled && schedule.timeSlots) {
      const dayName = dayNames[day] || day.charAt(0).toUpperCase() + day.slice(1);
      const timeSlots = schedule.timeSlots
        .filter(slot => slot.start && slot.end)
        .map(slot => {
          // Use UTC reference date for consistent time parsing
          const startTime = new Date(`2000-01-01T${slot.start}`).toLocaleTimeString('en-US', {
            hour: 'numeric', minute: '2-digit', hour12: true
          });
          const endTime = new Date(`2000-01-01T${slot.end}`).toLocaleTimeString('en-US', {
            hour: 'numeric', minute: '2-digit', hour12: true
          });
          return `${startTime} - ${endTime}`;
        });
      
      if (timeSlots.length > 0) {
        formattedSchedule.push(`${dayName}: ${timeSlots.join(', ')}`);
      }
    }
  });
  
  return formattedSchedule;
};

// ===================================
//          PROFILES LIST (Extracted Component)
// ===================================

function ProfilesList({ role, onMessage, locationFilter }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // Helper to filter profiles based on location (using the new lat/lng fields)
  const filterProfilesByLocation = useCallback((fetchedProfiles, filter) => {
    if (!filter || !fetchedProfiles || fetchedProfiles.length === 0) {
      return fetchedProfiles || [];
    }

    return fetchedProfiles.filter((profile) => {
      const profileLat = profile.display_lat;
      const profileLng = profile.display_lng;

      if (!profileLat || !profileLng) {
        return false;
      }
      // Note: This assumes calculateDistance is available and works as expected
      const distance = calculateDistance(filter.lat, filter.lng, profileLat, profileLng, 'miles'); 
      return distance <= filter.radius;
    });
  }, []);
  
  const fetchProfiles = useCallback(async (cursor = null, limit = 24, isNewQuery = false) => {
    // Only set loading true if it's a new fetch or we're loading more
    if (isNewQuery || cursor) {
        setLoading(true);
    }
    
    try {
      // NOTE: We use window.location.origin here because this component is client-side
      const url = new URL('/api/community/profiles', window.location.origin);
      url.searchParams.append('role', role);
      url.searchParams.append('limit', limit);
      if (cursor) url.searchParams.append('cursor', cursor);

      const res = await fetch(url.toString());
      const data = await res.json();
      
      if (data.error) {
        console.error('Error fetching profiles:', data.error);
        setHasMore(false);
        return;
      }

      // Filter fetched profiles by location if a filter is active
      const processedItems = (locationFilter && locationFilter.lat && locationFilter.lng)
        ? filterProfilesByLocation(data.items || [], locationFilter)
        : data.items || [];

      setProfiles((prev) => isNewQuery ? processedItems : [...prev, ...processedItems]);
      setNextCursor(data.nextCursor);
      // We rely on the API for hasMore, as it uses the limit+1 check
      setHasMore(!!data.nextCursor); 
      
    } catch (error) {
      console.error('Fetch error:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [role, locationFilter, filterProfilesByLocation]); // Added locationFilter dependency

  // Effect to handle initial load or filter change
  useEffect(() => {
    // Reset and fetch when locationFilter changes, forcing a new query
    setProfiles([]); 
    setNextCursor(null);
    setHasMore(true); 
    fetchProfiles(null, 24, true); 
  }, [locationFilter, fetchProfiles]);
  
  const loadMore = () => {
    if (nextCursor && !loading) {
      fetchProfiles(nextCursor);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {profiles.map((profile) => (
          <div key={profile.id} className="bg-gray-50 p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <div className="flex items-center space-x-3 mb-3">
              {profile.photo_url ? (
                <img
                  src={profile.photo_url} // photo_url comes from the /api/community/profiles route
                  alt={`${profile.first_name}`}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-linear-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center text-xl">
                  {profile.role === 'dog_owner' ? '🐕' : '🤝'}
                </div>
              )}
              <div>
                <h4 className="font-semibold text-gray-900">{profile.first_name}</h4>
                <p className="text-xs text-gray-500 capitalize">{profile.role.replace('_', ' ')}</p>
              </div>
            </div>
            {/* Using bio_excerpt from the fast API route */}
            <p className="text-sm text-gray-600 line-clamp-3 mb-3 grow">{profile.bio_excerpt}</p> 
            <div className="text-xs text-gray-400 mb-4">
                {profile.neighborhood && <span>{profile.neighborhood}, </span>}
                {profile.city && <span>{profile.city}</span>}
            </div>
            <button
              onClick={() => onMessage(profile, null)}
              className="mt-auto w-full bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm"
              disabled={!onMessage}
            >
              Send Message
            </button>
          </div>
        ))}
        {loading && profiles.length === 0 && (
          <div className="col-span-full text-center py-4 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2">Loading profiles...</p>
          </div>
        )}
      </div>
      
      {hasMore && (
        <div className="text-center pt-2">
          <button
            onClick={loadMore}
            disabled={loading}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More Profiles'}
          </button>
        </div>
      )}
      
      {!hasMore && profiles.length > 0 && (
        <p className="text-center text-sm text-gray-500 pt-2">End of profiles</p>
      )}
      
      {!loading && profiles.length === 0 && (
        <p className="text-center text-sm text-gray-500 py-6">No matching profiles found in your community.</p>
      )}
    </div>
  );
}


// ===================================
//          POST CARD (Reusable Component)
// ===================================
const PostCard = ({ post, isMine = false, user, openMessageModal, deletingPost, deletePost }) => {
    // FIX: Ensure the owner object is properly available
    const owner = post.owner || post.owner_id || { first_name: 'Owner', last_name: '' }; 

    return (
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-200 flex flex-col justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{post.title}</h3>
          
          {/* Urgency Badge (New Feature) */}
          {post.is_urgent && (
            <div className="flex items-center text-sm text-red-600 mb-2">
              <span className="mr-2">🚨</span>
              Urgent
            </div>
          )}

          {/* FIX: Owner Information (Universal Display for all post types) */}
          {owner.id && ( // Only display if owner profile data is present
            <div className="flex items-center space-x-3 mb-4 border-b pb-4 border-gray-100">
              {owner.profile_photo_url ? (
                <img 
                  src={owner.profile_photo_url} 
                  alt={`${owner.first_name} profile`} 
                  className="w-12 h-12 rounded-full object-cover" 
                />
              ) : (
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                    post.post_type === 'dog_available' ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                  {post.post_type === 'dog_available' ? '🐕' : '🤝'}
                </div>
              )}
              <div>
                <h4 className="font-medium">
                  {isMine ? 'You' : `${owner.first_name} ${owner.last_name || ''}`}
                </h4>
                <p className="text-sm text-gray-500 capitalize">
                  {post.post_type === 'dog_available' ? 'Dog Owner' : 'PetPal'}
                </p>
              </div>
            </div>
          )}
          
          {/* Dog Information */}
          {/* Moved this section below the universal owner block */}
          {post.post_type !== 'petpal_available' && post.allDogs && post.allDogs.length > 0 && (
            <div className="mb-4 border-b pb-4 border-gray-100">
              {post.allDogs.length === 1 ? (
                <div className="flex items-center space-x-3">
                  {(post.allDogs[0].photo_url && !post.allDogs[0].photo_url.includes('undefined')) ? (
                    <img src={post.allDogs[0].photo_url} alt={post.allDogs[0].name} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">🐾</div>
                  )}
                  <div>
                    <h4 className="font-medium">{post.allDogs[0].name}</h4>
                    <p className="text-sm text-gray-500">{post.allDogs[0].breed}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="font-medium mb-2 text-sm text-gray-700">Dogs Available:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {post.allDogs.map((dog) => (
                      <div key={dog.id} className="flex items-center space-x-2">
                        {(dog.photo_url && !dog.photo_url.includes('undefined')) ? (
                          <img src={dog.photo_url} alt={dog.name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs">🐾</div>
                        )}
                        <div className="text-sm">
                          <div className="font-medium">{dog.name}</div>
                          <div className="text-xs text-gray-500">{dog.breed}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Description (New Feature) */}
          {post.description && (
               <p className="text-gray-600 mb-4 line-clamp-3 text-sm">{post.description}</p>
          )}

          {/* Location */}
          <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Location:</h4>
              <p className="text-sm text-gray-600">
                  {post.use_profile_location ? (
                      <>{owner?.neighborhood && <span>{owner.neighborhood}, </span>}{owner?.city && <span>{owner.city}</span>}</>
                  ) : (
                      <>{post.custom_location_neighborhood && <span>{post.custom_location_neighborhood}, </span>}{post.custom_location_city && <span>{post.custom_location_city}</span>}</>
                  )}
              </p>
          </div>

          {/* Available Schedule */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-1">Available Schedule:</h4>
            {post.enabled_days && post.enabled_days.length > 0 && post.day_schedules ? (
              <div className="text-sm text-gray-600 space-y-1">
                {formatAvailabilitySchedule(post.enabled_days, post.day_schedules).map((schedule, index) => (
                  <div key={index} className="flex items-start">
                    <span className="mr-2 pt-1 text-xs">📅</span>
                    <span>{schedule}</span>
                  </div>
                ))}
              </div>
            ) : (
                <p className="text-sm text-gray-500">No recurring schedule set.</p>
            )}
          </div>

          {/* Transportation / Support Badges (New Features) */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {post.can_pick_up_drop_off && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <span className="mr-1">🚗</span>
                  Can Pick Up & Drop Off
                </span>
              )}
              {post.need_extra_help && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  <span className="mr-1">🤝</span>
                  Community Support
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-gray-100">
          {/* Action Buttons */}
          {isMine ? (
              <div className="flex space-x-2">
                  <Link
                      href={`/share-availability?edit=${post.id}`}
                      className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm text-center"
                  >
                      Edit Post
                  </Link>
                  <button
                      onClick={() => deletePost(post.id)}
                      disabled={deletingPost === post.id}
                      className={`flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm text-center disabled:opacity-50`}
                  >
                      {deletingPost === post.id ? 'Hiding...' : 'Hide Post'}
                  </button>
              </div>
          ) : (
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Link
                href={`/community/availability/${post.id}`}
                className="flex-1 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm text-center"
              >
                View Details
              </Link>
              {user ? (
                <button
                  onClick={() => openMessageModal(post.owner, post)}
                  className="flex-1 bg-linear-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors text-sm"
                >
                  Contact {owner?.first_name || 'Owner'}
                </button>
              ) : (
                <Link 
                    href="/login" 
                    className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm text-center"
                >
                    Log in to Contact
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };


// ===================================
//          COMMUNITY PAGE (Main)
// ===================================

export default function CommunityPage() {
  const [user, setUser] = useState(null);
  const [dogAvailabilityPosts, setDogAvailabilityPosts] = useState([]);
  const [petpalAvailabilityPosts, setPetpalAvailabilityPosts] = useState([]);
  const [myAvailabilityPosts, setMyAvailabilityPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dog-availability');
  const [messageModal, setMessageModal] = useState({ isOpen: false, recipient: null, availabilityPost: null });
  const [deletingPost, setDeletingPost] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [networkInfo, setNetworkInfo] = useState(null);
  // State for the new location filter feature
  const [locationFilter, setLocationFilter] = useState(null); // { type, lat, lng, radius } or null
  const [allDogPosts, setAllDogPosts] = useState([]); // Store unfiltered posts
  const [allPetpalPosts, setAllPetpalPosts] = useState([]); // Store unfiltered posts


  const supabase = createClient();
  
  // Helper function for fetching all dogs for a post (used by fetchAvailabilityData)
  const fetchDogsForPost = async (post) => {
      let dogIds = [];
      
      if (post.dog_id) {
          dogIds.push(post.dog_id);
      }
      if (post.dog_ids && Array.isArray(post.dog_ids) && post.dog_ids.length > 0) {
          dogIds = [...dogIds, ...post.dog_ids];
      }
      
      dogIds = [...new Set(dogIds)].filter(Boolean); // Remove duplicates and falsy values
      
      if (dogIds.length > 0) {
          const { data: allDogs, error: dogsError } = await supabase
              .from('dogs')
              .select('id, name, breed, photo_url, size')
              .in('id', dogIds);
              
          if (!dogsError && allDogs) {
              return allDogs;
          } else {
              console.error('Error fetching dogs for post:', post.id, dogsError);
              return [];
          }
      }
      return [];
  };

  const fetchAvailabilityData = useCallback(async (currentUser) => {
    // Only set loading state if we are not refreshing
    if (!refreshing) {
        setLoading(true);
    }
    
    // Define the common owner select clause
    const ownerSelectClause = `
      *,
      owner:profiles!availability_owner_id_fkey (
        id, first_name, last_name, profile_photo_url, neighborhood, city
      )
    `;
    
    try {
      // 1. Fetch Dog Availability posts (excluding current user)
      let dogQuery = supabase
        .from('availability')
        .select(ownerSelectClause)
        .eq('post_type', 'dog_available')
        .eq('status', 'active');
        
      if (currentUser) {
        dogQuery = dogQuery.neq('owner_id', currentUser.id);
      }

      const { data: dogPosts, error: dogError } = await dogQuery.order('created_at', {
        ascending: false,
      });

      if (dogError) throw dogError;
      
      // Enrich dog posts with all dog data
      const enrichedDogPosts = dogPosts ? await Promise.all(dogPosts.map(async (post) => ({
          ...post,
          allDogs: await fetchDogsForPost(post)
      }))) : [];
      setAllDogPosts(enrichedDogPosts); // Store unfiltered posts


      // 2. Fetch PetPal Availability posts (excluding current user)
      let petpalQuery = supabase
        .from('availability')
        .select(ownerSelectClause)
        .eq('post_type', 'petpal_available')
        .eq('status', 'active');
        
      if (currentUser) {
        petpalQuery = petpalQuery.neq('owner_id', currentUser.id);
      }

      const { data: petpalPosts, error: petpalError } = await petpalQuery.order('created_at', {
        ascending: false,
      });

      if (petpalError) throw petpalError;
      setAllPetpalPosts(petpalPosts || []); // Store unfiltered posts


      // 3. Fetch User's Own Availability posts
      if (currentUser) {
        // FIX: Ensure profile data is included for "My Posts" tab
        const { data: myPosts, error: myError } = await supabase
          .from('availability')
          .select(ownerSelectClause) // Use the select clause with owner profile
          .eq('owner_id', currentUser.id)
          .order('created_at', { ascending: false });

        if (myError) throw myError;
        
        // Enrich user's own dog posts
        const enrichedMyPosts = myPosts ? await Promise.all(myPosts.map(async (post) => ({
            ...post,
            allDogs: await fetchDogsForPost(post)
        }))) : [];

        setMyAvailabilityPosts(enrichedMyPosts);
      } else {
          setMyAvailabilityPosts([]);
      }
    } catch (error) {
      console.error('Error fetching availability data:', error);
    } finally {
      setLoading(false);
    }
  }, [refreshing, supabase]); 

  // Filter posts by location (New Feature Logic)
  const filterPostsByLocation = (posts, filter) => {
    if (!filter || !posts || posts.length === 0) {
      return posts || [];
    }

    const filteredPosts = posts.filter((post) => {
      // Use display_lat/display_lng from availability table
      const postLat = post.display_lat;
      const postLng = post.display_lng;

      if (!postLat || !postLng) {
        return false;
      }

      // Calculate distance from filter location to post location
      const distance = calculateDistance(filter.lat, filter.lng, postLat, postLng, 'miles');

      return distance <= filter.radius;
    });

    return filteredPosts;
  };

  // Apply location filter when filter or unfiltered posts change
  useEffect(() => {
    if (locationFilter && locationFilter.lat && locationFilter.lng) {
      // Apply filter to dog posts
      const filteredDogPosts = filterPostsByLocation(allDogPosts, locationFilter);
      setDogAvailabilityPosts(filteredDogPosts);

      // Apply filter to petpal posts
      const filteredPetpalPosts = filterPostsByLocation(allPetpalPosts, locationFilter);
      setPetpalAvailabilityPosts(filteredPetpalPosts);
    } else {
      // Reset to unfiltered posts when filter is cleared or incomplete
      setDogAvailabilityPosts(allDogPosts);
      setPetpalAvailabilityPosts(allPetpalPosts);
    }
  }, [locationFilter, allDogPosts, allPetpalPosts, filterPostsByLocation]);

  // Initial load and network detection (Merged Logic)
  useEffect(() => {
    const detectNetwork = () => {
      if (typeof window !== 'undefined' && 'navigator' in window) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const info = {
          connectionType: connection?.effectiveType || 'unknown',
          online: navigator.onLine,
        };
        setNetworkInfo(info);
      }
    };
    
    detectNetwork();
    
    const getUserAndData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      await fetchAvailabilityData(user);
    };
    
    getUserAndData();
  }, [fetchAvailabilityData, supabase]);


  const openMessageModal = (recipient, availabilityPost) => {
    if (!recipient || !recipient.id) {
        console.error('Cannot open message modal: Invalid recipient data.', recipient);
        return;
    }
    setMessageModal({ isOpen: true, recipient, availabilityPost });
  };

  const closeMessageModal = () => {
    setMessageModal({ isOpen: false, recipient: null, availabilityPost: null });
  };

  const deletePost = async (postId) => {
    if (
      !user ||
      !confirm(
        'Are you sure you want to hide this post? It will no longer be visible to other users, but existing conversations will be preserved.'
      )
    )
      return;

    try {
      setDeletingPost(postId);
      const { error } = await supabase
        .from('availability')
        .update({ status: 'inactive' })
        .eq('id', postId)
        .eq('owner_id', user.id);

      if (error) {
        alert('Failed to hide post: ' + (error.message || 'Unknown error'));
        return;
      }

      setMyAvailabilityPosts(prev => prev.filter(post => post.id !== postId));
      alert('Post hidden successfully');
    } catch (error) {
      console.error('Error hiding post:', error);
      alert('Failed to hide post: ' + (error.message || 'Unknown error'));
    } finally {
      setDeletingPost(null);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      // Reset location filter when refreshing (optional, but good practice)
      setLocationFilter(null); 
      await fetchAvailabilityData(user);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-4">
        
        {/* Header and Refresh */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                🏘️ Community
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Connect with fellow dog lovers in your neighborhood
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors text-sm flex items-center space-x-2 disabled:opacity-50"
              >
                <span>{refreshing ? '🔄' : '↻'}</span>
                <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
              {networkInfo && (
                <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                  {networkInfo.connectionType} • {networkInfo.online ? 'Online' : 'Offline'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Location Filter */}
        <LocationFilter onFilterChange={setLocationFilter} />

        {/* Tabs */}
        <div className="mb-6 sm:mb-8">
          <div className="grid grid-cols-3 bg-white rounded-xl p-2 sm:p-1 shadow-md border border-gray-200 gap-2 sm:gap-0">
            {[
              { id: 'dog-availability', label: 'Dog Availability', icon: '🐕', shortLabel: 'Dogs' },
              { id: 'petpal-availability', label: 'PetPal Availability', icon: '🤝', shortLabel: 'PetPals' },
              { id: 'my-availability', label: 'My Posts', icon: '📅', shortLabel: 'My Posts', requiresUser: true }
            ].filter(tab => !tab.requiresUser || user).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                  activeTab === tab.id
                    ? 'bg-linear-to-r from-blue-600 to-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content: Dog Availability */}
        {activeTab === 'dog-availability' && (
          <div className="space-y-10">
            
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Dogs Looking for Pals</h2>
                <Link
                  href="/share-availability"
                  className="bg-linear-to-r from-blue-600 to-purple-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto text-center"
                >
                  Share My Dog's Availability
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {dogAvailabilityPosts.map((post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    user={user} 
                    openMessageModal={openMessageModal} 
                  />
                ))}
                
                {dogAvailabilityPosts.length === 0 && (
                  <div className="col-span-full text-center py-12 bg-white rounded-xl shadow-md border border-gray-200">
                    <div className="text-6xl mb-4">🐕</div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No dogs available right now</h3>
                    <p className="text-sm sm:text-base text-gray-600 mb-4">Be the first to share your dog&apos;s availability!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Profiles */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">👤</span>
                Dog Owners in the Community (No Active Posts)
              </h3>
              <ProfilesList
                role="dog_owner" 
                onMessage={openMessageModal}
                locationFilter={locationFilter}
              />
            </div>
          </div>
        )}

        {/* Tab Content: PetPal Availability */}
        {activeTab === 'petpal-availability' && (
          <div className="space-y-10">
            
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">PetPals Available to Help</h2>
                <Link
                  href="/share-availability"
                  className="bg-linear-to-r from-blue-600 to-purple-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto text-center"
                >
                  Share My PetPal Availability
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {petpalAvailabilityPosts.map((post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    user={user} 
                    openMessageModal={openMessageModal} 
                  />
                ))}
                
                {petpalAvailabilityPosts.length === 0 && (
                  <div className="col-span-full text-center py-12 bg-white rounded-xl shadow-md border border-gray-200">
                    <div className="text-6xl mb-4">🤝</div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No PetPals available right now</h3>
                    <p className="text-sm sm:text-base text-gray-600 mb-4">Be the first to share your availability to help others!</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Profiles */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">👤</span>
                PetPals in the Community (No Active Posts)
              </h3>
              <ProfilesList
                role="petpal" 
                onMessage={openMessageModal}
                locationFilter={locationFilter}
              />
            </div>
          </div>
        )}
        
        {/* Tab Content: My Availability */}
        {activeTab === 'my-availability' && user && (
            <div className="space-y-6">
                <div className="flex justify-between items-center pb-2 border-b">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Active Posts</h2>
                    <Link
                      href="/share-availability"
                      className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 sm:px-6 py-2 rounded-lg transition-all duration-200 text-sm sm:text-base w-full sm:w-auto text-center"
                    >
                      Create New Post
                    </Link>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {myAvailabilityPosts.map((post) => (
                      <PostCard 
                          key={post.id} 
                          post={post} 
                          isMine={true} 
                          user={user} 
                          deletingPost={deletingPost} 
                          deletePost={deletePost} 
                      />
                    ))}
                    
                    {myAvailabilityPosts.length === 0 && (
                      <div className="col-span-full text-center py-12 bg-white rounded-xl shadow-md border border-gray-200">
                        <div className="text-6xl mb-4">📅</div>
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No active posts</h3>
                        <p className="text-sm sm:text-base text-gray-600 mb-4">Click "Create New Post" to share your availability or needs!</p>
                      </div>
                    )}
                </div>
            </div>
        )}

        {/* Message Modal */}
        <MessageModal
          isOpen={messageModal.isOpen}
          onClose={closeMessageModal}
          recipient={messageModal.recipient}
          availabilityPost={messageModal.availabilityPost}
        />
      </div>
    </div>
  );
}