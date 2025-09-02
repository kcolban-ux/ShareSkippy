"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseAuth } from '@/libs/supabase/hooks';
import { createClient } from '@/libs/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Section } from '@/components/ui/Section';
import Map from '@/components/map/Map';
import CommunitySupportSection from '@/components/CommunitySupportSection';
import { formatLocation } from '@/libs/utils';

export default function ShareAvailability() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const router = useRouter();
  const supabase = createClient();
  
  // Check if Supabase is properly configured
  useEffect(() => {
    try {
      // Test the connection
      console.log('Supabase client created successfully');
    } catch (error) {
      console.error('Error creating Supabase client:', error);
    }
  }, []);
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [postType, setPostType] = useState(null);
  
  // Data states
  const [dogs, setDogs] = useState([]);
  const [selectedDogs, setSelectedDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Day scheduling
  const [selectedDays, setSelectedDays] = useState([]);
  const [daySchedules, setDaySchedules] = useState({
    monday: { enabled: false, timeSlots: [{ start: '', end: '' }] },
    tuesday: { enabled: false, timeSlots: [{ start: '', end: '' }] },
    wednesday: { enabled: false, timeSlots: [{ start: '', end: '' }] },
    thursday: { enabled: false, timeSlots: [{ start: '', end: '' }] },
    friday: { enabled: false, timeSlots: [{ start: '', end: '' }] },
    saturday: { enabled: false, timeSlots: [{ start: '', end: '' }] },
    sunday: { enabled: false, timeSlots: [{ start: '', end: '' }] }
  });
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    availability_notes: '',
    special_instructions: '',
    is_urgent: false,
    urgency_notes: '',
    can_pick_up_drop_off: false,
    preferred_meeting_location: '',
    // Location selection fields
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
    helping_others_context: ''
  });

  // User profile data for location
  const [userProfile, setUserProfile] = useState(null);
  const [verifyingCustomAddress, setVerifyingCustomAddress] = useState(false);
  const [addressVerified, setAddressVerified] = useState(false);

  useEffect(() => {
    console.log('ShareAvailability useEffect triggered:', { authLoading, user: !!user });
    
    if (authLoading) {
      console.log('Still loading auth...');
      return;
    }
    
    if (!user) {
      console.log('No user found, redirecting to signin');
      router.push('/signin');
      return;
    }
    
    console.log('User authenticated, fetching data...');
    fetchDogs();
    fetchUserProfile();
  }, [user, authLoading, router]);

  const fetchDogs = async () => {
    if (!user) {
      console.log('No user available for fetchDogs');
      return;
    }

    try {
      console.log('Fetching dogs for user:', user.id);
      setLoading(true);
      const { data, error } = await supabase
        .from('dogs')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching dogs:', error);
        setError('Failed to fetch dogs');
        return;
      }

      console.log('Dogs fetched successfully:', data);
      setDogs(data || []);
    } catch (error) {
      console.error('Error fetching dogs:', error);
      setError('Failed to fetch dogs');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const verifyCustomAddress = async () => {
    if (!formData.custom_location_address.trim() || !formData.custom_location_city.trim() || 
        !formData.custom_location_state.trim() || !formData.custom_location_zip_code.trim()) {
      setError('Please fill in all address fields');
      return;
    }

    setVerifyingCustomAddress(true);
    try {
      // Create a full address string for geocoding
      const fullAddress = `${formData.custom_location_address}, ${formData.custom_location_city}, ${formData.custom_location_state} ${formData.custom_location_zip_code}`;
      
      // Get geocoding result
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1&addressdetails=1`);
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        let neighborhood = '';
        
        // Try to extract neighborhood from address details
        if (result.address) {
          neighborhood = result.address.suburb || result.address.neighbourhood || result.address.district || '';
        }
        
        // If no neighborhood found, try to extract from display name
        if (!neighborhood) {
          const addressParts = result.display_name.split(', ');
          
          // Look for common neighborhood patterns
          for (let i = 0; i < addressParts.length; i++) {
            const part = addressParts[i].toLowerCase();
            if (part.includes('hills') || part.includes('heights') || part.includes('park') || 
                part.includes('valley') || part.includes('ridge') || part.includes('grove') ||
                part.includes('commons') || part.includes('square') || part.includes('plaza') ||
                part.includes('north') || part.includes('south') || part.includes('east') || part.includes('west')) {
              neighborhood = addressParts[i];
              break;
            }
          }
        }

        // Update form data with verified location (with proper capitalization)
        const formattedLocation = formatLocation({
          neighborhood: neighborhood,
          city: formData.custom_location_city,
          state: formData.custom_location_state
        });
        
        setFormData(prev => ({
          ...prev,
          custom_location_lat: lat,
          custom_location_lng: lng,
          custom_location_neighborhood: formattedLocation.neighborhood,
          custom_location_city: formattedLocation.city,
          custom_location_state: formattedLocation.state
        }));

        setError(null);
        setAddressVerified(true);
        // We'll show this as a success state in the UI instead of alert
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

  const handlePostTypeSelect = (type) => {
    setPostType(type);
    if (type === 'dog_available' && dogs.length === 0) {
      setError('You need to add a dog to your profile before sharing dog availability.');
      return;
    }
    setCurrentStep(2);
  };

  const handleDogSelection = (dogId) => {
    setSelectedDogs(prev => 
      prev.includes(dogId) 
        ? prev.filter(id => id !== dogId)
        : [...prev, dogId]
    );
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Reset address verification when location option changes or custom address fields change
    if (field === 'use_profile_location' || 
        field === 'custom_location_address' || 
        field === 'custom_location_city' || 
        field === 'custom_location_state' || 
        field === 'custom_location_zip_code') {
      setAddressVerified(false);
    }
  };

  const handleCheckboxChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFormDataChange = (newFormData) => {
    setFormData(newFormData);
  };

  const toggleDay = (day) => {
    setDaySchedules(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled
      }
    }));
    
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const addTimeSlot = (day) => {
    setDaySchedules(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: [...prev[day].timeSlots, { start: '', end: '' }]
      }
    }));
  };

  const removeTimeSlot = (day, index) => {
    if (daySchedules[day].timeSlots.length <= 1) return; // Keep at least one time slot
    
    setDaySchedules(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: prev[day].timeSlots.filter((_, i) => i !== index)
      }
    }));
  };

  const updateTimeSlot = (day, index, field, value) => {
    setDaySchedules(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: prev[day].timeSlots.map((slot, i) => 
          i === index ? { ...slot, [field]: value } : slot
        )
      }
    }));
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

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



    // Validate location data
    if (!formData.use_profile_location) {
      if (!formData.custom_location_address.trim() || !formData.custom_location_city.trim() || 
          !formData.custom_location_state.trim() || !formData.custom_location_zip_code.trim()) {
        setError('Please fill in all address fields for the custom location.');
        return;
      }
      if (!formData.custom_location_lat || !formData.custom_location_lng) {
        setError('Please verify the custom address to get the neighborhood information.');
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      // Prepare the day schedules data
      const enabledDays = selectedDays;
      const daySchedulesData = {};
      
      selectedDays.forEach(day => {
        daySchedulesData[day] = {
          enabled: true,
          timeSlots: daySchedules[day].timeSlots
        };
      });

      // Prepare location data based on user selection with proper capitalization
      const locationData = formData.use_profile_location 
        ? {
            use_profile_location: true,
            display_lat: userProfile?.display_lat || null,
            display_lng: userProfile?.display_lng || null,
            city_label: userProfile?.city ? formatLocation({ city: userProfile.city }).city : null
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
            city_label: formData.custom_location_city ? formatLocation({ city: formData.custom_location_city }).city : null
          };

      // Create a single availability post (with multiple dogs if applicable)
      const postToCreate = {
        ...formData,
        ...locationData,
        owner_id: user.id,
        post_type: postType,
        enabled_days: enabledDays,
        day_schedules: daySchedulesData
      };

      // For dog availability, add dog information
      if (postType === 'dog_available') {
        // Set the first dog as the primary dog_id for backward compatibility
        postToCreate.dog_id = selectedDogs[0];
        // Store all selected dogs in the new dog_ids array
        postToCreate.dog_ids = selectedDogs;
      }

      const postsToCreate = [postToCreate];

      // Clean up the data to ensure proper types
      const cleanedPosts = postsToCreate.map(post => ({
        ...post,
        // Ensure these are properly formatted for JSONB
        enabled_days: Array.isArray(post.enabled_days) ? post.enabled_days : [],
        day_schedules: typeof post.day_schedules === 'object' ? post.day_schedules : {},
        // Ensure numeric fields are numbers
        display_lat: post.display_lat ? parseFloat(post.display_lat) : null,
        display_lng: post.display_lng ? parseFloat(post.display_lng) : null,
        custom_location_lat: post.custom_location_lat ? parseFloat(post.custom_location_lat) : null,
        custom_location_lng: post.custom_location_lng ? parseFloat(post.custom_location_lng) : null,
        // Ensure date fields are properly formatted
        start_date: post.start_date || null,
        end_date: post.end_date || null,
        // Remove any undefined values
        ...Object.fromEntries(
          Object.entries(post).filter(([_, value]) => value !== undefined)
        )
      }));

      console.log('Form data before cleaning:', formData);
      console.log('Posts to create:', postsToCreate);
      console.log('Cleaned posts:', cleanedPosts);

      console.log('Attempting to create availability posts:', cleanedPosts);
      
      const { data, error } = await supabase
        .from('availability')
        .insert(cleanedPosts)
        .select();

      if (error) {
        console.error('Error creating availability post:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your data...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to signin
  }

  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
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
              <li>• NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
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
    { key: 'sunday', label: 'Sun' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Share Availability</h1>
          <p className="text-gray-600">Let your community know when you&apos;re available to help or need assistance</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 1 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'}`}>
                1
              </div>
              <span className="ml-2 font-medium">Choose Type</span>
            </div>
            <div className="w-8 h-1 bg-gray-300"></div>
            <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 2 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'}`}>
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
                <a href="/my-dogs/add" className="text-red-800 underline font-medium">
                  Add a dog to your profile
                </a>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Choose Type */}
        {currentStep === 1 && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-semibold mb-6">What are you sharing availability for?</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Dog Availability Option */}
              <div 
                className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                  postType === 'dog_available' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handlePostTypeSelect('dog_available')}
              >
                <div className="text-4xl mb-4">🐕</div>
                <h3 className="text-xl font-semibold mb-2">My Dog wants a Pal</h3>
                <p className="text-gray-600 mb-4">
                  Share when your dog is available for an adventure and some petpal love.
                </p>
                {dogs.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded text-sm">
                    ⚠️ You need to add a dog to your profile first
                  </div>
                )}
                {dogs.length > 0 && (
                  <div className="text-sm text-gray-500">
                    You have {dogs.length} dog{dogs.length !== 1 ? 's' : ''} in your profile
                  </div>
                )}
              </div>

              {/* Pet Sitter Availability Option */}
              <div 
                className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                  postType === 'petpal_available' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handlePostTypeSelect('petpal_available')}
              >
                <div className="text-4xl mb-4">👤</div>
                <h3 className="text-xl font-semibold mb-2">I am a PetPal</h3>
                <p className="text-gray-600 mb-4">
                  Share when you&apos;re available to get some puppy love.
                </p>
                <div className="text-sm text-gray-500">
                  Help others in your neighborhood
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Form Details */}
        {currentStep === 2 && (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">
                {postType === 'dog_available' ? 'Dog Availability Details' : 'Pet Sitter Availability Details'}
              </h2>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-blue-600 hover:text-blue-800 font-medium"
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
                    <div
                      key={dog.id}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedDogs.includes(dog.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleDogSelection(dog.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedDogs.includes(dog.id)}
                          onChange={() => handleDogSelection(dog.id)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          {dog.photo_url ? (
                            <img src={dog.photo_url} alt={dog.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <span className="text-2xl">🐕</span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{dog.name}</div>
                          <div className="text-sm text-gray-500">{dog.breed}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={postType === 'dog_available' ? 'e.g., Need dog walking help this week' : 'e.g., Available for dog walking'}
                />
              </div>


            </div>

            {/* Day Selection and Time Slots */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Select Available Days and Times</h3>
              
              {/* Day Selection */}
              <div className="grid grid-cols-7 gap-2 mb-6">
                {days.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleDay(key)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      daySchedules[key].enabled
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <div className="font-medium">{label}</div>
                    <div className="text-xs">
                      {daySchedules[key].enabled ? 'Selected' : 'Click to select'}
                    </div>
                  </button>
                ))}
              </div>

              {/* Time Slots for Selected Days */}
              {selectedDays.length > 0 && (
                <div className="space-y-6">
                  {selectedDays.map((day) => (
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
                          <div key={index} className="flex items-center space-x-3">
                            <input
                              type="time"
                              value={slot.start}
                              onChange={(e) => updateTimeSlot(day, index, 'start', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                            <span className="text-gray-500">to</span>
                            <input
                              type="time"
                              value={slot.end}
                              onChange={(e) => updateTimeSlot(day, index, 'end', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                            {daySchedules[day].timeSlots.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeTimeSlot(day, index)}
                                className="text-red-600 hover:text-red-800 text-sm"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Provide more details about your availability or needs..."
              />
            </div>

            {/* Special Instructions */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Instructions
              </label>
              <textarea
                value={formData.special_instructions}
                onChange={(e) => handleInputChange('special_instructions', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-4 h-4 text-red-600 mr-2"
                />
                <label htmlFor="is_urgent" className="text-sm font-medium text-gray-700">
                  This is urgent
                </label>
              </div>

              {formData.is_urgent && (
                <div className="ml-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Urgency Notes
                  </label>
                  <textarea
                    value={formData.urgency_notes}
                    onChange={(e) => handleInputChange('urgency_notes', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <label htmlFor="use_profile_location" className="text-sm font-medium text-gray-700">
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
                    <label htmlFor="use_custom_location" className="text-sm font-medium text-gray-700">
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
                        state: userProfile.state
                      });
                      return (
                        <>
                          {formattedLocation.neighborhood && <div>Neighborhood: {formattedLocation.neighborhood}</div>}
                          {formattedLocation.city && <div>City: {formattedLocation.city}</div>}
                          {formattedLocation.state && <div>State: {formattedLocation.state}</div>}
                          {(!formattedLocation.neighborhood && !formattedLocation.city && !formattedLocation.state) && (
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        value={formData.custom_location_address}
                        onChange={(e) => handleInputChange('custom_location_address', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="123 Main St"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        value={formData.custom_location_city}
                        onChange={(e) => handleInputChange('custom_location_city', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="City"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State *
                      </label>
                      <input
                        type="text"
                        value={formData.custom_location_state}
                        onChange={(e) => handleInputChange('custom_location_state', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="State"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ZIP Code *
                      </label>
                      <input
                        type="text"
                        value={formData.custom_location_zip_code}
                        onChange={(e) => handleInputChange('custom_location_zip_code', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="12345"
                      />
                    </div>
                  </div>

                  {/* Neighborhood Display */}
                  {formData.custom_location_neighborhood && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                      <div className="text-sm text-green-800">
                        <strong>Neighborhood:</strong> {formatLocation({ neighborhood: formData.custom_location_neighborhood }).neighborhood}
                        {addressVerified && (
                          <div className="text-xs text-green-600 mt-1">✓ Address verified successfully!</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Verify Address Button */}
                  <button
                    type="button"
                    onClick={verifyCustomAddress}
                    disabled={verifyingCustomAddress || !formData.custom_location_address || !formData.custom_location_city || !formData.custom_location_state || !formData.custom_location_zip_code}
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
                    className="w-4 h-4 text-blue-600 mr-2"
                  />
                  <label htmlFor="can_pick_up_drop_off" className="text-sm font-medium text-gray-700">
                    Can pick up/drop off
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Meeting Location
                </label>
                <input
                  type="text"
                  value={formData.preferred_meeting_location}
                  onChange={(e) => handleInputChange('preferred_meeting_location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating...' : 'Share Availability'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
