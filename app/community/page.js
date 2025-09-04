'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/libs/supabase/client';
import MessageModal from '@/components/MessageModal';

export default function CommunityPage() {
  const [user, setUser] = useState(null);
  const [dogAvailabilityPosts, setDogAvailabilityPosts] = useState([]);
  const [petpalAvailabilityPosts, setPetpalAvailabilityPosts] = useState([]);
  const [myAvailabilityPosts, setMyAvailabilityPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dog-availability');
  const [joiningEvent, setJoiningEvent] = useState(null);
  const [messageModal, setMessageModal] = useState({ isOpen: false, recipient: null, availabilityPost: null });
  const [deletingPost, setDeletingPost] = useState(null);

  const formatAvailabilitySchedule = (enabledDays, daySchedules) => {
    if (!enabledDays || !daySchedules) return [];
    
    const dayNames = {
      monday: 'Monday',
      tuesday: 'Tuesday', 
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
    };
    
    const formattedSchedule = [];
    
    enabledDays.forEach(day => {
      const schedule = daySchedules[day];
      if (schedule && schedule.enabled && schedule.timeSlots) {
        const dayName = dayNames[day] || day.charAt(0).toUpperCase() + day.slice(1);
        const timeSlots = schedule.timeSlots
          .filter(slot => slot.start && slot.end)
          .map(slot => {
            const startTime = new Date(`2000-01-01T${slot.start}`).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });
            const endTime = new Date(`2000-01-01T${slot.end}`).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
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

  useEffect(() => {
    const supabase = createClient();
    
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      // Always fetch availability data, regardless of login status
      fetchAvailabilityData(user);
      
      // If user is logged in, default to "My Availability" tab
      if (user) {
        setActiveTab('my-availability');
      }
    };
    
    getUser();
  }, []);

  const fetchAvailabilityData = async (currentUser) => {
    try {
      const supabase = createClient();
      
      console.log('Fetching availability data for user:', currentUser?.id || 'not logged in');
      
      // First, let's test if we can fetch any availability posts at all
      const { data: allPosts, error: allPostsError } = await supabase
        .from('availability')
        .select('id, title, post_type, status, owner_id')
        .limit(5);
      
      console.log('All availability posts test:', allPosts?.length || 0, 'Error:', allPostsError);
      
      // Fetch dog availability posts (excluding current user's posts if logged in)
      let dogQuery = supabase
        .from('availability')
        .select(`
          *,
          owner:profiles!availability_owner_id_fkey (
            id,
            first_name,
            last_name,
            profile_photo_url,
            neighborhood,
            city
          ),
          dog:dogs!availability_dog_id_fkey (
            id,
            name,
            breed,
            photo_url,
            size
          )
        `)
        .eq('post_type', 'dog_available')
        .eq('status', 'active');
      
      // Only exclude current user's posts if they're logged in
      if (currentUser) {
        dogQuery = dogQuery.neq('owner_id', currentUser.id);
        console.log('Excluding posts from user:', currentUser.id);
      }
      
      const { data: dogPosts, error: dogError } = await dogQuery.order('created_at', { ascending: false });

      // Debug logging for dog posts
      console.log('Dog posts fetched:', dogPosts?.length || 0);
      if (dogPosts && dogPosts.length > 0) {
        console.log('First dog post owner data:', dogPosts[0].owner);
      }

      // Fetch additional dogs for posts with multiple dogs
      if (dogPosts) {
        for (let post of dogPosts) {
          if (post.dog_ids && post.dog_ids.length > 1) {
            const { data: additionalDogs, error: dogsError } = await supabase
              .from('dogs')
              .select('id, name, breed, photo_url, size')
              .in('id', post.dog_ids);
            
            if (!dogsError && additionalDogs) {
              post.allDogs = additionalDogs;
            }
          } else {
            post.allDogs = post.dog ? [post.dog] : [];
          }
        }
      }

      if (dogError) {
        console.error('Error fetching dog posts:', dogError);
        throw dogError;
      }
      console.log('Dog posts fetched:', dogPosts?.length || 0);
      setDogAvailabilityPosts(dogPosts || []);
      

      // Fetch petpal availability posts (excluding current user's posts if logged in)
      let petpalQuery = supabase
        .from('availability')
        .select(`
          *,
          owner:profiles!availability_owner_id_fkey (
            id,
            first_name,
            last_name,
            profile_photo_url,
            neighborhood,
            city
          )
        `)
        .eq('post_type', 'petpal_available')
        .eq('status', 'active');
      
      // Only exclude current user's posts if they're logged in
      if (currentUser) {
        petpalQuery = petpalQuery.neq('owner_id', currentUser.id);
      }
      
      const { data: petpalPosts, error: petpalError } = await petpalQuery.order('created_at', { ascending: false });

      // Debug logging for petpal posts
      console.log('Petpal posts fetched:', petpalPosts?.length || 0);
      if (petpalPosts && petpalPosts.length > 0) {
        console.log('First petpal post owner data:', petpalPosts[0].owner);
      }

      if (petpalError) {
        console.error('Error fetching petpal posts:', petpalError);
        throw petpalError;
      }
      console.log('Petpal posts fetched:', petpalPosts?.length || 0);
      setPetpalAvailabilityPosts(petpalPosts || []);
      

              // Fetch user's own availability posts
        if (currentUser) {
  
          const { data: myPosts, error: myError } = await supabase
            .from('availability')
            .select(`
              *,
              dog:dogs!availability_dog_id_fkey (
                id,
                name,
                breed,
                photo_url,
                size
              )
            `)
            .eq('owner_id', currentUser.id)
            .order('created_at', { ascending: false });

          // Fetch additional dogs for posts with multiple dogs
          if (myPosts) {
            for (let post of myPosts) {
              if (post.dog_ids && post.dog_ids.length > 1) {
                const { data: additionalDogs, error: dogsError } = await supabase
                  .from('dogs')
                  .select('id, name, breed, photo_url, size')
                  .in('id', post.dog_ids);
                
                if (!dogsError && additionalDogs) {
                  post.allDogs = additionalDogs;
                }
              } else {
                post.allDogs = post.dog ? [post.dog] : [];
              }
            }
          }

        if (myError) {
          console.error('Error fetching user posts:', myError);
          throw myError;
        }
        console.log('My posts fetched:', myPosts?.length || 0);
        setMyAvailabilityPosts(myPosts || []);

      }

    } catch (error) {
      console.error('Error fetching availability data:', error);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'dog_owner': return '🐕';
      case 'dog_walker': return '🚶‍♂️';
      case 'both': return '🐕‍🦺';
      default: return '👤';
    }
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'meetup': return '🤝';
      case 'workshop': return '📚';
      case 'outdoor': return '🏔️';
      default: return '📅';
    }
  };

  const getPlaceIcon = (type) => {
    switch (type) {
      case 'park': return '🌳';
      case 'cafe': return '☕';
      case 'store': return '🛍️';
      default: return '📍';
    }
  };

  const handleJoinEvent = async (eventId) => {
    setJoiningEvent(eventId);
    try {
      const response = await fetch(`/api/community/events/${eventId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Refresh events to show updated participant count
        const eventsResponse = await fetch('/api/community/events?limit=10');
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          // Note: setCommunityEvents is not defined in this component
          // This will be handled by the parent component or removed if not needed
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to join event');
      }
    } catch (error) {
      console.error('Error joining event:', error);
      alert('Failed to join event');
    } finally {
      setJoiningEvent(null);
    }
  };

  const openMessageModal = (recipient, availabilityPost) => {
    console.log('Opening message modal with:', { recipient, availabilityPost });
    setMessageModal({ isOpen: true, recipient, availabilityPost });
  };

  const closeMessageModal = () => {
    setMessageModal({ isOpen: false, recipient: null, availabilityPost: null });
  };

  const deletePost = async (postId) => {
    if (!user || !confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;

    try {
      setDeletingPost(postId);
      const supabase = createClient();
      const { error } = await supabase
        .from('availability')
        .delete()
        .eq('id', postId)
        .eq('owner_id', user.id);

      if (error) {
        console.error('Error deleting post:', error);
        alert('Failed to delete post: ' + (error.message || 'Unknown error'));
        return;
      }

      // Remove from local state
      setMyAvailabilityPosts(myAvailabilityPosts.filter(post => post.id !== postId));
      alert('Post deleted successfully');
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post: ' + (error.message || 'Unknown error'));
    } finally {
      setDeletingPost(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            🏘️ Community
          </h1>
          <p className="text-gray-600">Connect with fellow dog lovers in your neighborhood</p>
        </div>



        {/* Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-white rounded-xl p-1 shadow-md border border-gray-200">
            {[
              { id: 'dog-availability', label: 'Dog Availability', icon: '🐕' },
              { id: 'petpal-availability', label: 'PetPal Availability', icon: '🤝' },
              { id: 'my-availability', label: 'My Availability', icon: '📅' },
              { id: 'guidelines', label: 'Guidelines', icon: '📋' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'dog-availability' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Dogs Looking for Pals</h2>
              <Link
                href="/share-availability"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
              >
                Share Availability
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dogAvailabilityPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white rounded-xl p-6 shadow-md border border-gray-200"
                >
                  {/* Title */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{post.title}</h3>
                  
                  {/* Dog Information */}
                  {post.allDogs && post.allDogs.length > 0 && (
                    <div className="mb-4">
                      {post.allDogs.length === 1 ? (
                        // Single dog display
                        <div className="flex items-center space-x-3">
                          {post.allDogs[0].photo_url ? (
                            <img
                              src={post.allDogs[0].photo_url}
                              alt={post.allDogs[0].name}
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
                            {post.allDogs.map((dog, index) => (
                              <div key={dog.id} className="flex items-center space-x-2">
                                {dog.photo_url ? (
                                  <img
                                    src={dog.photo_url}
                                    alt={dog.name}
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
                  
                  {/* Location Information */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      {post.use_profile_location ? (
                        <>
                          {post.owner?.neighborhood && <span>{post.owner.neighborhood}, </span>}
                          {post.owner?.city && <span>{post.owner.city}</span>}
                        </>
                      ) : (
                        <>
                          {post.custom_location_neighborhood && <span>{post.custom_location_neighborhood}, </span>}
                          {post.custom_location_city && <span>{post.custom_location_city}</span>}
                        </>
                      )}
                    </p>
                  </div>
                  
                  {/* Available Schedule */}
                  <div className="mb-4">
                    {post.enabled_days && post.enabled_days.length > 0 && post.day_schedules && (
                      <div className="text-sm text-gray-600 space-y-1">
                        {formatAvailabilitySchedule(post.enabled_days, post.day_schedules).map((schedule, index) => (
                          <div key={index} className="flex items-center">
                            <span className="mr-2">📅</span>
                            <span>{schedule}</span>
                          </div>
                        ))}
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
                  
                  {/* Urgency Badge */}
                  {post.is_urgent && (
                    <div className="flex items-center text-sm text-red-600 mb-4">
                      <span className="mr-2">🚨</span>
                      Urgent
                    </div>
                  )}
                  
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex space-x-2">
                      <Link
                        href={`/community/availability/${post.id}`}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        View Details
                      </Link>

                      {user && user.id !== post.owner_id ? (
                        <button
                          onClick={() => {
                            console.log('Dog post owner data:', post.owner);
                            console.log('Dog post owner_id:', post.owner_id);
                            openMessageModal(post.owner, post);
                          }}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Send Message
                        </button>
                      ) : (
                        <div className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded">
                          {!user ? 'Not logged in' : 'Your post'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {dogAvailabilityPosts.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <div className="text-6xl mb-4">🐕</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No dogs available right now</h3>
                  <p className="text-gray-600 mb-4">Be the first to share your dog&apos;s availability!</p>
                  <Link
                    href="/share-availability"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                  >
                    Share Availability
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'petpal-availability' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">PetPals Available to Help</h2>
              <Link
                href="/share-availability"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
              >
                Share Availability
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {petpalAvailabilityPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white rounded-xl p-6 shadow-md border border-gray-200"
                >
                  {/* Title */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{post.title}</h3>
                  
                  {/* PetPal Information */}
                  <div className="flex items-center space-x-3 mb-4">
                    {post.owner?.profile_photo_url ? (
                      <img
                        src={post.owner.profile_photo_url}
                        alt={`${post.owner.first_name} ${post.owner.last_name}`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center">
                        🤝
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium">{post.owner?.first_name} {post.owner?.last_name}</h4>
                      <p className="text-sm text-gray-500">PetPal</p>
                    </div>
                  </div>
                  
                  {/* Location Information */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      {post.use_profile_location ? (
                        <>
                          {post.owner?.neighborhood && <span>{post.owner.neighborhood}, </span>}
                          {post.owner?.city && <span>{post.owner.city}</span>}
                        </>
                      ) : (
                        <>
                          {post.custom_location_neighborhood && <span>{post.custom_location_neighborhood}, </span>}
                          {post.custom_location_city && <span>{post.custom_location_city}</span>}
                        </>
                      )}
                    </p>
                  </div>
                  
                  {/* Available Schedule */}
                  <div className="mb-4">
                    {post.enabled_days && post.enabled_days.length > 0 && post.day_schedules && (
                      <div className="text-sm text-gray-600 space-y-1">
                        {formatAvailabilitySchedule(post.enabled_days, post.day_schedules).map((schedule, index) => (
                          <div key={index} className="flex items-center">
                            <span className="mr-2">📅</span>
                            <span>{schedule}</span>
                          </div>
                        ))}
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
                  
                  {/* Transportation Options */}
                  <div className="space-y-2 mb-4">
                    {post.can_pick_up_drop_off && (
                      <div className="flex items-center text-sm text-green-600">
                        <span className="mr-2">🚗</span>
                        Can pick up/drop off
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex space-x-2">
                      <Link
                        href={`/community/availability/${post.id}`}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        View Details
                      </Link>
                      {user && user.id !== post.owner_id && (
                        <button
                          onClick={() => {
                            console.log('Petpal post owner data:', post.owner);
                            console.log('Petpal post owner_id:', post.owner_id);
                            openMessageModal(post.owner, post);
                          }}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Send Message
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {petpalAvailabilityPosts.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <div className="text-6xl mb-4">🤝</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No PetPals available right now</h3>
                  <p className="text-gray-600 mb-4">Be the first to offer your help!</p>
                  <Link
                    href="/share-availability"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                  >
                    Share Availability
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'my-availability' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">My Availability Posts</h2>
              <Link
                href="/share-availability"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
              >
                Create New Post
              </Link>
            </div>
            
            {myAvailabilityPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myAvailabilityPosts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200"
                  >
                    {/* Title and Status */}
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{post.title}</h3>
                      <div className="flex flex-col items-end">
                        <p className={`text-sm ${post.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
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
                              <img
                                src={post.allDogs[0].photo_url}
                                alt={post.allDogs[0].name}
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
                              {post.allDogs.map((dog, index) => (
                                <div key={dog.id} className="flex items-center space-x-2">
                                  {dog.photo_url ? (
                                    <img
                                      src={dog.photo_url}
                                      alt={dog.name}
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        post.post_type === 'dog_available' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {post.post_type === 'dog_available' ? '🐕 Dog Available' : '🤝 PetPal Available'}
                      </span>
                    </div>
                    
                    {/* Available Schedule */}
                    <div className="mb-4">
                      {post.enabled_days && post.enabled_days.length > 0 && post.day_schedules && (
                        <div className="text-sm text-gray-600 space-y-1">
                          {formatAvailabilitySchedule(post.enabled_days, post.day_schedules).map((schedule, index) => (
                            <div key={index} className="flex items-center">
                              <span className="mr-2">📅</span>
                              <span>{schedule}</span>
                            </div>
                          ))}
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
                      <div className="flex justify-between items-center">
                        <Link
                          href={`/community/availability/${post.id}`}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          View Details
                        </Link>
                        <div className="flex space-x-2">
                          <Link
                            href={`/community/availability/${post.id}/edit`}
                            className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition-colors"
                          >
                            Edit
                          </Link>
                          <button 
                            onClick={() => deletePost(post.id)}
                            className={`bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors ${deletingPost === post.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={deletingPost === post.id}
                          >
                            {deletingPost === post.id ? 'Deleting...' : 'Delete'}
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
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No availability posts yet</h3>
                <p className="text-gray-600 mb-4">Start sharing your availability to connect with the community!</p>
                <Link
                  href="/share-availability"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                >
                  Create Your First Post
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'guidelines' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Community Guidelines</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">🤝</span>
                  Safety First
                </h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Always meet in public places first</li>
                  <li>• Bring your dog&apos;s vaccination records</li>
                  <li>• Use a secure leash and collar</li>
                  <li>• Supervise all interactions</li>
                  <li>• Trust your instincts</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">🐕</span>
                  Dog Etiquette
                </h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Keep dogs on leash unless in designated areas</li>
                  <li>• Clean up after your dog</li>
                  <li>• Respect other dogs&apos; space</li>
                  <li>• Monitor your dog&apos;s behavior</li>
                  <li>• Be mindful of noise levels</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">💬</span>
                  Communication
                </h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Be clear about expectations</li>
                  <li>• Respond to messages promptly</li>
                  <li>• Be honest about your experience</li>
                  <li>• Respect others&apos; time</li>
                  <li>• Report any concerns</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">🏆</span>
                  Building Trust
                </h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Start with short meetups</li>
                  <li>• Build relationships gradually</li>
                  <li>• Share positive experiences</li>
                  <li>• Give and receive feedback</li>
                  <li>• Support new members</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">🚨</span>
                Emergency Contacts
              </h3>
              <p className="text-gray-600 mb-4">
                In case of emergency, contact local authorities immediately. For non-emergency concerns, 
                use our support system to report issues.
              </p>
              <div className="flex space-x-4">
                <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                  Report Issue
                </button>
                <Link
                  href="/safety"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Safety Guide
                </Link>
              </div>
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
