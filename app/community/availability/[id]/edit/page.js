'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import { createClient } from '@/libs/supabase/client';
import { useSupabaseAuth } from '@/libs/supabase/hooks';

export default function EditAvailability() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  // Data states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [availability, setAvailability] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    availability_notes: '',
    special_instructions: '',
    is_urgent: false,
    urgency_notes: '',
    can_pick_up_drop_off: false,
    preferred_meeting_location: '',
    enabled_days: [],
    day_schedules: {},
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/signin');
      return;
    }

    if (params.id) {
      fetchAvailabilityDetails();
    }
  }, [user, authLoading, router, params.id, fetchAvailabilityDetails]);

  const fetchAvailabilityDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
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
        .eq('id', params.id)
        .single();

      if (error) {
        console.error('Error fetching availability:', error);
        setError('Failed to load availability details');
        return;
      }

      if (!data) {
        setError('Availability not found');
        return;
      }

      // Check if user owns this availability
      if (data.owner_id !== user.id) {
        setError('You can only edit your own availability posts');
        return;
      }

      setAvailability(data);

      // Populate form data
      setFormData({
        title: data.title || '',
        description: data.description || '',
        availability_notes: data.availability_notes || '',
        special_instructions: data.special_instructions || '',
        is_urgent: data.is_urgent || false,
        urgency_notes: data.urgency_notes || '',
        can_pick_up_drop_off: data.can_pick_up_drop_off || false,
        preferred_meeting_location: data.preferred_meeting_location || '',
        enabled_days: data.enabled_days || [],
        day_schedules: data.day_schedules || {},
      });
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load availability details');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleDayToggle = (day) => {
    setFormData((prev) => {
      const newEnabledDays = prev.enabled_days.includes(day)
        ? prev.enabled_days.filter((d) => d !== day)
        : [...prev.enabled_days, day];

      return {
        ...prev,
        enabled_days: newEnabledDays,
      };
    });
  };

  const handleTimeSlotChange = (day, slotIndex, field, value) => {
    setFormData((prev) => {
      const newDaySchedules = { ...prev.day_schedules };
      if (!newDaySchedules[day]) {
        newDaySchedules[day] = { enabled: true, timeSlots: [] };
      }
      if (!newDaySchedules[day].timeSlots[slotIndex]) {
        newDaySchedules[day].timeSlots[slotIndex] = { start: '', end: '' };
      }
      newDaySchedules[day].timeSlots[slotIndex][field] = value;

      return {
        ...prev,
        day_schedules: newDaySchedules,
      };
    });
  };

  const addTimeSlot = (day) => {
    setFormData((prev) => {
      const newDaySchedules = { ...prev.day_schedules };
      if (!newDaySchedules[day]) {
        newDaySchedules[day] = { enabled: true, timeSlots: [] };
      }
      newDaySchedules[day].timeSlots.push({ start: '', end: '' });

      return {
        ...prev,
        day_schedules: newDaySchedules,
      };
    });
  };

  const removeTimeSlot = (day, slotIndex) => {
    setFormData((prev) => {
      const newDaySchedules = { ...prev.day_schedules };
      if (newDaySchedules[day] && newDaySchedules[day].timeSlots) {
        newDaySchedules[day].timeSlots.splice(slotIndex, 1);
      }

      return {
        ...prev,
        day_schedules: newDaySchedules,
      };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const { error } = await supabase
        .from('availability')
        .update({
          title: formData.title,
          description: formData.description,
          availability_notes: formData.availability_notes,
          special_instructions: formData.special_instructions,
          is_urgent: formData.is_urgent,
          urgency_notes: formData.urgency_notes,
          can_pick_up_drop_off: formData.can_pick_up_drop_off,
          preferred_meeting_location: formData.preferred_meeting_location,
          enabled_days: formData.enabled_days,
          day_schedules: formData.day_schedules,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id);

      if (error) {
        console.error('Error updating availability:', error);
        setError('Failed to save changes');
        return;
      }

      // Redirect back to the availability detail page
      router.push(`/community/availability/${params.id}`);
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/community/availability/${params.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading availability details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button
            onClick={() => router.push('/community')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
          >
            Back to Community
          </Button>
        </div>
      </div>
    );
  }

  if (!availability) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Availability Not Found</h1>
          <p className="text-gray-600 mb-4">This availability post could not be found.</p>
          <Button
            onClick={() => router.push('/community')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
          >
            Back to Community
          </Button>
        </div>
      </div>
    );
  }

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayNames = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/community/availability/${params.id}`)}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <span className="mr-2">←</span>
            Back to Availability
          </button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Edit: {formData.title || availability?.title}
          </h1>
          <div className="flex items-center space-x-4 text-gray-600">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                availability?.post_type === 'dog_available'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {availability?.post_type === 'dog_available'
                ? '🐕 Dog Available'
                : '🤝 PetPal Available'}
            </span>
            {formData.is_urgent && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                🚨 Urgent
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSave}>
              {/* Availability Details */}
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">📅</span>
                  Availability Details
                </h2>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      placeholder="Enter a title for your availability"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      placeholder="Describe what you're offering or looking for"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="availability_notes"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Additional Notes
                    </label>
                    <textarea
                      id="availability_notes"
                      name="availability_notes"
                      value={formData.availability_notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      placeholder="Any additional notes about your availability"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="special_instructions"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Special Instructions
                    </label>
                    <textarea
                      id="special_instructions"
                      name="special_instructions"
                      value={formData.special_instructions}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      placeholder="Any special instructions for potential matches"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="preferred_meeting_location"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Preferred Meeting Location
                    </label>
                    <input
                      type="text"
                      id="preferred_meeting_location"
                      name="preferred_meeting_location"
                      value={formData.preferred_meeting_location}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      placeholder="Where would you prefer to meet?"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="can_pick_up_drop_off"
                      name="can_pick_up_drop_off"
                      checked={formData.can_pick_up_drop_off}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="can_pick_up_drop_off"
                      className="ml-2 block text-sm font-medium text-gray-700"
                    >
                      Can pick up and drop off
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_urgent"
                      name="is_urgent"
                      checked={formData.is_urgent}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="is_urgent"
                      className="ml-2 block text-sm font-medium text-gray-700"
                    >
                      Mark as urgent
                    </label>
                  </div>

                  {formData.is_urgent && (
                    <div>
                      <label
                        htmlFor="urgency_notes"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Urgency Notes
                      </label>
                      <textarea
                        id="urgency_notes"
                        name="urgency_notes"
                        value={formData.urgency_notes}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        placeholder="Explain why this is urgent"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Available Dogs (if applicable) */}
              {availability?.allDogs && availability.allDogs.length > 0 && (
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
                                  className={`font-medium ${
                                    availability.allDogs[0].energy_level === 'low'
                                      ? 'text-green-600'
                                      : availability.allDogs[0].energy_level === 'moderate'
                                        ? 'text-yellow-600'
                                        : availability.allDogs[0].energy_level === 'high'
                                          ? 'text-red-600'
                                          : 'text-gray-600'
                                  }`}
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
                                className={`font-medium ${availability.allDogs[0].dog_friendly ? 'text-green-600' : 'text-red-600'}`}
                              >
                                {availability.allDogs[0].dog_friendly ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Cat Friendly:</span>
                              <span
                                className={`font-medium ${availability.allDogs[0].cat_friendly ? 'text-green-600' : 'text-red-600'}`}
                              >
                                {availability.allDogs[0].cat_friendly ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Kid Friendly:</span>
                              <span
                                className={`font-medium ${availability.allDogs[0].kid_friendly ? 'text-green-600' : 'text-red-600'}`}
                              >
                                {availability.allDogs[0].kid_friendly ? 'Yes' : 'No'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Multiple dogs display
                    <div className="space-y-6">
                      {availability.allDogs.map((dog, index) => (
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
                                  {dog.size && dog.size.includes('-')
                                    ? `${dog.size} lbs`
                                    : dog.size}{' '}
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
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Schedule Section */}
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">⏰</span>
                  Schedule
                </h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Available Days
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {days.map((day) => (
                        <div key={day} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`day-${day}`}
                            checked={formData.enabled_days.includes(day)}
                            onChange={() => handleDayToggle(day)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label
                            htmlFor={`day-${day}`}
                            className="ml-2 block text-sm font-medium text-gray-700"
                          >
                            {dayNames[day]}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {formData.enabled_days.map((day) => (
                    <div key={day} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-3">{dayNames[day]} Time Slots</h3>

                      {(formData.day_schedules[day]?.timeSlots || []).map((slot, slotIndex) => (
                        <div key={slotIndex} className="flex items-center space-x-3 mb-3">
                          <input
                            type="time"
                            value={slot.start}
                            onChange={(e) =>
                              handleTimeSlotChange(day, slotIndex, 'start', e.target.value)
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          />
                          <span className="text-gray-500">to</span>
                          <input
                            type="time"
                            value={slot.end}
                            onChange={(e) =>
                              handleTimeSlotChange(day, slotIndex, 'end', e.target.value)
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => removeTimeSlot(day, slotIndex)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => addTimeSlot(day)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        + Add Time Slot
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>

          {/* Sidebar - Owner Profile */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">👤</span>
                {availability?.post_type === 'dog_available'
                  ? 'About the Owner'
                  : 'About the PetPal'}
              </h2>

              <div className="text-center mb-6">
                {availability?.owner?.profile_photo_url ? (
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
                  {availability?.owner?.first_name} {availability?.owner?.last_name}
                </h3>
                <p className="text-gray-600">
                  {availability?.owner?.neighborhood}, {availability?.owner?.city}
                </p>
                {availability?.owner?.role && (
                  <p className="text-sm text-gray-500 mt-1">
                    {availability.owner.role.replace('_', ' ')}
                  </p>
                )}
              </div>

              {availability?.owner?.bio && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Bio</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">{availability.owner.bio}</p>
                </div>
              )}

              {availability?.owner?.community_support_badge && (
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

              {availability?.owner?.support_preferences &&
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
              {(availability?.owner?.facebook_url ||
                availability?.owner?.instagram_url ||
                availability?.owner?.linkedin_url ||
                availability?.owner?.airbnb_url ||
                availability?.owner?.other_social_url) && (
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
                <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium">
                  Contact Owner
                </button>
              </div>
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
    </div>
  );
}
