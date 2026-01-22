'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/libs/supabase/client';
import MessageModal from '@/components/MessageModal';
import ProfilesList from '@/components/ProfilesList';
import LocationFilter from '@/components/LocationFilter';
import { calculateDistance } from '@/libs/distance';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { User } from '@supabase/supabase-js';

// #region: TYPESCRIPT INTERFACES
/**
 * @interface NetworkInfo
 * @description Structure for capturing and displaying browser network status.
 */
interface NetworkInfo {
  userAgent: string;
  connectionType: string;
  downlink: number | string;
  rtt: number | string;
  saveData: boolean;
  online: boolean;
  timestamp: string;
}

/**
 * @interface LocationFilterType
 * @description Structure for the location filter state from the LocationFilter component.
 */
interface LocationFilterType {
  lat: number;
  lng: number;
  radius: number;
}

/**
 * @interface DogType
 * @description Structure for a dog record fetched from the 'dogs' table.
 */
interface DogType {
  id: string;
  name: string;
  breed: string;
  photo_url: string | null;
  size: 'small' | 'medium' | 'large' | 'giant';
}

/**
 * @interface ProfileType
 * @description Structure for a user profile record fetched from the 'profiles' table,
 * specifically as the owner of an availability post.
 */
interface ProfileType {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_url: string | null;
  neighborhood: string | null;
  city: string | null;
}

/**
 * @interface DayScheduleTimeSlot
 * @description Structure for a single time slot within a day's schedule.
 */
interface DayScheduleTimeSlot {
  start: string; // e.g., "08:00"
  end: string; // e.g., "10:00"
}

/**
 * @interface DaySchedule
 * @description Structure for a single day's schedule configuration.
 */
interface DaySchedule {
  enabled: boolean;
  timeSlots: DayScheduleTimeSlot[];
}

/**
 * @interface DaySchedules
 * @description Mapped structure for all seven days of the week schedules.
 */
interface DaySchedules {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
  [key: string]: DaySchedule | undefined;
}

/**
 * @interface AvailabilityPostType
 * @description Main structure for an availability post record.
 */
interface AvailabilityPostType {
  id: string;
  title: string;
  post_type: 'dog_available' | 'petpal_available';
  status: 'active' | 'inactive';
  owner_id: string;
  dog_id: string | null;
  dog_ids: string[] | null;
  display_lat: number | null;
  display_lng: number | null;
  use_profile_location: boolean;
  custom_location_neighborhood: string | null;
  custom_location_city: string | null;
  enabled_days: string[] | null;
  day_schedules: DaySchedules | null;
  need_extra_help: boolean;
  description: string | null;
  is_urgent: boolean;
  can_pick_up: boolean;
  can_drop_off: boolean;
  can_pick_up_drop_off: boolean;
  created_at: string;

  // Custom joined fields:
  owner: ProfileType | null;
  dog: DogType | null; // Single dog if only dog_id is used, though logic uses allDogs
  allDogs?: DogType[]; // Field populated in fetchAvailabilityData for multiple dogs
}

/**
 * @interface MessageModalState
 * @description Structure for the MessageModal state.
 */
interface MessageModalState {
  isOpen: boolean;
  recipient: ProfileType | null;
  availabilityPost: AvailabilityPostType | null;
}

// #region: NETWORK API TYPE EXTENSIONS
/**
 * @interface EffectiveConnectionType
 * @description Enumeration of connection types for Network Information API.
 */
type EffectiveConnectionType = 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';

/**
 * @interface NetworkInformation
 * @description The core interface for the Network Information API properties.
 */
interface NetworkInformation extends EventTarget {
  readonly effectiveType?: EffectiveConnectionType;
  readonly downlink?: number;
  readonly rtt?: number;
  readonly saveData?: boolean;
}

/**
 * @interface NavigatorWithConnection
 * @description Extends the standard Navigator interface to include the non-standard
 * or prefixed 'connection' property for better type checking.
 */
interface NavigatorWithConnection extends Navigator {
  readonly connection?: NetworkInformation;
  readonly mozConnection?: NetworkInformation;
  readonly webkitConnection?: NetworkInformation;
}
// #endregion: NETWORK API TYPE EXTENSIONS
// #endregion: TYPESCRIPT INTERFACES

