'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/libs/supabase/client';
import UserReviews from '../../../../components/UserReviews';
import MessageModal from '../../../../components/MessageModal';

export default function AvailabilityDetailPage() {
  const params = useParams();
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messageModal, setMessageModal] = useState({
    isOpen: false,
    recipient: null,
    availabilityPost: null,
  });
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchAvailabilityDetails();
    }
  }, [params.id]);

  // Scroll detection for mobile sticky bar
  useEffect(() => {
    const handleScroll = () => {
      const contactButton = document.getElementById('contact-button');
      if (contactButton) {
        const rect = contactButton.getBoundingClientRect();
        const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
        setShowStickyBar(!isVisible);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state

    return () => window.removeEventListener('scroll', handleScroll);
  }, [availability]);

  const fetchAvailabilityDetails = async () => {
    try {
      const supabase = createClient();

      // First, get the current user to check if they're the owner
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let query = supabase
        .from('availability')
        .select(
          `
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
        `
        )
        .eq('id', params.id);

      // If user is not the owner, only show active posts
      if (!user) {
        query = query.eq('status', 'active');
      } else {
        // Check if user is the owner first
        const { data: postData } = await supabase
          .from('availability')
          .select('owner_id, status')
          .eq('id', params.id)
          .single();

        if (postData && postData.owner_id !== user.id) {
          // User is not the owner, only show active posts
          query = query.eq('status', 'active');
        }
        // If user is the owner, show the post regardless of status
      }

      const { data, error } = await query.single();

      if (data && !error) {
        // Fetch additional dogs if this post has multiple dogs
        if (data.dog_ids && data.dog_ids.length > 1) {
          const { data: additionalDogs, error: dogsError } = await supabase
            .from('dogs')
            .select(
              'id, name, breed, photo_url, size, birthday, age_years, age_months, gender, neutered, temperament, energy_level, dog_friendly, cat_friendly, kid_friendly, leash_trained, crate_trained, house_trained, fully_vaccinated, activities, description'
            )
            .in('id', data.dog_ids);

          if (!dogsError && additionalDogs) {
            data.allDogs = additionalDogs;
          }
        } else {
          data.allDogs = data.dog ? [data.dog] : [];
        }
      }

      if (error) {
        console.error('Error fetching availability:', error);
        // Check if the error is because the post is inactive
        if (error.code === 'PGRST116' || !data) {
          setError('This availability post is no longer active or has been removed.');
        } else {
          setError('Failed to load availability details');
        }
        return;
      }

      setAvailability(data);
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load availability details');
    } finally {
      setLoading(false);
    }
  };

  // const formatDate = (dateString) => {
  //   const date = new Date(dateString);
  //   return date.toLocaleDateString('en-US', {
  //     weekday: 'long',
  //     year: 'numeric',
  //     month: 'long',
  //     day: 'numeric',
  //     hour: '2-digit',
  //     minute: '2-digit',
  //   });
  // };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
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
      sunday: 'Sunday',
    };

    const formattedSchedule = [];

    enabledDays.forEach((day) => {
      const schedule = daySchedules[day];
      if (schedule && schedule.enabled && schedule.timeSlots) {
        const dayName = dayNames[day] || day.charAt(0).toUpperCase() + day.slice(1);
        const timeSlots = schedule.timeSlots
          .filter((slot) => slot.start && slot.end)
          .map((slot) => `${formatTime(slot.start)} - ${formatTime(slot.end)}`);

        if (timeSlots.length > 0) {
          formattedSchedule.push(`${dayName} ${timeSlots.join(', ')}`);
        }
      }
    });

    return formattedSchedule;
  };

  const openMessageModal = (recipient, availabilityPost) => {
    setMessageModal({
      isOpen: true,
      recipient,
      availabilityPost,
    });
    // TODO: Analytics - cta_message_primary_clicked { placement, post_id, recipient_id }
  };

  const closeMessageModal = () => {
    setMessageModal({
      isOpen: false,
      recipient: null,
      availabilityPost: null,
    });
  };

  // const getSizeIcon = (size) => {
  //   // Handle weight ranges
  //   if (size && size.includes('-')) {
  //     const weight = parseInt(size.split('-')[0]);
  //     if (weight <= 10) return '🐕';
  //     if (weight <= 25) return '🐕‍🦺';
  //     if (weight <= 40) return '🐕‍🦺';
  //     if (weight <= 70) return '🦮';
  //     if (weight <= 90) return '🦮';
  //     if (weight <= 110) return '🐺';
  //   }

  //   // Fallback for old size values or any other cases
  //   switch (size) {
  //     case 'small':
  //       return '🐕';
  //     case 'medium':
  //       return '🐕‍🦺';
  //     case 'large':
  //       return '🦮';
  //     case 'extra_large':
  //       return '🐺';
  //     default:
  //       return '🐕';
  //   }
  // };

  const getEnergyLevelColor = (level) => {
    switch (level) {
      case 'low':
        return 'text-green-600';
      case 'moderate':
        return 'text-yellow-600';
      case 'high':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTemperamentBadges = (temperament) => {
    if (!temperament || !Array.isArray(temperament)) return [];
    return temperament.map((trait) => ({
      text: trait,
      color: 'bg-blue-100 text-blue-800',
    }));
  };

  const getActivityBadges = (activities) => {
    if (!activities || !Array.isArray(activities)) return [];
    return activities.map((activity) => ({
      text: activity,
      color: 'bg-purple-100 text-purple-800',
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !availability) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Availability Not Found</h1>
          <p className="text-gray-600 mb-4">
            {error || 'This availability post could not be found.'}
          </p>
          <Link
            href="/community"
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
          >
            Back to Community
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/community"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <span className="mr-2">←</span>
            Back to Community
          </Link>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {availability.title}
              </h1>
              <div className="flex items-center space-x-4 text-gray-600">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    availability.post_type === 'dog_available'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {availability.post_type === 'dog_available'
                    ? '�� Dog Available'
                    : '🤝 PetPal Available'}
                </span>
                {availability.is_urgent && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    🚨 Urgent
                  </span>
                )}
              </div>
            </div>

            {/* Primary Message CTA - Desktop */}
            <div className="hidden lg:block">
              <button
                id="contact-button"
                onClick={() => openMessageModal(availability.owner, availability)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg"
                aria-label={`Message ${availability.owner?.first_name} about ${availability.allDogs?.[0]?.name || 'this post'}`}
              >
                💬 Message {availability.owner?.first_name}
              </button>
              {/* TODO: Analytics - cta_message_primary_viewed { placement: "header", device: "desktop" } */}
            </div>
          </div>
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
                {availability.enabled_days &&
                  availability.enabled_days.length > 0 &&
                  availability.day_schedules && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Available Schedule</h3>
                      <div className="text-gray-600 space-y-1">
                        {formatAvailabilitySchedule(
                          availability.enabled_days,
                          availability.day_schedules
                        ).map((schedule, index) => (
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
              </div>

              {availability.availability_notes && (
                <div className="mt-4">
                  <h3 className="font-medium text-gray-900 mb-2">Additional Notes</h3>
                  <p className="text-gray-600">{availability.availability_notes}</p>
                </div>
              )}

              {availability.special_instructions && (
                <div className="mt-4">
                  <h3 className="font-medium text-gray-900 mb-2">Special Instructions</h3>
                  <p className="text-gray-600">{availability.special_instructions}</p>
                </div>
              )}

              {availability.preferred_meeting_location && (
                <div className="mt-4">
                  <h3 className="font-medium text-gray-900 mb-2">Preferred Meeting Location</h3>
                  <p className="text-gray-600">{availability.preferred_meeting_location}</p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {availability.can_pick_up_drop_off && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    🚗 Can Pick Up/Drop Off
                  </span>
                )}
              </div>
            </div>

            {/* Dog Profile(s) (if applicable) */}
            {availability.allDogs && availability.allDogs.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">🐕</span>
                  {availability.allDogs.length === 1
                    ? `${availability.allDogs[0].name}'s Profile`
                    : 'Dogs Available'}
                </h2>

                {availability.allDogs.length === 1 ? (
                  // Single dog display
                  <div>
                    <div className="flex items-start space-x-6 mb-6">
                      {availability.allDogs[0].photo_url ? (
                        <img
                          src={availability.allDogs[0].photo_url}
                          alt={availability.allDogs[0].name}
                          className="w-24 h-24 rounded-full object-cover shadow-md"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-3xl shadow-md">
                          🐕
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                          {availability.allDogs[0].name}
                        </h3>
                        <p className="text-gray-600 mb-2">{availability.allDogs[0].breed}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                            {availability.allDogs[0].size &&
                            availability.allDogs[0].size.includes('-')
                              ? `${availability.allDogs[0].size} lbs`
                              : availability.allDogs[0].size}{' '}
                            size
                          </span>
                          {availability.allDogs[0].gender && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                              {availability.allDogs[0].gender}
                            </span>
                          )}
                          {availability.allDogs[0].neutered && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                              Neutered
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {availability.allDogs[0].description && (
                      <div className="mb-6">
                        <h4 className="font-medium text-gray-900 mb-2">
                          About {availability.allDogs[0].name}
                        </h4>
                        <p className="text-gray-600 leading-relaxed">
                          {availability.allDogs[0].description}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Characteristics</h4>
                        <div className="space-y-2">
                          {availability.allDogs[0].energy_level && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Energy Level:</span>
                              <span
                                className={`font-medium ${getEnergyLevelColor(availability.allDogs[0].energy_level)}`}
                              >
                                {availability.allDogs[0].energy_level}
                              </span>
                            </div>
                          )}
                          {availability.allDogs[0].age_years > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Age:</span>
                              <span className="font-medium text-gray-900">
                                {availability.allDogs[0].age_years} year
                                {availability.allDogs[0].age_years !== 1 ? 's' : ''}
                                {availability.allDogs[0].age_months > 0 &&
                                  ` ${availability.allDogs[0].age_months} month${availability.allDogs[0].age_months !== 1 ? 's' : ''}`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Compatibility</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Dog Friendly:</span>
                            <span
                              className={`font-medium ${availability.dog.dog_friendly ? 'text-green-600' : 'text-red-600'}`}
                            >
                              {availability.dog.dog_friendly ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Cat Friendly:</span>
                            <span
                              className={`font-medium ${availability.dog.cat_friendly ? 'text-green-600' : 'text-red-600'}`}
                            >
                              {availability.dog.cat_friendly ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Kid Friendly:</span>
                            <span
                              className={`font-medium ${availability.dog.kid_friendly ? 'text-green-600' : 'text-red-600'}`}
                            >
                              {availability.dog.kid_friendly ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {availability.dog.temperament && availability.dog.temperament.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-medium text-gray-900 mb-3">Temperament</h4>
                        <div className="flex flex-wrap gap-2">
                          {getTemperamentBadges(availability.dog.temperament).map(
                            (badge, index) => (
                              <span
                                key={index}
                                className={`px-3 py-1 rounded-full text-sm ${badge.color}`}
                              >
                                {badge.text}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {availability.dog.activities && availability.dog.activities.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-medium text-gray-900 mb-3">Activities</h4>
                        <div className="flex flex-wrap gap-2">
                          {getActivityBadges(availability.dog.activities).map((badge, index) => (
                            <span
                              key={index}
                              className={`px-3 py-1 rounded-full text-sm ${badge.color}`}
                            >
                              {badge.text}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-3">Training & Health</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center">
                          <span
                            className={`mr-2 ${availability.dog.leash_trained ? 'text-green-600' : 'text-gray-400'}`}
                          >
                            {availability.dog.leash_trained ? '✅' : '❌'}
                          </span>
                          <span className="text-sm text-gray-600">Leash Trained</span>
                        </div>
                        <div className="flex items-center">
                          <span
                            className={`mr-2 ${availability.dog.crate_trained ? 'text-green-600' : 'text-gray-400'}`}
                          >
                            {availability.dog.crate_trained ? '✅' : '❌'}
                          </span>
                          <span className="text-sm text-gray-600">Crate Trained</span>
                        </div>
                        <div className="flex items-center">
                          <span
                            className={`mr-2 ${availability.dog.house_trained ? 'text-green-600' : 'text-gray-400'}`}
                          >
                            {availability.dog.house_trained ? '✅' : '❌'}
                          </span>
                          <span className="text-sm text-gray-600">House Trained</span>
                        </div>
                        <div className="flex items-center">
                          <span
                            className={`mr-2 ${availability.dog.fully_vaccinated ? 'text-green-600' : 'text-gray-400'}`}
                          >
                            {availability.dog.fully_vaccinated ? '✅' : '❌'}
                          </span>
                          <span className="text-sm text-gray-600">Fully Vaccinated</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Multiple dogs display
                  <div className="space-y-6">
                    {availability.allDogs.map((dog) => (
                      <div key={dog.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start space-x-4 mb-4">
                          {dog.photo_url ? (
                            <img
                              src={dog.photo_url}
                              alt={dog.name}
                              className="w-16 h-16 rounded-full object-cover shadow-md"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-2xl shadow-md">
                              🐕
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{dog.name}</h3>
                            <p className="text-gray-600 mb-2">{dog.breed}</p>
                            <div className="flex flex-wrap gap-2">
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                                {dog.size && dog.size.includes('-') ? `${dog.size} lbs` : dog.size}{' '}
                                size
                              </span>
                              {dog.gender && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                                  {dog.gender}
                                </span>
                              )}
                              {dog.neutered && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                                  Neutered
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {dog.description && (
                          <div className="mb-4">
                            <h4 className="font-medium text-gray-900 mb-2">About {dog.name}</h4>
                            <p className="text-gray-600 leading-relaxed">{dog.description}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Characteristics</h4>
                            <div className="space-y-2">
                              {dog.energy_level && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Energy Level:</span>
                                  <span
                                    className={`font-medium ${getEnergyLevelColor(dog.energy_level)}`}
                                  >
                                    {dog.energy_level}
                                  </span>
                                </div>
                              )}
                              {dog.age_years > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Age:</span>
                                  <span className="text-sm text-gray-900">
                                    {dog.age_years} year{dog.age_years !== 1 ? 's' : ''}
                                    {dog.age_months > 0 &&
                                      ` ${dog.age_months} month${dog.age_months !== 1 ? 's' : ''}`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Compatibility</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Dog Friendly:</span>
                                <span
                                  className={`font-medium ${dog.dog_friendly ? 'text-green-600' : 'text-red-600'}`}
                                >
                                  {dog.dog_friendly ? 'Yes' : 'No'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Cat Friendly:</span>
                                <span
                                  className={`font-medium ${dog.cat_friendly ? 'text-green-600' : 'text-red-600'}`}
                                >
                                  {dog.cat_friendly ? 'Yes' : 'No'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Kid Friendly:</span>
                                <span
                                  className={`font-medium ${dog.kid_friendly ? 'text-green-600' : 'text-red-600'}`}
                                >
                                  {dog.kid_friendly ? 'Yes' : 'No'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {dog.temperament && dog.temperament.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-medium text-gray-900 mb-2">Temperament</h4>
                            <div className="flex flex-wrap gap-2">
                              {getTemperamentBadges(dog.temperament).map((badge, index) => (
                                <span
                                  key={index}
                                  className={`px-3 py-1 rounded-full text-sm ${badge.color}`}
                                >
                                  {badge.text}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {dog.activities && dog.activities.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-medium text-gray-900 mb-2">Activities</h4>
                            <div className="flex flex-wrap gap-2">
                              {getActivityBadges(dog.activities).map((badge, index) => (
                                <span
                                  key={index}
                                  className={`px-3 py-1 rounded-full text-sm ${badge.color}`}
                                >
                                  {badge.text}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="font-medium text-gray-900 mb-2">Training & Health</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center">
                              <span
                                className={`mr-2 ${dog.leash_trained ? 'text-green-600' : 'text-gray-400'}`}
                              >
                                {dog.leash_trained ? '✅' : '❌'}
                              </span>
                              <span className="text-sm text-gray-600">Leash Trained</span>
                            </div>
                            <div className="flex items-center">
                              <span
                                className={`mr-2 ${dog.crate_trained ? 'text-green-600' : 'text-gray-400'}`}
                              >
                                {dog.crate_trained ? '✅' : '❌'}
                              </span>
                              <span className="text-sm text-gray-600">Crate Trained</span>
                            </div>
                            <div className="flex items-center">
                              <span
                                className={`mr-2 ${dog.house_trained ? 'text-green-600' : 'text-gray-400'}`}
                              >
                                {dog.house_trained ? '✅' : '❌'}
                              </span>
                              <span className="text-sm text-gray-600">House Trained</span>
                            </div>
                            <div className="flex items-center">
                              <span
                                className={`mr-2 ${dog.fully_vaccinated ? 'text-green-600' : 'text-gray-400'}`}
                              >
                                {dog.fully_vaccinated ? '✅' : '❌'}
                              </span>
                              <span className="text-sm text-gray-600">Fully Vaccinated</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar - Owner Profile */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">👤</span>
                {availability.post_type === 'dog_available'
                  ? 'About the Owner'
                  : 'About the PetPal'}
              </h2>

              <div className="text-center mb-6">
                {availability.owner?.profile_photo_url ? (
                  <img
                    src={availability.owner.profile_photo_url}
                    alt={`${availability.owner.first_name} ${availability.owner.last_name}`}
                    className="w-20 h-20 rounded-full object-cover shadow-md mx-auto mb-4"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center text-2xl shadow-md mx-auto mb-4">
                    👤
                  </div>
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  {availability.owner?.first_name} {availability.owner?.last_name}
                </h3>
                <p className="text-gray-600">
                  {availability.owner?.neighborhood}, {availability.owner?.city}
                </p>
                {availability.owner?.role && (
                  <p className="text-sm text-gray-500 mt-1">
                    {availability.owner.role.replace('_', ' ')}
                  </p>
                )}
              </div>

              {availability.owner?.bio && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Bio</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">{availability.owner.bio}</p>
                </div>
              )}

              {availability.owner?.community_support_badge && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Community Support</h4>
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3 border border-green-200">
                    <div className="flex items-center mb-2">
                      <span className="text-green-600 mr-2">🏆</span>
                      <span className="font-medium text-green-800">
                        {availability.owner.community_support_badge}
                      </span>
                    </div>
                    {availability.owner.support_story && (
                      <p className="text-sm text-green-700">{availability.owner.support_story}</p>
                    )}
                  </div>
                </div>
              )}

              {availability.owner?.support_preferences &&
                availability.owner.support_preferences.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-2">Support Preferences</h4>
                    <div className="flex flex-wrap gap-2">
                      {availability.owner.support_preferences.map((pref, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                        >
                          {pref}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Social Links */}
              {(availability.owner?.facebook_url ||
                availability.owner?.instagram_url ||
                availability.owner?.linkedin_url ||
                availability.owner?.airbnb_url ||
                availability.owner?.other_social_url) && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Social Links</h4>
                  <div className="space-y-2">
                    {availability.owner.facebook_url && (
                      <a
                        href={availability.owner.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
                      >
                        <span className="mr-2">📘</span>
                        Facebook
                      </a>
                    )}
                    {availability.owner.instagram_url && (
                      <a
                        href={availability.owner.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-pink-600 hover:text-pink-700 text-sm"
                      >
                        <span className="mr-2">📷</span>
                        Instagram
                      </a>
                    )}
                    {availability.owner.linkedin_url && (
                      <a
                        href={availability.owner.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-blue-700 hover:text-blue-800 text-sm"
                      >
                        <span className="mr-2">💼</span>
                        LinkedIn
                      </a>
                    )}
                    {availability.owner.airbnb_url && (
                      <a
                        href={availability.owner.airbnb_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-pink-500 hover:text-pink-600 text-sm"
                      >
                        <span className="mr-2">🏠</span>
                        Airbnb
                      </a>
                    )}
                    {availability.owner.other_social_url && (
                      <a
                        href={availability.owner.other_social_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-gray-600 hover:text-gray-700 text-sm"
                      >
                        <span className="mr-2">🔗</span>
                        Other
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => openMessageModal(availability.owner, availability)}
                  className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                >
                  💬 Contact Owner
                </button>
              </div>
            </div>

            {/* Owner Reviews */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">⭐</span>
                Reviews
              </h2>
              <UserReviews userId={availability.owner?.id} showAll={false} />
            </div>

            {/* Safety Reminder */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center">
                <span className="mr-2">🛡️</span>
                Safety First
              </h3>
              <ul className="space-y-2 text-sm text-yellow-700">
                <li>• Always meet in public places first</li>
                <li>• Bring your dog&apos;s vaccination records</li>
                <li>• Use a secure leash and collar</li>
                <li>• Supervise all interactions</li>
                <li>• Trust your instincts</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Action Bar */}
      {showStickyBar && !messageModal.isOpen && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40 lg:hidden"
          style={{ paddingBottom: `calc(1rem + env(safe-area-inset-bottom))` }}
        >
          <button
            onClick={() => openMessageModal(availability.owner, availability)}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg"
            aria-label={`Message ${availability.owner?.first_name} about ${availability.allDogs?.[0]?.name || 'this post'}`}
          >
            💬 Message {availability.owner?.first_name}
          </button>
          {/* TODO: Analytics - cta_message_primary_viewed { placement: "sticky", device: "mobile" } */}
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
  );
}
