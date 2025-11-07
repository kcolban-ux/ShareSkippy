'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/libs/supabase/client';
import { useUser } from '@/libs/supabase/hooks';
import { useProfileDraft } from '@/hooks/useProfileDraft';
import { formatLocation } from '@/libs/utils';
import PhotoUpload from '@/components/ui/PhotoUpload';

const initialProfileState = {
  first_name: '',
  last_name: '',
  phone_number: '',
  role: '',
  emergency_contact_name: '',
  emergency_contact_number: '',
  emergency_contact_email: '',
  bio: '',
  facebook_url: '',
  instagram_url: '',
  linkedin_url: '',
  airbnb_url: '',
  other_social_url: '',
  community_support_badge: '',
  support_preferences: [],
  support_story: '',
  other_support_description: '',
  profile_photo_url: '',
  display_lat: null,
  display_lng: null,
  neighborhood: '',
  city: '',
  street_address: '',
  state: '',
  zip_code: '',
};

// --- COMPONENT START ---

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifyingAddress, setVerifyingAddress] = useState(false);
  const [addressVerified, setAddressVerified] = useState(false);

  // Use the sessionStorage-based profile draft hook
  const { profile, setProfile, loadDraft, clearDraft, hasDraft, draftSource } =
    useProfileDraft(initialProfileState); // Use the consistent initial state

  // Per-field inline errors
  const [fieldErrors, setFieldErrors] = useState({});

  // --- DATA LOADING LOGIC ---

  const loadProfile = useCallback(async () => {
    // Authentication verification (ensures user object is available)
    if (!user || !user.id) {
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      // Fetch profile data
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Safely extract Google auth metadata for pre-filling
      const userMetadata = user?.user_metadata || {};
      const googleGivenName = userMetadata?.given_name || userMetadata?.first_name;
      const googleFamilyName = userMetadata?.family_name || userMetadata?.last_name;
      const googlePicture = userMetadata?.picture || userMetadata?.avatar_url;

      let loadedProfileData = { ...initialProfileState };

      if (data) {
        // Merge existing data with pre-fill overrides
        loadedProfileData = {
          ...initialProfileState,
          ...data,
          first_name: data.first_name || googleGivenName || '',
          last_name: data.last_name || googleFamilyName || '',
          profile_photo_url: data.profile_photo_url || googlePicture || '',
        };
      } else if (error && error.code === 'PGRST116') {
        // Profile not found, use Google data for initial fields
        loadedProfileData = {
          ...initialProfileState,
          first_name: googleGivenName || '',
          last_name: googleFamilyName || '',
          profile_photo_url: googlePicture || '',
        };
      } else if (error) {
        throw error;
      }

      setProfile(loadedProfileData);
    } catch (err) {
      console.error('Error loading profile:', err);
      toast.error(`Failed to load profile: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [user, setProfile]);

  // --- EFFECT: AUTHENTICATION & DATA FETCHING ---

  useEffect(() => {
    if (userLoading) return;

    // 1. Authentication Verification: Redirect unauthenticated users
    if (!user) {
      router.push('/signin');
      return;
    }

    // Try to load draft first, then load profile from database
    const draft = loadDraft();
    if (draft) {
      console.log('📂 Restoring profile draft from sessionStorage');
      setLoading(false);
      // Merge draft with any missing fields from initialProfileState
      setProfile((prev) => ({
        ...initialProfileState,
        ...prev,
        ...draft,
      }));
    } else {
      // 3. Database Load
      loadProfile();
    }
  }, [user, userLoading, router, loadDraft, setProfile, loadProfile]);

  // Validate required fields and return { fieldName: message }
  const validateProfile = (p) => {
    const errors = {};

    if (!p.first_name || !String(p.first_name).trim()) {
      errors.first_name = 'Please enter your first name';
    }
    if (!p.last_name || !String(p.last_name).trim()) {
      errors.last_name = 'Please enter your last name';
    }
    if (!p.phone_number || !String(p.phone_number).trim()) {
      errors.phone_number = 'Please enter a phone number';
    } else {
      const digits = String(p.phone_number).replace(/\D/g, '');
      if (digits.length < 10) {
        errors.phone_number = 'Please enter a valid phone number';
      }
    }
    if (!p.role || !String(p.role).trim()) {
      errors.role = 'Please select a role';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Authentication verification: Prevent form submission if user or ID is missing
    if (!user || !user.id) {
      toast.error('Authentication required to save profile.');
      return;
    }
    setSaving(true);

    try {
      // Run client-side validation and show inline errors if any
      const errors = validateProfile(profile);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);

        const prettyNames = {
          first_name: 'First Name',
          last_name: 'Last Name',
          phone_number: 'Phone Number',
          role: 'Role',
        };
        const missing = Object.keys(errors).map((k) => prettyNames[k] || k);
        toast.error(`Please fix: ${missing.join(', ')}`);

        setSaving(false);
        return;
      }

      if (!addressVerified) {
        toast.error('Please verify your address before saving your profile.');
        setSaving(false);
        return;
      }

      const supabase = createClient();

      // --- Prepare Profile Data (Safely handling potential nulls) ---
      const profileData = {
        id: user.id,
        // Basic Fields
        first_name: String(profile.first_name).trim(),
        last_name: String(profile.last_name).trim(),
        phone_number: String(profile.phone_number).trim(),
        role: String(profile.role).trim(),

        // Location data (verified)
        neighborhood: String(profile.neighborhood || '').trim() || null,
        city: String(profile.city || '').trim() || null,
        state: String(profile.state || '').trim() || null,
        street_address: String(profile.street_address || '').trim() || null,
        zip_code: String(profile.zip_code || '').trim() || null,
        display_lat: profile.display_lat,
        display_lng: profile.display_lng,

        // Optional/Meta data
        bio: String(profile.bio || '').trim() || null,
        profile_photo_url: String(profile.profile_photo_url || '').trim() || null,
        community_support_badge: String(profile.community_support_badge || '').trim() || null,
        support_preferences: profile.support_preferences || [],
        support_story: String(profile.support_story || '').trim() || null,
        other_support_description: String(profile.other_support_description || '').trim() || null,

        // Social Links
        facebook_url: String(profile.facebook_url || '').trim() || null,
        instagram_url: String(profile.instagram_url || '').trim() || null,
        linkedin_url: String(profile.linkedin_url || '').trim() || null,
        airbnb_url: String(profile.airbnb_url || '').trim() || null,
        other_social_url: String(profile.other_social_url || '').trim() || null,

        // Emergency Contact
        emergency_contact_name: String(profile.emergency_contact_name || '').trim() || null,
        emergency_contact_number: String(profile.emergency_contact_number || '').trim() || null,
        emergency_contact_email: String(profile.emergency_contact_email || '').trim() || null,

        updated_at: new Date().toISOString(),
      };

      const { error: dbError } = await supabase.from('profiles').upsert(profileData, {
        onConflict: 'id',
      });

      if (dbError) {
        console.error('Supabase error details:', dbError);
        // Example mapping: map phone conflict to field error
        if (dbError.message && /phone/i.test(dbError.message)) {
          setFieldErrors({ phone_number: 'That phone number is already in use' });
          toast.error('Phone number already in use');
          setSaving(false);
          return;
        }
        throw new Error(`Database error: ${dbError.message} (Code: ${dbError.code})`);
      }

      // Clear draft after successful save
      clearDraft();

      toast.success('Profile saved successfully!');
      clearDraft(); // Clear the draft since profile is now saved
      router.push('/onboarding/welcome'); // Use router.push for client-side navigation
    } catch (err) {
      console.error('Error saving profile:', err);

      let errorMessage = 'Failed to save profile';
      if (err.message && err.message.includes('Database error:')) {
        errorMessage = err.message;
      } else if (err.message && err.message.includes('JWT')) {
        errorMessage = 'Authentication error. Please try logging in again.';
      } else if (err.message && err.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }

      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'display_lat' || name === 'display_lng') {
      setProfile((prev) => ({
        ...prev,
        [name]: value === '' ? null : value,
      }));
      // clear field error for lat/lng if present
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
      return;
    }

    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear inline error for this field as user types
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  };

  const handlePhotoUpload = (photoUrl) => {
    setProfile((prev) => ({
      ...prev,
      profile_photo_url: photoUrl,
    }));
    setFieldErrors((prev) => {
      const copy = { ...prev };
      delete copy.profile_photo_url;
      return copy;
    });
  };

  const verifyAddress = async () => {
    // --- Safe validation check using String() ---
    if (
      !String(profile.street_address).trim() ||
      !String(profile.city).trim() ||
      !String(profile.state).trim() ||
      !String(profile.zip_code).trim()
    ) {
      toast.error('Please fill in all address fields');
      return;
    }

    setVerifyingAddress(true);
    try {
      const fullAddress = `${profile.street_address}, ${profile.city}, ${profile.state} ${profile.zip_code}`;

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1&addressdetails=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        const area =
          result.address.suburb ||
          result.address.city_district ||
          result.address.borough ||
          result.address.quarter ||
          result.address.ward ||
          result.address.district ||
          result.address.neighborhood ||
          result.address.neighbourhood ||
          result.address.locality ||
          result.address.residential ||
          '';

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

        setProfile((prev) => ({
          ...prev,
          display_lat: lat,
          display_lng: lng,
          neighborhood: formatted.neighborhood,
          city: formatted.city,
          state: formatted.state,
        }));

        setAddressVerified(true);
        toast.success('Address verified successfully! Please save your profile.');
      } else {
        toast.error('Address not found. Please check your address details.');
        setAddressVerified(false);
      }
    } catch (error) {
      console.error('Error verifying address:', error);
      toast.error('Failed to verify address. Please try again.');
      setAddressVerified(false);
    } finally {
      setVerifyingAddress(false);
    }
  };

  // --- RENDERING ---

  if (loading || userLoading) {
    return (
      <div className="min-h-screen w-full bg-white max-w-md mx-auto p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Rest of the component's JSX goes here (omitted for brevity)
  // ... (JSX previously provided in the user prompt)

  return (
    <div className="min-h-screen w-full bg-white max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-black">Create Your Profile</h1>

      {/* Draft indicator (restored from previous versions) */}
      {hasDraft && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                📂 Draft restored from {draftSource === 'session' ? 'this session' : 'storage'}
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="photo_upload"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Profile Photo
              </label>
              <PhotoUpload
                id="photo_upload"
                onPhotoUploaded={handlePhotoUpload}
                initialPhotoUrl={profile.profile_photo_url}
              />
              {fieldErrors.profile_photo_url && (
                <p className="mt-1 text-sm text-red-600" role="alert">{fieldErrors.profile_photo_url}</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="first_name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  First Name *
                </label>
                <input
                  type="text"
                  name="first_name"
                  id="first_name"
                  value={profile.first_name}
                  onChange={handleInputChange}
                  required
                  placeholder="First Name"
                  className={`w-full p-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black border ${fieldErrors.first_name ? 'border-red-500' : 'border-gray-300'}`}
                  aria-invalid={fieldErrors.first_name ? 'true' : 'false'}
                  aria-describedby={fieldErrors.first_name ? 'first_name_error' : undefined}
                />
                {fieldErrors.first_name && (
                  <p id="first_name_error" className="mt-1 text-sm text-red-600" role="alert">
                    {fieldErrors.first_name}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="last_name"
                  id="last_name"
                  value={profile.last_name}
                  onChange={handleInputChange}
                  required
                  placeholder="Last Name"
                  className={`w-full p-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black border ${fieldErrors.last_name ? 'border-red-500' : 'border-gray-300'}`}
                  aria-invalid={fieldErrors.last_name ? 'true' : 'false'}
                  aria-describedby={fieldErrors.last_name ? 'last_name_error' : undefined}
                />
                {fieldErrors.last_name && (
                  <p id="last_name_error" className="mt-1 text-sm text-red-600" role="alert">
                    {fieldErrors.last_name}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                name="email"
                id="email"
                value={user?.email || ''}
                disabled
                className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
              />
            </div>

            <div>
              <label
                htmlFor="phone_number"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone_number"
                id="phone_number"
                value={profile.phone_number}
                onChange={handleInputChange}
                required
                placeholder="Phone Number"
                className={`w-full p-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent border ${fieldErrors.phone_number ? 'border-red-500' : 'border-gray-300'}`}
                aria-invalid={fieldErrors.phone_number ? 'true' : 'false'}
                aria-describedby={fieldErrors.phone_number ? 'phone_number_error' : undefined}
              />
              {fieldErrors.phone_number && (
                <p id="phone_number_error" className="mt-1 text-sm text-red-600" role="alert">
                  {fieldErrors.phone_number}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Role *
              </label>
              <select
                name="role"
                id="role"
                value={profile.role}
                onChange={handleInputChange}
                required
                className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${fieldErrors.role ? 'border-red-500' : 'border-gray-300'}`}
                aria-invalid={fieldErrors.role ? 'true' : 'false'}
                aria-describedby={fieldErrors.role ? 'role_error' : undefined}
              >
                <option value="">Select your role</option>
                <option value="dog_owner">Dog Owner</option>
                <option value="petpal">PetPal</option>
                <option value="both">Both</option>
              </select>
              {fieldErrors.role && (
                <p id="role_error" className="mt-1 text-sm text-red-600" role="alert">
                  {fieldErrors.role}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                name="bio"
                id="bio"
                value={profile.bio}
                onChange={handleInputChange}
                rows={4}
                placeholder="Tell us about yourself..."
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Social Media Links */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Social Media Links</h2>
          <p className="text-sm text-gray-600 mb-4">
            To help verify your identity and build trust in the community, please share your social
            media profiles.
          </p>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="facebook_url"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Facebook URL
              </label>
              <input
                type="url"
                name="facebook_url"
                id="facebook_url"
                value={profile.facebook_url}
                onChange={handleInputChange}
                placeholder="https://facebook.com/yourprofile"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="instagram_url"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Instagram URL
              </label>
              <input
                type="url"
                name="instagram_url"
                id="instagram_url"
                value={profile.instagram_url}
                onChange={handleInputChange}
                placeholder="https://instagram.com/yourprofile"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="linkedin_url"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                LinkedIn URL
              </label>
              <input
                type="url"
                name="linkedin_url"
                id="linkedin_url"
                value={profile.linkedin_url}
                onChange={handleInputChange}
                placeholder="https://linkedin.com/in/yourprofile"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="airbnb_url" className="block text-sm font-medium text-gray-700 mb-2">
                Airbnb URL
              </label>
              <input
                type="url"
                name="airbnb_url"
                id="airbnb_url"
                value={profile.airbnb_url}
                onChange={handleInputChange}
                placeholder="https://airbnb.com/users/show/yourprofile"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="other_social_url"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Other Social Media URL
              </label>
              <input
                type="url"
                name="other_social_url"
                id="other_social_url"
                value={profile.other_social_url}
                onChange={handleInputChange}
                placeholder="https://your-other-profile.com"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Location</h2>
          <p className="text-sm text-gray-600 mb-4">
            Enter your address to help community members find you. Only your neighborhood and city
            will be shown publicly.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label
                  htmlFor="street_address"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Street Address
                </label>
                <input
                  type="text"
                  name="street_address"
                  id="street_address"
                  value={profile.street_address}
                  onChange={handleInputChange}
                  placeholder="123 Main Street"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
              </div>

              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  id="city"
                  value={profile.city}
                  onChange={handleInputChange}
                  placeholder="Berkeley"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  id="state"
                  value={profile.state}
                  onChange={handleInputChange}
                  placeholder="CA"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
              </div>

              <div>
                <label htmlFor="zip_code" className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  name="zip_code"
                  id="zip_code"
                  value={profile.zip_code}
                  onChange={handleInputChange}
                  placeholder="94704"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={verifyAddress}
                  disabled={
                    verifyingAddress ||
                    !String(profile.street_address).trim() ||
                    !String(profile.city).trim() ||
                    !String(profile.state).trim() ||
                    !String(profile.zip_code).trim()
                  }
                  className="w-full px-4 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifyingAddress ? 'Verifying Address...' : 'Verify Address'}
                </button>
              </div>
            </div>

            {addressVerified && profile.neighborhood && profile.city && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-green-800 mb-2">✅ Address Verified</h3>
                <div className="text-sm text-green-700">
                  <div>
                    <strong>Neighborhood:</strong> {profile.neighborhood}
                  </div>
                  <div>
                    <strong>City:</strong> {profile.city}
                  </div>
                  <div className="text-xs text-green-600 mt-2">
                    This is what will be shown publicly to other community members.
                  </div>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500">
              💡 Your exact address is never shared publicly. Only your neighborhood and city are
              visible to help with community matching.
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Emergency Contact</h2>
          <p className="text-sm text-gray-600 mb-4">
            Optional emergency contact information for safety purposes.
          </p>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="emergency_contact_name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Emergency Contact Name
              </label>
              <div className="space-y-3">
                <input
                  type="text"
                  name="emergency_contact_name"
                  id="emergency_contact_name"
                  value={profile.emergency_contact_name}
                  onChange={handleInputChange}
                  placeholder="Name"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
                <input
                  type="tel"
                  name="emergency_contact_number"
                  id="emergency_contact_number"
                  value={profile.emergency_contact_number}
                  onChange={handleInputChange}
                  placeholder="Phone Number"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
                <input
                  type="email"
                  name="emergency_contact_email"
                  id="emergency_contact_email"
                  value={profile.emergency_contact_email}
                  onChange={handleInputChange}
                  placeholder="Email (optional)"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.push('/profile')}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
