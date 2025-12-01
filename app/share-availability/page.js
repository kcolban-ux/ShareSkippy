'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CommunitySupportSection from '@/components/CommunitySupportSection';
import { useUserProfile, useUserDogs } from '@/hooks/useProfile';
import { createClient } from '@/libs/supabase/client';
import { formatLocation } from '@/libs/utils';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';

// #region Component
/**
 * @description Page component for users to create and share their availability
 * for dog playdates or for offering petpal services.
 */
export default function ShareAvailability() {
  // #region State & Hooks
  // --- Auth logic is now handled by the protected route hook ---
  const { user, isLoading: authLoading } = useProtectedRoute();
  const router = useRouter();
  const supabase = createClient();

  // --- Data Fetching Hooks ---
  const { data: userProfile, isLoading: profileLoading } = useUserProfile();
  const { data, isLoading: dogsLoading } = useUserDogs();

  /**
   * @description Array of the user's dogs. Defined early to prevent runtime errors.
   */
  const dogs = data || [];

  // --- Page/UI State ---
  const [currentStep, setCurrentStep] = useState(1);
  const [postType, setPostType] = useState(null);
  const [selectedDogs, setSelectedDogs] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // --- Scheduling State ---
  const [selectedDays, setSelectedDays] = useState([]);
  const [daySchedules, setDaySchedules] = useState({
    monday: { enabled: false, timeSlots: [{ start: '', end: '' }] },
    tuesday: { enabled: false, timeSlots: [{ start: '', end: '' }] },
    wednesday: { enabled: false, timeSlots: [{ start: '', end: '' }] },
    thursday: { enabled: false, timeSlots: [{ start: '', end: '' }] },
    friday: { enabled: false, timeSlots: [{ start: '', end: '' }] },
    saturday: { enabled: false, timeSlots: [{ start: '', end: '' }] },
    sunday: { enabled: false, timeSlots: [{ start: '', end: '' }] },
  });

  // --- Form Data State ---
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    availability_notes: '',
    special_instructions: '',
    is_urgent: false,
    urgency_notes: '',
    can_pick_up_drop_off: false,
    preferred_meeting_location: '',
    use_profile_location: true,
    custom_location_address: '',
    custom_location_neighborhood: '',
    custom_location_city: '',
    custom_location_state: '',
    custom_location_zip_code: '',
    custom_location_lat: null,
    custom_location_lng: null,
    community_support_enabled: false,
    support_preferences: [],
    flexible_scheduling_needed: false,
    support_story: '',
    need_extra_help: false,
    help_reason_elderly: false,
    help_reason_sick: false,
    help_reason_low_income: false,
    help_reason_disability: false,
    help_reason_single_parent: false,
    help_reason_other: false,
    help_reason_other_text: '',
    help_context: '',
    open_to_helping_others: false,
    can_help_everyone: false,
    can_help_elderly: false,
    can_help_sick: false,
    can_help_low_income: false,
    can_help_disability: false,
    can_help_single_parent: false,
    helping_others_context: '',
  });

  const [verifyingCustomAddress, setVerifyingCustomAddress] = useState(false);
  const [addressVerified, setAddressVerified] = useState(false);

  // --- Auth redirection useEffect is now removed ---
  // const authRedirectionEffect = ... (DELETED)
  // #endregion

  // #region Handlers
  /**
   * @description Verifies a custom address using the OpenStreetMap Nominatim API.
   */
  const verifyCustomAddress = async () => {
    if (
      !formData.custom_location_address.trim() ||
      !formData.custom_location_city.trim() ||
      !formData.custom_location_state.trim() ||
      !formData.custom_location_zip_code.trim()
    ) {
      setError('Please fill in all address fields');
      return;
    }

    setVerifyingCustomAddress(true);
    try {
      const fullAddress = `${formData.custom_location_address}, ${formData.custom_location_city}, ${formData.custom_location_state} ${formData.custom_location_zip_code}`;

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          fullAddress
        )}&limit=1&addressdetails=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        // Pick area (first available) with mid-sized labels preferred:
        const area =
          result.address.suburb ||
          result.address.city_district ||
          result.address.borough ||
          result.address.quarter ||
          result.address.ward ||
          result.address.district ||
          result.address.neighborhood || // US spelling
          result.address.neighbourhood || // Intl spelling
          result.address.locality ||
          result.address.residential ||
          '';

        // Always pick a city string (fallback chain):
        const city =
          result.address.city ||
          result.address.town ||
          result.address.village ||
          result.address.municipality ||
          result.address.hamlet ||
          '';

        const state = result.address.state || '';

        const formatted = formatLocation({
          neighborhood: area || '',
          city,
          state,
        });

        // Update form data with verified location
        setFormData((prev) => ({
          ...prev,
          custom_location_lat: lat,
          custom_location_lng: lng,
          custom_location_neighborhood: formatted.neighborhood,
          custom_location_city: formatted.city,
          custom_location_state: formatted.state,
        }));

        setError(null);
        setAddressVerified(true);
      } else {
        setError('Address not found. Please check your address details.');
      }
    } catch (error) {
      console.error('Error verifying address:', error);
      setError('Failed to verify address. Please try again.');
    } finally {
      setVerifyingCustomAddress(false);
    }
  };

  /**
   * @description Sets the post type and advances to the next step,
   * checking if dogs exist for 'dog_available' type.
   */
  const handlePostTypeSelect = (type) => {
    setPostType(type);
    if (type === 'dog_available' && dogs.length === 0) {
      setError('You need to add a dog to your profile before sharing dog availability.');
      return;
    }
    setError(null); // Clear error on successful selection
    setCurrentStep(2);
  };

  /**
   * @description Toggles a dog's ID in the selectedDogs array.
   */
  const handleDogSelection = (dogId) => {
    setSelectedDogs((prev) =>
      prev.includes(dogId) ? prev.filter((id) => id !== dogId) : [...prev, dogId]
    );
  };

  /**
   * @description Updates a single field in the main form data state.
   */
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Reset address verification if custom location fields change
    if (
      field === 'use_profile_location' ||
      field === 'custom_location_address' ||
      field === 'custom_location_city' ||
      field === 'custom_location_state' ||
      field === 'custom_location_zip_code'
    ) {
      setAddressVerified(false);
    }
  };

  /**
   * @description A dedicated handler for checkbox inputs.
   */
  const handleCheckboxChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * @description Callback for the CommunitySupportSection to update the form data.
   */
  const handleFormDataChange = (newFormData) => {
    setFormData(newFormData);
  };

  /**
   * @description Toggles a day's 'enabled' status in the schedule.
   */
  const toggleDay = (day) => {
    setDaySchedules((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
      },
    }));

    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  /**
   * @description Adds a new empty time slot to a specific day.
   */
  const addTimeSlot = (day) => {
    setDaySchedules((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: [...prev[day].timeSlots, { start: '', end: '' }],
      },
    }));
  };

  /**
   * @description Removes a time slot from a day by its index.
   */
  const removeTimeSlot = (day, index) => {
    // Keep at least one time slot
    if (daySchedules[day].timeSlots.length <= 1) return;

    setDaySchedules((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: prev[day].timeSlots.filter((_, i) => i !== index),
      },
    }));
  };

  /**
   * @description Updates the 'start' or 'end' value of a specific time slot.
   */
  const updateTimeSlot = (day, index, field, value) => {
    setDaySchedules((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: prev[day].timeSlots.map((slot, i) =>
          i === index ? { ...slot, [field]: value } : slot
        ),
      },
    }));
  };

  /**
   * @description Validates that all selected days have valid time slots.
   */
  const validateTimeSlots = () => {
    for (const day of selectedDays) {
      const daySchedule = daySchedules[day];
      if (!daySchedule.enabled) continue;

      for (const slot of daySchedule.timeSlots) {
        if (!slot.start || !slot.end) {
          setError(`Please fill in all time slots for ${day}.`);
          return false;
        }
        if (slot.start >= slot.end) {
          setError(`End time must be after start time for ${day}.`);
          return false;
        }
      }
    }
    return true;
  };

  /**
   * @description Main handler for form submission.
   * Validates, prepares, and inserts the availability post into Supabase.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Guard clause, though useProtectedRoute should prevent this state
    if (!user) return;

    // --- Form Validations ---
    if (postType === 'dog_available' && selectedDogs.length === 0) {
      setError('Please select at least one dog for dog availability.');
      return;
    }

    if (selectedDays.length === 0) {
      setError('Please select at least one day for availability.');
      return;
    }

    if (!validateTimeSlots()) {
      return;
    }

    // Validate custom location data if it's being used
    if (!formData.use_profile_location) {
      if (
        !formData.custom_location_address.trim() ||
        !formData.custom_location_city.trim() ||
        !formData.custom_location_state.trim() ||
        !formData.custom_location_zip_code.trim()
      ) {
        setError('Please fill in all address fields for the custom location.');
        return;
      }
      if (!formData.custom_location_lat || !formData.custom_location_lng) {
        setError('Please verify the custom address to get the neighborhood information.');
        return;
      }
    }
    // --- End Validations ---

    setSubmitting(true);
    setError(null);

    try {
      // Prepare the day schedules data
      const enabledDays = selectedDays;
      const daySchedulesData = {};

      selectedDays.forEach((day) => {
        daySchedulesData[day] = {
          enabled: true,
          timeSlots: daySchedules[day].timeSlots,
        };
      });

      // Prepare location data based on user selection
      const locationData = formData.use_profile_location
        ? {
            use_profile_location: true,
            display_lat: userProfile?.display_lat || null,
            display_lng: userProfile?.display_lng || null,
            city_label: userProfile?.city ? formatLocation({ city: userProfile.city }).city : null,
          }
        : {
            use_profile_location: false,
            custom_location_address: formData.custom_location_address,
            custom_location_neighborhood: formData.custom_location_neighborhood,
            custom_location_city: formData.custom_location_city,
            custom_location_state: formData.custom_location_state,
            custom_location_zip_code: formData.custom_location_zip_code,
            custom_location_lat: formData.custom_location_lat,
            custom_location_lng: formData.custom_location_lng,
            display_lat: formData.custom_location_lat,
            display_lng: formData.custom_location_lng,
            city_label: formData.custom_location_city
              ? formatLocation({ city: formData.custom_location_city }).city
              : null,
          };

      // Create the post object
      const postToCreate = {
        ...formData,
        ...locationData,
        owner_id: user.id,
        post_type: postType,
        enabled_days: enabledDays,
        day_schedules: daySchedulesData,
      };

      if (postType === 'dog_available') {
        // Set the first dog as the primary dog_id for backward compatibility
        postToCreate.dog_id = selectedDogs[0];
        // Store all selected dogs in the new dog_ids array
        postToCreate.dog_ids = selectedDogs;
      }

      const postsToCreate = [postToCreate];

      // Clean up the data to ensure proper types for Supabase
      const cleanedPosts = postsToCreate.map((post) => ({
        ...post,
        enabled_days: Array.isArray(post.enabled_days) ? post.enabled_days : [],
        day_schedules: typeof post.day_schedules === 'object' ? post.day_schedules : {},
        display_lat: post.display_lat ? parseFloat(post.display_lat) : null,
        display_lng: post.display_lng ? parseFloat(post.display_lng) : null,
        custom_location_lat: post.custom_location_lat ? parseFloat(post.custom_location_lat) : null,
        custom_location_lng: post.custom_location_lng ? parseFloat(post.custom_location_lng) : null,
        start_date: post.start_date || null,
        end_date: post.end_date || null,
        ...Object.fromEntries(Object.entries(post).filter(([value]) => value !== undefined)),
      }));

      const { error } = await supabase.from('availability').insert(cleanedPosts).select();

      if (error) {
        console.error('Error creating availability post:', error);
        setError(`Failed to create availability post: ${error.message}`);
        return;
      }

      // Redirect to community page with success message
      router.push('/community?success=availability_created');
    } catch (error) {
      console.error('Error creating availability post:', error);
      setError('Failed to create availability post');
    } finally {
      setSubmitting(false);
    }
  };
  // #endregion

  // #region Render Logic
  // This first loading state is for auth verification
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // This second loading state waits for auth AND data fetching
  if (profileLoading || dogsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your data...</p>
        </div>
      </div>
    );
  }

  // The `if (!user) return null` check is no longer needed.
  // `useProtectedRoute` handles redirection and guarantees `user` exists
  // if `authLoading` is false and we are still rendering.

  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Configuration Error</h1>
          <p className="text-gray-600 mb-4">
            Supabase environment variables are not configured. Please check your `.env.local` file.
          </p>
          <div className="bg-gray-100 p-4 rounded-lg text-sm text-gray-700">
            <p className="font-medium mb-2">Required environment variables:</p>
            <ul className="space-y-1">
              <li>• NEXT_PUBLIC_SUPABASE_URL</li>
              <li>• NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const days = [
    { key: 'monday', label: 'Mon' },
    { key: 'tuesday', label: 'Tue' },
    { key: 'wednesday', label: 'Wed' },
    { key: 'thursday', label: 'Thu' },
    { key: 'friday', label: 'Fri' },
    { key: 'saturday', label: 'Sat' },
    { key: 'sunday', label: 'Sun' },
  ];
  // #endregion

  // #region JSX
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-4 sm:py-8 px-3 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Share Availability</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Let your community know when you&apos;re available to help or need assistance
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div
              className={`flex items-center ${
                currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  currentStep >= 1 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                }`}
              >
                1
              </div>
              <span className="ml-2 font-medium">Choose Type</span>
            </div>
            <div className="w-8 h-1 bg-gray-300"></div>
            <div
              className={`flex items-center ${
                currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  currentStep >= 2 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                }`}
              >
                2
              </div>
              <span className="ml-2 font-medium">Details</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
            {error.includes('add a dog') && (
              <div className="mt-2">
                <Link href="/my-dogs/add" className="text-red-800 underline font-medium">
                  Add a dog to your profile
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Choose Type */}
        {currentStep === 1 && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-8">
            <h2 className="text-2xl font-semibold mb-6">What are you sharing availability for?</h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Dog Availability Option */}
              <button
                type="button"
                className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                  postType === 'petpal_available'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handlePostTypeSelect('dog_available')}
              >
                <div className="text-4xl mb-4">🐕</div>
                <h3 className="text-xl font-semibold mb-2">My Dog wants a Pal</h3>
                <p className="text-gray-600 mb-4">
                  Share when your dog is available for an adventure and some petpal love.
                </p>
                {dogs.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded-sm text-sm">
                    ⚠️ No dog found in your profile
                    <div className="mt-2">
                      <Link
                        href="/my-dogs/add"
                        className="text-yellow-900 underline font-medium hover:text-yellow-700 transition-colors"
                      >
                        Add a dog to your profile
                      </Link>
                    </div>
                  </div>
                )}
                {dogs.length > 0 && (
                  <div className="text-sm text-gray-500">
                    You have {dogs.length} dog{dogs.length !== 1 ? 's' : ''} in your profile
                  </div>
                )}
              </button>
              {/* Pet Sitter Availability Option */}
              <button
                type="button"
                className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                  postType === 'petpal_available'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handlePostTypeSelect('petpal_available')}
              >
                <div className="text-4xl mb-4">👤</div>
                <h3 className="text-xl font-semibold mb-2">I am a PetPal</h3>
                <p className="text-gray-600 mb-4">
                  Share when you&apos;re available to get some puppy love.
                </p>
                <div className="text-sm text-gray-500">Help others in your neighborhood</div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Form Details */}
        {currentStep === 2 && (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0 mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold">
                {postType === 'dog_available'
                  ? 'Dog Availability Details'
                  : 'Pet Sitter Availability Details'}
              </h2>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base self-start sm:self-auto"
              >
                ← Back
              </button>
            </div>

            {/* Dog Selection for Dog Availability */}
            {postType === 'dog_available' && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Select Dog(s)</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dogs.map((dog) => (
                    <button
                      key={dog.id}
                      type="button"
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedDogs.includes(dog.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                      onClick={() => handleDogSelection(dog.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedDogs.includes(dog.id)}
                          onChange={() => handleDogSelection(dog.id)}
                          className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded-sm"
                        />
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden relative">
                          {dog.photo_url ? (
                            <Image
                              src={dog.photo_url}
                              alt={dog.name}
                              className="w-full h-full object-cover rounded-full"
                              width={48}
                              height={48}
                              unoptimized
                            />
                          ) : (
                            <span className="text-2xl">🐕</span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{dog.name}</div>
                          <div className="text-sm text-gray-500">{dog.breed}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-black focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  placeholder={
                    postType === 'dog_available'
                      ? 'e.g., Need dog walking help this week'
                      : 'e.g., Available for dog walking'
                  }
                />
              </div>
            </div>

            {/* Day Selection and Time Slots */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Select Available Days and Times</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please propose times that you tend to be available to meet. We understand schedules
                may change, but providing your general availability helps match you with others.
              </p>

              {/* Day Selection */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
                {days.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleDay(key)}
                    className={`p-2 sm:p-3 rounded-lg border-2 transition-all text-center ${
                      daySchedules[key].enabled
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <div className="font-medium text-sm sm:text-base">{label}</div>
                    <div className="text-xs hidden sm:block">
                      {daySchedules[key].enabled ? 'Selected' : 'Click to select'}
                    </div>
                    <div className="text-xs sm:hidden">{daySchedules[key].enabled ? '✓' : '○'}</div>
                  </button>
                ))}
              </div>

              {/* Time Slots for Selected Days */}
              {selectedDays.length > 0 && (
                <div className="space-y-6">
                  {selectedDays
                    .sort(
                      (a, b) =>
                        days.findIndex((d) => d.key === a) - days.findIndex((d) => d.key === b)
                    )
                    .map((day) => (
                      <div key={day} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-semibold capitalize">{day}</h4>
                          <button
                            type="button"
                            onClick={() => addTimeSlot(day)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            + Add Time Slot
                          </button>
                        </div>

                        <div className="space-y-3">
                          {daySchedules[day].timeSlots.map((slot, index) => (
                            <div
                              key={slot.id}
                              className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3"
                            >
                              <div className="flex items-center space-x-2 w-full sm:w-auto">
                                <input
                                  type="time"
                                  value={slot.start}
                                  onChange={(e) =>
                                    updateTimeSlot(day, index, 'start', e.target.value)
                                  }
                                  className="px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
                                  required
                                />
                                <span className="text-gray-500 text-sm sm:text-base">to</span>
                                <input
                                  type="time"
                                  value={slot.end}
                                  onChange={(e) =>
                                    updateTimeSlot(day, index, 'end', e.target.value)
                                  }
                                  className="px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
                                  required
                                />
                              </div>
                              {daySchedules[day].timeSlots.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeTimeSlot(day, index)}
                                  className="text-red-600 hover:text-red-800 text-sm px-2 py-1 border border-red-300 rounded-sm hover:bg-red-50 transition-colors w-full sm:w-auto"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-8">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                placeholder="Provide more details about your availability or needs..."
              />
            </div>

            {/* Special Instructions */}
            <div className="mb-8">
              <label
                htmlFor="special_instructions"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Special Instructions
              </label>
              <textarea
                id="special_instructions"
                value={formData.special_instructions}
                onChange={(e) => handleInputChange('special_instructions', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                placeholder="Any special requirements or instructions..."
              />
            </div>

            {/* Urgency */}
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="is_urgent"
                  checked={formData.is_urgent}
                  onChange={(e) => handleCheckboxChange('is_urgent', e.target.checked)}
                  className="w-4 h-4 text-red-600 mr-2 bg-white border-gray-300 rounded-sm"
                />
                <label htmlFor="is_urgent" className="text-sm font-medium text-gray-700">
                  This is urgent
                </label>
              </div>

              {formData.is_urgent && (
                <div className="ml-6">
                  <label
                    htmlFor="urgency_notes"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Urgency Notes
                  </label>
                  <textarea
                    id="urgency_notes"
                    value={formData.urgency_notes}
                    onChange={(e) => handleInputChange('urgency_notes', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-black focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    placeholder="Explain why this is urgent..."
                  />
                </div>
              )}
            </div>

            {/* Location Selection */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Where are you located?</h3>

              {/* Location Option Selection */}
              <div className="mb-6">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="use_profile_location"
                      name="location_option"
                      checked={formData.use_profile_location}
                      onChange={() => handleInputChange('use_profile_location', true)}
                      className="w-4 h-4 text-blue-600 mr-2"
                    />
                    <label
                      htmlFor="use_profile_location"
                      className="text-sm font-medium text-gray-700"
                    >
                      Use location in your profile
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="use_custom_location"
                      name="location_option"
                      checked={!formData.use_profile_location}
                      onChange={() => handleInputChange('use_profile_location', false)}
                      className="w-4 h-4 text-blue-600 mr-2"
                    />
                    <label
                      htmlFor="use_custom_location"
                      className="text-sm font-medium text-gray-700"
                    >
                      Share another location best for meeting
                    </label>
                  </div>
                </div>
              </div>

              {/* Profile Location Display */}
              {formData.use_profile_location && userProfile && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-blue-900 mb-2">Your Profile Location</h4>
                  <div className="text-sm text-blue-800">
                    {(() => {
                      const formattedLocation = formatLocation({
                        neighborhood: userProfile.neighborhood,
                        city: userProfile.city,
                        state: userProfile.state,
                      });
                      return (
                        <>
                          {formattedLocation.neighborhood && (
                            <div>Neighborhood: {formattedLocation.neighborhood}</div>
                          )}
                          {formattedLocation.city && <div>City: {formattedLocation.city}</div>}
                          {formattedLocation.state && <div>State: {formattedLocation.state}</div>}
                          {!formattedLocation.neighborhood &&
                            !formattedLocation.city &&
                            !formattedLocation.state && (
                              <div className="text-blue-600">No location set in your profile</div>
                            )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Custom Location Form */}
              {!formData.use_profile_location && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-4">Custom Meeting Location</h4>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label
                        htmlFor="custom_location_address"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Street Address *
                      </label>
                      <input
                        type="text"
                        id="custom_location_address"
                        value={formData.custom_location_address}
                        onChange={(e) =>
                          handleInputChange('custom_location_address', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-black focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        placeholder="123 Main St"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="custom_location_city"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        City *
                      </label>
                      <input
                        type="text"
                        id="custom_location_city"
                        value={formData.custom_location_city}
                        onChange={(e) => handleInputChange('custom_location_city', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-black focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        placeholder="City"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="custom_location_state"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        State *
                      </label>
                      <input
                        type="text"
                        id="custom_location_state"
                        value={formData.custom_location_state}
                        onChange={(e) => handleInputChange('custom_location_state', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-black focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        placeholder="State"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="custom_location_zip_code"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        ZIP Code *
                      </label>
                      <input
                        type="text"
                        id="custom_location_zip_code"
                        value={formData.custom_location_zip_code}
                        onChange={(e) =>
                          handleInputChange('custom_location_zip_code', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-black focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        placeholder="12345"
                      />
                    </div>
                  </div>

                  {/* Neighborhood Display */}
                  {formData.custom_location_neighborhood && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                      <div className="text-sm text-green-800">
                        <strong>Neighborhood:</strong>{' '}
                        {
                          formatLocation({
                            neighborhood: formData.custom_location_neighborhood,
                          }).neighborhood
                        }
                        {addressVerified && (
                          <div className="text-xs text-green-600 mt-1">
                            ✓ Address verified successfully!
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Verify Address Button */}
                  <button
                    type="button"
                    onClick={verifyCustomAddress}
                    disabled={
                      verifyingCustomAddress ||
                      !formData.custom_location_address ||
                      !formData.custom_location_city ||
                      !formData.custom_location_state ||
                      !formData.custom_location_zip_code
                    }
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {verifyingCustomAddress ? 'Verifying...' : 'Verify Address & Get Neighborhood'}
                  </button>
                </div>
              )}
            </div>

            {/* Transportation Options */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Transportation Options</h3>
              <div className="mb-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="can_pick_up_drop_off"
                    checked={formData.can_pick_up_drop_off}
                    onChange={(e) => handleCheckboxChange('can_pick_up_drop_off', e.target.checked)}
                    className="w-4 h-4 text-blue-600 mr-2 bg-white border-gray-300 rounded-sm"
                  />
                  <label
                    htmlFor="can_pick_up_drop_off"
                    className="text-sm font-medium text-gray-700"
                  >
                    Can pick up/drop off
                  </label>
                </div>
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
                  value={formData.preferred_meeting_location}
                  onChange={(e) => handleInputChange('preferred_meeting_location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-black focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Local park, my home, etc."
                />
              </div>
            </div>

            {/* Community Support Section */}
            <div className="mb-8">
              <CommunitySupportSection
                formData={formData}
                onFormDataChange={handleFormDataChange}
                postType={postType}
              />
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-6 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-100 transition-colors text-sm sm:text-base order-2 sm:order-1"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base order-1 sm:order-2"
              >
                {submitting ? 'Creating...' : 'Share Availability'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
  // #endregion
}
// #endregion
