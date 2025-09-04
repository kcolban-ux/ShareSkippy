'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseAuth } from '@/libs/supabase/hooks';
import { createClient } from '@/libs/supabase/client';
import AppLayout from '@/components/AppLayout';
import Button from '@/components/ui/Button';
import Section from '@/components/ui/Section';
import MessageModal from '@/components/MessageModal';

export default function EditAvailability() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  
  // Data states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [messageModal, setMessageModal] = useState({ isOpen: false, recipient: null, availabilityPost: null });

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/signin');
      return;
    }
    
    if (params.id) {
      fetchAvailabilityDetails();
    }
  }, [user, authLoading, router, params.id]);

  const fetchAvailabilityDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('availability')
        .select(`
          *,
          owner:profiles!availability_owner_id_fkey (
            id,
            first_name,
            last_name,
            profile_photo_url,
            neighborhood,
            city,
            bio,
            role,
            community_support_badge,
            support_preferences,
            support_story,
            other_support_description,
            facebook_url,
            instagram_url,
            linkedin_url,
            airbnb_url,
            other_social_url
          ),
          dog:dogs!availability_dog_id_fkey (
            id,
            name,
            breed,
            photo_url,
            size,
            birthday,
            age_years,
            age_months,
            gender,
            neutered,
            temperament,
            energy_level,
            dog_friendly,
            cat_friendly,
            kid_friendly,
            leash_trained,
            crate_trained,
            house_trained,
            fully_vaccinated,
            activities,
            description
          )
        `)
        .eq('id', params.id)
        .single();

      if (error) {
        console.error('Error fetching availability:', error);
        setError('Failed to fetch availability details');
        return;
      }

      if (!data) {
        setError('Availability not found');
        return;
      }

      // Fetch additional dogs if this post has multiple dogs
      if (data.dog_ids && data.dog_ids.length > 1) {
        const { data: additionalDogs, error: dogsError } = await supabase
          .from('dogs')
          .select('id, name, breed, photo_url, size, birthday, age_years, age_months, gender, neutered, temperament, energy_level, dog_friendly, cat_friendly, kid_friendly, leash_trained, crate_trained, house_trained, fully_vaccinated, activities, description')
          .in('id', data.dog_ids);
        
        if (!dogsError && additionalDogs) {
          data.allDogs = additionalDogs;
        }
      } else {
        data.allDogs = data.dog ? [data.dog] : [];
      }

      setAvailability(data);

    } catch (error) {
      console.error('Error fetching availability:', error);
      setError('Failed to fetch availability details');
    } finally {
      setLoading(false);
    }
  };

  const openMessageModal = (recipient, availabilityPost) => {
    console.log('Opening message modal with:', { recipient, availabilityPost });
    
    // Validate that we have the required data
    if (!recipient) {
      console.error('Cannot open message modal: recipient is missing');
      alert('Unable to send message: recipient information is missing. Please try again.');
      return;
    }
    
    if (!availabilityPost) {
      console.error('Cannot open message modal: availabilityPost is missing');
      alert('Unable to send message: post information is missing. Please try again.');
      return;
    }
    
    setMessageModal({ isOpen: true, recipient, availabilityPost });
  };

  const closeMessageModal = () => {
    setMessageModal({ isOpen: false, recipient: null, availabilityPost: null });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
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
    
    return enabledDays.map(day => {
      const schedule = daySchedules[day];
      if (!schedule || !schedule.timeSlots) return `${dayNames[day]}: Not specified`;
      
      const timeSlots = schedule.timeSlots
        .filter(slot => slot.start && slot.end)
        .map(slot => `${formatTime(slot.start)} - ${formatTime(slot.end)}`)
        .join(', ');
      
      return `${dayNames[day]}: ${timeSlots || 'Not specified'}`;
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading availability details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!availability) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Availability Not Found</h1>
            <p className="text-gray-600 mb-6">The availability post you're looking for doesn't exist.</p>
            <Button onClick={() => router.push('/community')}>Back to Community</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        <Section>
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <Button 
                onClick={() => router.back()}
                className="mb-4 bg-gray-500 hover:bg-gray-600 text-white"
              >
                ← Back
              </Button>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {availability.post_type === 'dog_available' ? '🐕' : '🤝'} {availability.title}
              </h1>
              <p className="text-gray-600">Posted by {availability.owner?.first_name} {availability.owner?.last_name}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Availability Details */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">📅</span>
                    Availability Details
                  </h2>
                  
                  {availability.description && (
                    <div className="mb-6">
                      <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                      <p className="text-gray-600 leading-relaxed">{availability.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availability.enabled_days && availability.enabled_days.length > 0 && availability.day_schedules && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Available Schedule</h3>
                        <div className="text-gray-600 space-y-1">
                          {formatAvailabilitySchedule(availability.enabled_days, availability.day_schedules).map((schedule, index) => (
                            <div key={index} className="text-sm">
                              {schedule}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {availability.start_time && availability.end_time && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Time Range</h3>
                        <p className="text-gray-600">
                          {formatTime(availability.start_time)} - {formatTime(availability.end_time)}
                        </p>
                      </div>
                    )}

                    {availability.duration_minutes && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Duration</h3>
                        <p className="text-gray-600">{availability.duration_minutes} minutes</p>
                      </div>
                    )}

                    {availability.is_urgent && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">⚠️ Urgent</h3>
                        <p className="text-gray-600">{availability.urgency_notes || 'This is an urgent request'}</p>
                      </div>
                    )}

                    {availability.can_pick_up_drop_off && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">🚗 Transportation</h3>
                        <p className="text-gray-600">Can pick up and drop off</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dogs Section */}
                {availability.post_type === 'dog_available' && availability.allDogs && availability.allDogs.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="mr-2">🐕</span>
                      Available Dogs
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {availability.allDogs.map((dog) => (
                        <div key={dog.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center space-x-4 mb-4">
                            {dog.photo_url ? (
                              <img
                                src={dog.photo_url}
                                alt={dog.name}
                                className="w-16 h-16 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-2xl">🐕</span>
                              </div>
                            )}
                            <div>
                              <h3 className="font-semibold text-gray-900">{dog.name}</h3>
                              <p className="text-gray-600">{dog.breed || 'Mixed breed'}</p>
                              <p className="text-sm text-gray-500">{dog.size} • {dog.gender}</p>
                            </div>
                          </div>
                          
                          {dog.description && (
                            <p className="text-gray-600 text-sm mb-3">{dog.description}</p>
                          )}
                          
                          <div className="flex flex-wrap gap-2">
                            {dog.temperament && dog.temperament.map((trait, index) => (
                              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                {trait}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Community Support */}
                {availability.community_support_enabled && (
                  <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="mr-2">🤝</span>
                      Community Support
                    </h2>
                    
                    {availability.support_story && (
                      <div className="mb-4">
                        <h3 className="font-medium text-gray-900 mb-2">Support Story</h3>
                        <p className="text-gray-600">{availability.support_story}</p>
                      </div>
                    )}
                    
                    {availability.support_preferences && availability.support_preferences.length > 0 && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Support Preferences</h3>
                        <div className="flex flex-wrap gap-2">
                          {availability.support_preferences.map((pref, index) => (
                            <span key={index} className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                              {pref}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Owner Info */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">👤</span>
                    Owner
                  </h2>
                  
                  <div className="flex items-center space-x-4 mb-4">
                    {availability.owner?.profile_photo_url ? (
                      <img
                        src={availability.owner.profile_photo_url}
                        alt={`${availability.owner.first_name} ${availability.owner.last_name}`}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-2xl font-medium text-gray-600">
                        {availability.owner?.first_name?.[0] || '👤'}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {availability.owner?.first_name} {availability.owner?.last_name}
                      </h3>
                      <p className="text-gray-600">{availability.owner?.role || 'Pet Owner'}</p>
                      {availability.owner?.neighborhood && availability.owner?.city && (
                        <p className="text-sm text-gray-500">
                          {availability.owner.neighborhood}, {availability.owner.city}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {availability.owner?.bio && (
                    <p className="text-gray-600 text-sm mb-4">{availability.owner.bio}</p>
                  )}
                  
                  {availability.owner?.community_support_badge && (
                    <div className="flex items-center space-x-2 mb-4">
                      <span className="text-yellow-500">⭐</span>
                      <span className="text-sm font-medium text-gray-900">
                        {availability.owner.community_support_badge}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Take Action</h2>
                  
                  <div className="space-y-3">
                    <Button
                      onClick={() => openMessageModal(availability.owner, availability)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                    >
                      💬 Send Message
                    </Button>
                    
                    <Button
                      onClick={() => {
                        // For now, just open the message modal
                        // In the future, this could be a direct adoption action
                        openMessageModal(availability.owner, availability);
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
                    >
                      🏠 Adopt This Opportunity
                    </Button>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 text-center">
                      Posted {formatDate(availability.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Message Modal */}
        <MessageModal
          isOpen={messageModal.isOpen}
          onClose={closeMessageModal}
          recipient={messageModal.recipient}
          availabilityPost={messageModal.availabilityPost}
        />
      </div>
    </AppLayout>
  );
}