export default function CommunityPage() {
  // #region: STATE DECLARATIONS
  const { user, isLoading: authLoading } = useProtectedRoute();
  const [dataLoading, setDataLoading] = useState<boolean>(true);

  // Explicitly typed availability post lists
  const [dogAvailabilityPosts, setDogAvailabilityPosts] = useState<AvailabilityPostType[]>([]);
  const [petpalAvailabilityPosts, setPetpalAvailabilityPosts] = useState<AvailabilityPostType[]>(
    []
  );
  const [myAvailabilityPosts, setMyAvailabilityPosts] = useState<AvailabilityPostType[]>([]);

  const [activeTab, setActiveTab] = useState<string>('dog-availability');

  // Explicitly typed message modal state
  const [messageModal, setMessageModal] = useState<MessageModalState>({
    isOpen: false,
    recipient: null,
    availabilityPost: null,
  });

  const [deletingPost, setDeletingPost] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [locationFilter, setLocationFilter] = useState<LocationFilterType | null>(null);

  // Explicitly typed lists for unfiltered data storage
  const [allDogPosts, setAllDogPosts] = useState<AvailabilityPostType[]>([]);
  const [allPetpalPosts, setAllPetpalPosts] = useState<AvailabilityPostType[]>([]);
  // #endregion: STATE DECLARATIONS

  // #region: HELPER FUNCTIONS
  /**
   * @function filterPostsByLocation
   * @description Filters a list of availability posts based on a location filter radius.
   * @param {AvailabilityPostType[]} posts - The list of posts to filter.
   * @param {LocationFilterType | null} filter - The location filter (lat, lng, radius).
   * @returns {AvailabilityPostType[]} The filtered list of posts.
   */
  const filterPostsByLocation = (
    posts: AvailabilityPostType[],
    filter: LocationFilterType | null
  ): AvailabilityPostType[] => {
    if (!filter || !posts || posts.length === 0) {
      return posts || [];
    }

    const filteredPosts = posts.filter((post) => {
      const postLat = post.display_lat;
      const postLng = post.display_lng;
      if (postLat === null || postLng === null) return false;

      const distance = calculateDistance(filter.lat, filter.lng, postLat, postLng);
      return distance <= filter.radius;
    });

    return filteredPosts;
  };

  /**
   * @function formatAvailabilitySchedule
   * @description Converts the enabled days and schedules object into a readable string array.
   * @param {string[]} enabledDays - An array of enabled day keys (e.g., ['monday', 'tuesday']).
   * @param {DaySchedules | null} daySchedules - The object containing schedule details for each day.
   * @returns {string[]} An array of formatted schedule strings (e.g., "Monday 9:00 AM - 5:00 PM").
   */
  const formatAvailabilitySchedule = (
    enabledDays: string[],
    daySchedules: DaySchedules | null
  ): string[] => {
    if (!enabledDays || !daySchedules) return [];

    const dayNames: { [key: string]: string } = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday',
    };

    const formattedSchedule: string[] = [];

    enabledDays.forEach((day) => {
      const schedule = daySchedules[day];
      if (schedule?.enabled && schedule.timeSlots) {
        const dayName = dayNames[day] || day.charAt(0).toUpperCase() + day.slice(1);

        // Explicitly type the slot in the map function
        const timeSlots = schedule.timeSlots
          .filter((slot: DayScheduleTimeSlot) => slot.start && slot.end)
          .map((slot: DayScheduleTimeSlot) => {
            const startTime = new Date(`2000-01-01T${slot.start}`).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });
            const endTime = new Date(`2000-01-01T${slot.end}`).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });
            return `${startTime} - ${endTime}`;
          });

        if (timeSlots.length > 0) {
          formattedSchedule.push(`${dayName} ${timeSlots.join(', ')}`);
        }
      }
    });

    return formattedSchedule;
  };

  /**
   * @function formatDate
   * @description Formats a date string into a localized, human-readable format.
   * @param {string} dateString - The date string to format.
   * @returns {string} The formatted date string.
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * @function openMessageModal
   * @description Opens the message modal with the specified recipient and post details.
   * @param {ProfileType} recipient - The profile of the user to message.
   * @param {AvailabilityPostType} availabilityPost - The post being messaged about.
   * @returns {void}
   */
  const openMessageModal = (
    recipient: ProfileType,
    availabilityPost: AvailabilityPostType
  ): void => {
    setMessageModal({ isOpen: true, recipient, availabilityPost });
  };

  /**
   * @function closeMessageModal
   * @description Closes the message modal and resets its state.
   * @returns {void}
   */
  const closeMessageModal = (): void => {
    setMessageModal({ isOpen: false, recipient: null, availabilityPost: null });
  };

  /**
   * @function deletePost
   * @description Hides an availability post by setting its status to 'inactive'.
   * @param {string} postId - The ID of the post to delete.
   * @returns {Promise<void>}
   */
  const deletePost = async (postId: string): Promise<void> => {
    if (
      !user ||
      !confirm(
        'Are you sure you want to hide this post? It will no longer be visible to other users, but existing conversations will be preserved.'
      )
    )
      return;

    try {
      setDeletingPost(postId);
      const supabase = createClient();

      // Post owner is implicitly checked by the security policies in Supabase,
      // but explicitly checking owner_id here adds client-side safety.
      const { error } = await supabase
        .from('availability')
        .update({ status: 'inactive' })
        .eq('id', postId)
        .eq('owner_id', user.id);

      if (error) {
        console.error('Error hiding post:', error);
        alert(
          'Failed to hide post: ' +
            (typeof error === 'object' && error !== null && 'message' in error
              ? (error as { message?: string }).message || 'Unknown error'
              : 'Unknown error')
        );
        return;
      }

      setMyAvailabilityPosts(myAvailabilityPosts.filter((post) => post.id !== postId));
      alert('Post hidden successfully');
    } catch (error) {
      console.error('Error hiding post:', error);
      alert('Failed to hide post: Unknown error');
    } finally {
      setDeletingPost(null);
    }
  };
  // #endregion: HELPER FUNCTIONS

  // #region: DATA FETCHING LOGIC
  /**
   * @function fetchAvailabilityData
   * @description Fetches all community and user-specific availability posts.
   * @param {User | null} currentUser - The current Supabase user object.
   * @returns {Promise<void>}
   */
  const fetchAvailabilityData = async (currentUser: User | null): Promise<void> => {
    setDataLoading(true);
    try {
      const supabase = createClient();

      // ... (cache-busting and connection test logic is unchanged)
      const cacheBuster = Date.now();
      if (typeof globalThis !== 'undefined' && globalThis.location) {
        const url = new URL(globalThis.location.href);
        url.searchParams.set('_t', cacheBuster.toString());
        globalThis.history.replaceState({}, '', url);
      }

      // Simple query to test connection / initial data fetch
      const { error: allPostsError } = await supabase
        .from('availability')
        .select('id, title, post_type, status, owner_id')
        .limit(5);
      if (allPostsError) {
        console.error('Database connection error:', allPostsError);
        throw new Error(`Database error: ${allPostsError.message}`);
      }

      // 1. Fetch dog availability posts
      let dogQuery = supabase
        .from('availability')
        .select(
          `
          *,
          owner:profiles!availability_owner_id_fkey ( id, first_name, last_name, profile_photo_url, neighborhood, city ),
          dog:dogs!availability_dog_id_fkey ( id, name, breed, photo_url, size )
          `
        )
        .eq('post_type', 'dog_available')
        .eq('status', 'active');
      if (currentUser) {
        dogQuery = dogQuery.neq('owner_id', currentUser.id);
      }
      // Cast the resulting data array to the expected type
      const { data: dogPosts, error: dogError } = (await dogQuery.order('created_at', {
        ascending: false,
      })) as { data: AvailabilityPostType[] | null; error: unknown };

      // Fetch all dogs logic for multi-dog posts
      if (dogPosts) {
        for (const post of dogPosts) {
          let dogIds: string[] = [];
          if (post.dog_id) dogIds.push(post.dog_id);
          // Assuming dog_ids column is an array of strings (text[] in Postgres)
          if (post.dog_ids && post.dog_ids.length > 0) dogIds = [...dogIds, ...post.dog_ids];
          dogIds = [...new Set(dogIds)]; // Deduplicate

          if (dogIds.length > 0) {
            const { data: allDogs, error: dogsError } = (await supabase
              .from('dogs')
              .select('id, name, breed, photo_url, size')
              .in('id', dogIds)) as { data: DogType[] | null; error: unknown };

            if (!dogsError && allDogs) (post as AvailabilityPostType).allDogs = allDogs;
            else {
              console.error('Error fetching dogs for post:', post.id, dogsError);
              (post as AvailabilityPostType).allDogs = [];
            }
          } else {
            (post as AvailabilityPostType).allDogs = [];
          }
        }
      }
      if (dogError) {
        console.error('Error fetching dog posts:', dogError);
        throw dogError;
      }
      const postsWithDogs: AvailabilityPostType[] = dogPosts || [];

      setAllDogPosts(postsWithDogs);

      // 2. Fetch petpal availability posts
      let petpalQuery = supabase
        .from('availability')
        .select(
          `
          *,
          owner:profiles!availability_owner_id_fkey ( id, first_name, last_name, profile_photo_url, neighborhood, city )
          `
        )
        .eq('post_type', 'petpal_available')
        .eq('status', 'active');
      if (currentUser) {
        petpalQuery = petpalQuery.neq('owner_id', currentUser.id);
      }
      const { data: petpalPosts, error: petpalError } = (await petpalQuery.order('created_at', {
        ascending: false,
      })) as { data: AvailabilityPostType[] | null; error: unknown };

      if (petpalError) {
        console.error('Error fetching petpal posts:', petpalError);
        throw petpalError;
      }
      const postsWithData: AvailabilityPostType[] = petpalPosts || [];

      setAllPetpalPosts(postsWithData);

      // 3. Fetch user's own availability posts
      if (currentUser) {
        const { data: myPosts, error: myError } = (await supabase
          .from('availability')
          .select(
            `
            *,
            dog:dogs!availability_dog_id_fkey ( id, name, breed, photo_url, size )
            `
          )
          .eq('owner_id', currentUser.id)
          .order('created_at', { ascending: false })) as {
          data: AvailabilityPostType[] | null;
          error: unknown;
        };

        // Fetch all dogs for my posts
        if (myPosts) {
          for (const post of myPosts) {
            let dogIds: string[] = [];
            if (post.dog_id) dogIds.push(post.dog_id);
            if (post.dog_ids && post.dog_ids.length > 0) dogIds = [...dogIds, ...post.dog_ids];
            dogIds = [...new Set(dogIds)];

            if (dogIds.length > 0) {
              const { data: allDogs, error: dogsError } = (await supabase
                .from('dogs')
                .select('id, name, breed, photo_url, size')
                .in('id', dogIds)) as { data: DogType[] | null; error: unknown };

              if (!dogsError && allDogs) (post as AvailabilityPostType).allDogs = allDogs;
              else {
                console.error('Error fetching dogs for my post:', post.id, dogsError);
                post.allDogs = [];
              }
            } else {
              (post as AvailabilityPostType).allDogs = [];
            }
          }
        }
        if (myError) {
          console.error('Error fetching user posts:', myError);
          throw myError;
        }
        setMyAvailabilityPosts(myPosts || []);
      }
    } catch (error) {
      console.error('Error fetching availability data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  /**
   * @function refreshData
   * @description Clears cache and re-fetches all availability data.
   * @returns {Promise<void>}
   */
  const refreshData = async (): Promise<void> => {
    setRefreshing(true);
    try {
      // Cache clearing logic
      if (typeof globalThis !== 'undefined') {
        if ('caches' in globalThis) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map((name) => caches.delete(name)));
        }
        localStorage.clear();
        sessionStorage.clear();
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((reg) => reg.unregister()));
        }
      }

      await fetchAvailabilityData(user);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };
  // #endregion: DATA FETCHING LOGIC

  /**
   * @function detectNetwork
   * @description Detects network information using the extended Navigator interface.
   * @returns {void}
   */
  const detectNetwork = (): void => {
    // Cast navigator to the extended interface NavigatorWithConnection
    const typedNavigator = navigator as NavigatorWithConnection;

    if (typeof globalThis !== 'undefined' && 'navigator' in globalThis) {
      // The connection variable now has an explicit type (NetworkInformation | undefined)
      const connection: NetworkInformation | undefined =
        typedNavigator.connection ||
        typedNavigator.mozConnection ||
        typedNavigator.webkitConnection;

      const info: NetworkInfo = {
        userAgent: typedNavigator.userAgent,
        // Safely access properties on connection
        connectionType: connection?.effectiveType || 'unknown',
        downlink: connection?.downlink || 'unknown',
        rtt: connection?.rtt || 'unknown',
        saveData: connection?.saveData || false,
        online: typedNavigator.onLine,
        timestamp: new Date().toISOString(),
      };
      setNetworkInfo(info);
    }
  };

  // #region: EFFECTS
  /**
   * @effect Data Fetching & Network Detection
   * @description Runs on mount and whenever the authenticated user changes.
   * It detects network info and initiates data fetching if a user is present.
   */
  useEffect(() => {
    // Detect network information for debugging

    detectNetwork();

    if (user) {
      fetchAvailabilityData(user);
    }
  }, [user]);

  /**
   * @effect Location Filter Application
   * @description Filters the displayed posts when the location filter or underlying data changes.
   */
  useEffect(() => {
    if (locationFilter) {
      const filteredDogPosts = filterPostsByLocation(allDogPosts, locationFilter);
      setDogAvailabilityPosts(filteredDogPosts);
      const filteredPetpalPosts = filterPostsByLocation(allPetpalPosts, locationFilter);
      setPetpalAvailabilityPosts(filteredPetpalPosts);
    } else {
      setDogAvailabilityPosts(allDogPosts);
      setPetpalAvailabilityPosts(allPetpalPosts);
    }
  }, [locationFilter, allDogPosts, allPetpalPosts]);
  // #endregion: EFFECTS

  // #region: RENDER LOGIC
  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // The hook guarantees 'user' is not null here, but checking keeps the logic clear
  if (!user) {
    // Should be handled by useProtectedRoute, but provides a fallback
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <p className="text-xl text-red-500">Authentication failed. Please log in.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-4">
        {/* Header */}
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
                <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-sm">
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
          <div className="grid grid-cols-1 sm:flex sm:space-x-1 bg-white rounded-xl p-2 sm:p-1 shadow-md border border-gray-200 gap-2 sm:gap-0">
            {[
              { id: 'dog-availability', label: 'Dog Availability', icon: '🐕', shortLabel: 'Dogs' },
              {
                id: 'petpal-availability',
                label: 'PetPal Availability',
                icon: '🤝',
                shortLabel: 'PetPals',
              },
              {
                id: 'my-availability',
                label: 'My Availability',
                icon: '📅',
                shortLabel: 'My Posts',
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full sm:flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
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

        {/* Tab Content */}
        {activeTab === 'dog-availability' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Dogs Looking for Pals</h2>
              <Link
                href="/share-availability"
                className="bg-linear-to-r from-blue-600 to-purple-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto text-center"
              >
                Share Availability
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {dogAvailabilityPosts.map((post: AvailabilityPostType) => (
                <div
                  key={post.id}
                  className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-200"
                >
                  {/* Title */}
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                    {post.title}
                  </h3>

                  {/* Dog Information */}
                  {post.allDogs && post.allDogs.length > 0 && (
                    <div className="mb-4">
                      {post.allDogs.length === 1 ? (
                        // Single dog display
                        <div className="flex items-center space-x-3">
                          {post.allDogs[0].photo_url ? (
                            <Image
                              src={post.allDogs[0].photo_url}
                              alt={post.allDogs[0].name}
                              width={48}
                              height={48}
                              className="w-12 h-12 rounded-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                              🐕
                            </div>
                          )}
                          <div>
                            <h4 className="font-medium">{post.allDogs[0].name}</h4>
                            <p className="text-sm text-gray-500">{post.allDogs[0].breed}</p>
                          </div>
                        </div>
                      ) : (
                        // Multiple dogs display
                        <div>
                          <h4 className="font-medium mb-2">Dogs Available:</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {post.allDogs.map((dog: DogType) => (
                              <div key={dog.id} className="flex items-center space-x-2">
                                {dog.photo_url ? (
                                  <Image
                                    src={dog.photo_url}
                                    alt={dog.name}
                                    width={32}
                                    height={32}
                                    className="w-8 h-8 rounded-full object-cover"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs">
                                    🐕
                                  </div>
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

                  {/* Location Information */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      {post.use_profile_location && post.owner ? (
                        <>
                          {post.owner.neighborhood && <span>{post.owner.neighborhood}, </span>}
                          {post.owner.city && <span>{post.owner.city}</span>}
                        </>
                      ) : (
                        <>
                          {post.custom_location_neighborhood && (
                            <span>{post.custom_location_neighborhood}, </span>
                          )}
                          {post.custom_location_city && <span>{post.custom_location_city}</span>}
                        </>
                      )}
                    </p>
                  </div>

                  {/* Available Schedule */}
                  <div className="mb-4">
                    {post.enabled_days && post.enabled_days.length > 0 && post.day_schedules && (
                      <div className="text-sm text-gray-600 space-y-1">
                        {formatAvailabilitySchedule(post.enabled_days, post.day_schedules).map(
                          (schedule) => (
                            <div key={schedule} className="flex items-center">
                              <span className="mr-2">📅</span>
                              <span>{schedule}</span>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* Community Support Badge */}
                  {post.need_extra_help && (
                    <div className="mb-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        <span className="mr-1">🤝</span>
                        <span>Community Support</span>
                      </span>
                    </div>
                  )}

                  {/* Description */}
                  {post.description && (
                    <p className="text-gray-600 mb-4 line-clamp-3">{post.description}</p>
                  )}

                  {/* Urgency Badge */}
                  {post.is_urgent && (
                    <div className="flex items-center text-sm text-red-600 mb-4">
                      <span className="mr-2">🚨</span>
                      <span>Urgent</span>
                    </div>
                  )}

                  {/* Pickup/Dropoff Information */}
                  {(post.can_pick_up || post.can_drop_off || post.can_pick_up_drop_off) && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {post.can_pick_up_drop_off && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <span className="mr-1">🚗</span>
                            <span>Can Pick Up & Drop Off</span>
                          </span>
                        )}
                        {post.can_pick_up && !post.can_pick_up_drop_off && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <span className="mr-1">📤</span>
                            <span>Can Pick Up</span>
                          </span>
                        )}
                        {post.can_drop_off && !post.can_pick_up_drop_off && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <span className="mr-1">📥</span>
                            <span>Can Drop Off</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link
                        href={`/community/availability/${post.id}`}
                        className="flex-1 border-2 border-gray-300 text-gray-700 bg-white px-5 py-3 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all text-base text-center font-medium"
                      >
                        View Details
                      </Link>

                      {user && user.id !== post.owner_id && post.owner ? (
                        <button
                          // post.owner is cast to ProfileType in fetch and checked above
                          onClick={() => openMessageModal(post.owner as ProfileType, post)}
                          className="flex-1 bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 shadow-sm hover:shadow-md transition-all text-base font-medium"
                        >
                          Send Message
                        </button>
                      ) : (
                        <div className="flex-1 text-sm text-gray-400 px-5 py-3 bg-gray-100 rounded-lg text-center border-2 border-gray-200">
                          {user ? 'Your post' : 'Sign in to message'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {dogAvailabilityPosts.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <div className="text-6xl mb-4">🐕</div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                    No dogs available right now
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-4">
                    Be the first to share your dog&apos;s availability!
                  </p>
                  <Link
                    href="/share-availability"
                    className="bg-linear-to-r from-blue-600 to-purple-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm sm:text-base"
                  >
                    Share Availability
                  </Link>
                </div>
              )}
            </div>

            {/* Dog Owner Profiles Section */}
            <div className="mt-8">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">🐕</span>
                <span>Dog Owners in the Community</span>
              </h3>
              <ProfilesList
                role="dog_owner"
                onMessage={openMessageModal}
                locationFilter={locationFilter}
              />
            </div>
          </div>
        )}

        {activeTab === 'petpal-availability' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                PetPals Available to Help
              </h2>
              <Link
                href="/share-availability"
                className="bg-linear-to-r from-blue-600 to-purple-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto text-center"
              >
                Share Availability
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {petpalAvailabilityPosts.map((post: AvailabilityPostType) => (
                <div
                  key={post.id}
                  className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-200"
                >
                  {/* Title */}
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                    {post.title}
                  </h3>

                  {/* PetPal Information */}
                  <div className="flex items-center space-x-3 mb-4">
                    {post.owner?.profile_photo_url ? (
                      <Image
                        src={post.owner.profile_photo_url}
                        alt={`${post.owner.first_name} ${post.owner.last_name}`}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-linear-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center">
                        🤝
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium">
                        {post.owner?.first_name} {post.owner?.last_name}
                      </h4>
                      <p className="text-sm text-gray-500">PetPal</p>
                    </div>
                  </div>

                  {/* Location Information */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      {post.use_profile_location && post.owner ? (
                        <>
                          {post.owner.neighborhood && <span>{post.owner.neighborhood}, </span>}
                          {post.owner.city && <span>{post.owner.city}</span>}
                        </>
                      ) : (
                        <>
                          {post.custom_location_neighborhood && (
                            <span>{post.custom_location_neighborhood}, </span>
                          )}
                          {post.custom_location_city && <span>{post.custom_location_city}</span>}
                        </>
                      )}
                    </p>
                  </div>

                  {/* Available Schedule */}
                  <div className="mb-4">
                    {post.enabled_days && post.enabled_days.length > 0 && post.day_schedules && (
                      <div className="text-sm text-gray-600 space-y-1">
                        {formatAvailabilitySchedule(post.enabled_days, post.day_schedules).map(
                          (schedule) => (
                            <div key={schedule} className="flex items-center">
                              <span className="mr-2">📅</span>
                              <span>{schedule}</span>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* Community Support Badge */}
                  {post.need_extra_help && (
                    <div className="mb-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        <span className="mr-1">🤝</span>
                        <span>Community Support</span>
                      </span>
                    </div>
                  )}

                  {/* Description */}
                  {post.description && (
                    <p className="text-gray-600 mb-4 line-clamp-3">{post.description}</p>
                  )}

                  {/* Transportation Options */}
                  <div className="space-y-2 mb-4">
                    {post.can_pick_up_drop_off && (
                      <div className="flex items-center text-sm text-green-600">
                        <span className="mr-2">🚗</span>
                        <span>Can pick up/drop off</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link
                        href={`/community/availability/${post.id}`}
                        className="flex-1 border-2 border-gray-300 text-gray-700 bg-white px-5 py-3 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all text-base text-center font-medium"
                      >
                        View Details
                      </Link>
                      {user && user.id !== post.owner_id && post.owner ? (
                        <button
                          // post.owner is cast to ProfileType in fetch and checked above
                          onClick={() => openMessageModal(post.owner as ProfileType, post)}
                          className="flex-1 bg-green-600 text-white px-5 py-3 rounded-lg hover:bg-green-700 shadow-sm hover:shadow-md transition-all text-base font-medium"
                        >
                          Send Message
                        </button>
                      ) : (
                        <div className="flex-1 text-sm text-gray-400 px-5 py-3 bg-gray-100 rounded-lg text-center border-2 border-gray-200">
                          {user ? 'Your post' : 'Sign in to message'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {petpalAvailabilityPosts.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <div className="text-6xl mb-4">🤝</div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                    No PetPals available right now
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-4">
                    Be the first to offer your help!
                  </p>
                  <Link
                    href="/share-availability"
                    className="bg-linear-to-r from-blue-600 to-purple-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm sm:text-base"
                  >
                    Share Availability
                  </Link>
                </div>
              )}
            </div>

            {/* PetPal Profiles Section */}
            <div className="mt-8">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">🤝</span>
                <span>PetPals in the Community</span>
              </h3>
              <ProfilesList
                role="petpal"
                onMessage={openMessageModal}
                locationFilter={locationFilter}
              />
            </div>
          </div>
        )}

        {activeTab === 'my-availability' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Availability Posts</h2>
              <Link
                href="/share-availability"
                className="bg-linear-to-r from-blue-600 to-purple-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto text-center"
              >
                Create New Post
              </Link>
            </div>

            {myAvailabilityPosts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {myAvailabilityPosts.map((post: AvailabilityPostType) => (
                  <div
                    key={post.id}
                    className="bg-white rounded-xl p-4 sm:p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200"
                  >
                    {/* Title and Status */}
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                        {post.title}
                      </h3>
                      <div className="flex flex-col items-end">
                        <p
                          className={`text-sm ${post.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}
                        >
                          {post.status === 'active' ? 'Active' : 'Inactive'}
                        </p>
                        <p className="text-xs text-gray-400">
                          Created: {formatDate(post.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Dog Information */}
                    {post.allDogs && post.allDogs.length > 0 && (
                      <div className="mb-4">
                        {post.allDogs.length === 1 ? (
                          // Single dog display
                          <div className="flex items-center space-x-3">
                            {post.allDogs[0].photo_url ? (
                              <Image
                                src={post.allDogs[0].photo_url}
                                alt={post.allDogs[0].name}
                                width={48}
                                height={48}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                🐕
                              </div>
                            )}
                            <div>
                              <h4 className="font-medium">{post.allDogs[0].name}</h4>
                              <p className="text-sm text-gray-500">{post.allDogs[0].breed}</p>
                            </div>
                          </div>
                        ) : (
                          // Multiple dogs display
                          <div>
                            <h4 className="font-medium mb-2">Dogs Available:</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {post.allDogs.map((dog: DogType) => (
                                <div key={dog.id} className="flex items-center space-x-2">
                                  {dog.photo_url ? (
                                    <Image
                                      src={dog.photo_url}
                                      alt={dog.name}
                                      width={32}
                                      height={32}
                                      className="w-8 h-8 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs">
                                      🐕
                                    </div>
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

                    {/* Post Type Badge */}
                    <div className="mb-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          post.post_type === 'dog_available'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {post.post_type === 'dog_available'
                          ? 'Dog Available'
                          : '🤝 PetPal Available'}
                      </span>
                    </div>

                    {/* Available Schedule */}
                    <div className="mb-4">
                      {post.enabled_days && post.enabled_days.length > 0 && post.day_schedules && (
                        <div className="text-sm text-gray-600 space-y-1">
                          {formatAvailabilitySchedule(post.enabled_days, post.day_schedules).map(
                            (schedule) => (
                              <div key={post.id} className="flex items-center">
                                <span className="mr-2">📅</span>
                                <span>{schedule}</span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>

                    {/* Community Support Badge */}
                    {post.need_extra_help && (
                      <div className="mb-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          <span className="mr-1">🤝</span>
                          Community Support
                        </span>
                      </div>
                    )}

                    {/* Description */}
                    {post.description && (
                      <p className="text-gray-600 mb-4 line-clamp-3">{post.description}</p>
                    )}

                    {/* Badges */}
                    <div className="space-y-2 mb-4">
                      {post.is_urgent && (
                        <div className="flex items-center text-sm text-red-600">
                          <span className="mr-2">🚨</span>
                          Urgent
                        </div>
                      )}
                      {post.can_pick_up_drop_off && (
                        <div className="flex items-center text-sm text-green-600">
                          <span className="mr-2">🚗</span>
                          Can pick up/drop off
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex flex-col gap-3">
                        <Link
                          href={`/community/availability/${post.id}`}
                          className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 shadow-sm hover:shadow-md transition-all text-base text-center font-medium"
                        >
                          View Details
                        </Link>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Link
                            href={`/community/availability/${post.id}/edit`}
                            className="flex-1 border-2 border-gray-300 text-gray-700 bg-white px-5 py-3 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all text-base text-center font-medium"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => deletePost(post.id)}
                            className={`flex-1 border-2 border-red-300 text-red-600 bg-white px-5 py-3 rounded-lg hover:bg-red-50 hover:border-red-400 transition-all text-base font-medium ${deletingPost === post.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={deletingPost === post.id}
                          >
                            {deletingPost === post.id ? 'Hiding...' : 'Hide Post'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="text-6xl mb-4">📅</div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                  No availability posts yet
                </h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4">
                  Start sharing your availability to connect with the community!
                </p>
                <Link
                  href="/share-availability"
                  className="bg-linear-to-r from-blue-600 to-purple-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm sm:text-base"
                >
                  Create Your First Post
                </Link>
              </div>
            )}
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
// #endregion: RENDER LOGIC
