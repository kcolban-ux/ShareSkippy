// #region Imports
'use client';

import React, { useCallback, useEffect, useState, Dispatch, SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/libs/supabase/client';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useProfileDraft } from '@/hooks/useProfileDraft';
import { formatLocation } from '@/libs/utils';
import PhotoUpload from '@/components/ui/PhotoUpload';
import { User } from '@supabase/supabase-js';
// #endregion Imports

// #region Types
/**
 * @function isErrorWithMessage
 * @description Type guard to check if an unknown object has a string 'message' property.
 * @param {unknown} error - The object caught in the catch block.
 * @returns {error is { message: string }}
 */
function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

/**
 * @typedef {object} ProfileState
 * @description Defines the comprehensive shape of the profile data used in state and the database.
 */
interface ProfileState {
  [key: string]: unknown;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
  emergency_contact_name: string;
  emergency_contact_number: string;
  emergency_contact_email: string;
  bio: string;
  facebook_url: string;
  instagram_url: string;
  linkedin_url: string;
  airbnb_url: string;
  other_social_url: string;
  community_support_badge: string;
  support_preferences: string[];
  support_story: string;
  other_support_description: string;
  profile_photo_url: string;
  display_lat: number | null;
  display_lng: number | null;
  neighborhood: string | null;
  city: string | null;
  street_address: string;
  state: string | null;
  zip_code: string;
}

/**
 * @constant
 * @type {Readonly<ProfileState>}
 * @description Initial state for the profile form with required types.
 */
const initialProfileState: Readonly<ProfileState> = {
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
// #endregion Types

// #region Component
/**
 * @component
 * @description Allows the authenticated user to create or edit their profile information.
 */
export default function ProfileEditPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useProtectedRoute();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifyingAddress, setVerifyingAddress] = useState(false);
  const [addressVerified, setAddressVerified] = useState(false);

  // Type safety applied here: profile state and setProfile must adhere to ProfileState
  const { profile, setProfile, loadDraft, clearDraft, hasDraft, draftSource } =
    useProfileDraft<ProfileState>(initialProfileState);

  // #region Data Loading Logic
  /**
   * @function loadProfile
   * @description Fetches existing profile data from Supabase and merges it with Google auth metadata.
   * @param {User | null} currentUser - The current Supabase User object.
   * @param {Dispatch<SetStateAction<ProfileState>>} setProfileState - The state setter for the profile.
   * @param {Dispatch<SetStateAction<boolean>>} setAddressVerifiedState - The state setter for address verified.
   * @returns {Promise<boolean>} - Resolves true on successful load/merge, false otherwise.
   */
  const loadProfile = useCallback(
    async (
      currentUser: User, // Guaranteed non-null by the caller (useEffect)
      setProfileState: Dispatch<SetStateAction<ProfileState>>,
      setAddressVerifiedState: Dispatch<SetStateAction<boolean>>
    ): Promise<boolean> => {
      try {
        const supabase = createClient();

        // Fetch profile data.
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        // Safely extract Google auth metadata for pre-filling
        const userMetadata = currentUser.user_metadata || {};
        const googleGivenName = userMetadata?.given_name as string | undefined;
        const googleFamilyName = userMetadata?.family_name as string | undefined;
        const googlePicture = userMetadata?.picture as string | undefined;

        let loadedProfileData: ProfileState = { ...initialProfileState };

        if (data) {
          const dbData = data as ProfileState;
          loadedProfileData = {
            ...initialProfileState,
            ...dbData,
            first_name: dbData.first_name || googleGivenName || '',
            last_name: dbData.last_name || googleFamilyName || '',
            profile_photo_url: dbData.profile_photo_url || googlePicture || '',
          };
        } else if (error?.code === 'PGRST116') {
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

        setProfileState(loadedProfileData);

        // Set addressVerified if location data exists (using null checks)
        if (loadedProfileData.display_lat !== null && loadedProfileData.display_lng !== null) {
          setAddressVerifiedState(true);
        } else {
          setAddressVerifiedState(false);
        }
        return true;
      } catch (err: unknown) {
        let message = 'Failed to load profile';
        if (isErrorWithMessage(err)) {
          message = err.message;
        }
        console.error('Error loading profile:', err);
        toast.error(message);
        return false;
      }
    },
    []
  );

  /**
   * @effect
   * @description Handles initial data loading/draft restoring flow *after* auth is confirmed.
   */
  useEffect(() => {
    // #region Region: Auth & Loading Flow
    const initializeProfile = async () => {
      if (isAuthLoading || !user) {
        return;
      }

      // 2. Try to load draft first
      const draft = loadDraft() as Partial<ProfileState>;
      if (draft && Object.keys(draft).length > 0) {
        console.log('📂 Restoring profile draft from sessionStorage');

        setProfile((prev: ProfileState) => ({
          ...initialProfileState,
          ...prev,
          ...(draft as ProfileState),
        }));

        if (
          draft.display_lat !== null &&
          draft.display_lng !== null &&
          draft.display_lat !== undefined &&
          draft.display_lng !== undefined
        ) {
          setAddressVerified(true);
        } else {
          setAddressVerified(false);
        }
        setLoading(false);
        return;
      }

      // 3. Database Load
      await loadProfile(user, setProfile, setAddressVerified);

      setLoading(false);
    };

    initializeProfile();
  }, [isAuthLoading, router, loadDraft, setProfile, loadProfile]);
  // #endregion Data Loading Logic

  /**
   * @function handleSubmit
   * @description Handles form submission, validation, data preparation, and database upsert.
   * @param {React.FormEvent} e - The form event.
   * @returns {Promise<void>}
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Authentication required to save profile.');
      return;
    }
    setSaving(true);

    try {
      const supabase = createClient();

      // --- Validation Check ---
      if (
        !String(profile.first_name).trim() ||
        !String(profile.last_name).trim() ||
        !String(profile.phone_number).trim() ||
        !String(profile.role).trim()
      ) {
        toast.error(
          'Please fill in all required fields (First Name, Last Name, Phone Number, and Role)'
        );
        setSaving(false);
        return;
      }

      if (!addressVerified) {
        toast.error('Please verify your address before saving your profile.');
        setSaving(false);
        return;
      }

      // --- Prepare Profile Data (Explicitly typed payload) ---
      const profileData: Record<string, unknown> = {
        id: user.id,
        first_name: String(profile.first_name).trim(),
        last_name: String(profile.last_name).trim(),
        phone_number: String(profile.phone_number).trim(),
        role: String(profile.role).trim(),

        neighborhood: String(profile.neighborhood || '').trim() || null,
        city: String(profile.city || '').trim() || null,
        state: String(profile.state || '').trim() || null,
        street_address: String(profile.street_address || '').trim() || null,
        zip_code: String(profile.zip_code || '').trim() || null,
        display_lat: profile.display_lat,
        display_lng: profile.display_lng,

        bio: String(profile.bio || '').trim() || null,
        profile_photo_url: String(profile.profile_photo_url || '').trim() || null,
        community_support_badge: String(profile.community_support_badge || '').trim() || null,
        support_preferences: profile.support_preferences || [],
        support_story: String(profile.support_story || '').trim() || null,
        other_support_description: String(profile.other_support_description || '').trim() || null,

        facebook_url: String(profile.facebook_url || '').trim() || null,
        instagram_url: String(profile.instagram_url || '').trim() || null,
        linkedin_url: String(profile.linkedin_url || '').trim() || null,
        airbnb_url: String(profile.airbnb_url || '').trim() || null,
        other_social_url: String(profile.other_social_url || '').trim() || null,

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
        throw dbError;
      }

      clearDraft();
      toast.success('Profile saved successfully!');
      router.push('/onboarding/welcome');
    } catch (err: unknown) {
      console.error('Error saving profile:', err);

      let errorMessage = 'Failed to save profile';

      if (isErrorWithMessage(err)) {
        if (err.message.includes('Database error:')) {
          errorMessage = err.message;
        } else if (err.message.includes('JWT')) {
          errorMessage = 'Authentication error. Please try logging in again.';
        } else if (err.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = `Failed to save profile: ${err.message}`;
        }
      }

      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  /**
   * @function handleInputChange
   * @description Handles changes for standard input/select/textarea elements.
   * @param {React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>} e - The change event.
   * @returns {void}
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const { name, value } = target;

      if (name === 'display_lat' || name === 'display_lng') {
        if (name in profile) {
          setProfile((prev: ProfileState) => ({
            ...prev,
            [name]: value === '' ? null : Number.parseFloat(value),
          }));
        }
        return;
      }

      if (name in profile) {
        setProfile((prev: ProfileState) => ({
          ...prev,
          [name]: value,
        }));
      }
    },
    [setProfile, profile] // Include profile in dependencies for the 'name in profile' check safety
  );

  /**
   * @function handlePhotoUpload
   * @description Callback for the PhotoUpload component.
   * @param {string} photoUrl - The URL of the uploaded photo.
   * @returns {void}
   */
  const handlePhotoUpload = useCallback(
    (photoUrl: string) => {
      setProfile((prev: ProfileState) => ({
        ...prev,
        profile_photo_url: photoUrl,
      }));
    },
    [setProfile]
  );

  /**
   * @function verifyAddress
   * @description Uses Nominatim to verify the address and retrieve coordinates and standardized neighborhood/city data.
   * @returns {Promise<void>}
   */
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

      interface NominatimResult {
        lat: string;
        lon: string;
        address?: Record<string, string>;
      }
      const data: NominatimResult[] = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const lat = Number.parseFloat(result.lat);
        const lng = Number.parseFloat(result.lon);

        const address = result.address;
        const area =
          address?.suburb ||
          address?.city_district ||
          address?.borough ||
          address?.quarter ||
          address?.ward ||
          address?.district ||
          address?.neighborhood ||
          address?.neighbourhood ||
          address?.locality ||
          address?.residential ||
          '';

        const city =
          address?.city ||
          address?.town ||
          address?.village ||
          address?.municipality ||
          address?.hamlet ||
          '';

        const state = address?.state || '';

        const formatted = formatLocation({ neighborhood: area || '', city, state });

        setProfile((prev: ProfileState) => ({
          ...prev,
          display_lat: lat,
          display_lng: lng,
          neighborhood: formatted?.neighborhood ?? null,
          city: formatted?.city ?? null,
          state: formatted?.state ?? null,
        }));

        setAddressVerified(true);
        toast.success('Address verified successfully! Please save your profile.');
      } else {
        toast.error('Address not found. Please check your address details.');
        setAddressVerified(false);
      }
    } catch (error: unknown) {
      let message = 'Failed to verify address. Please try again.';
      if (isErrorWithMessage(error)) {
        message = `Failed to verify address: ${error.message}`;
      }
      console.error('Error verifying address:', error);
      toast.error(message);
      setAddressVerified(false);
    } finally {
      setVerifyingAddress(false);
    }
  };

  // #region Rendering
  if (isAuthLoading || loading) {
    return (
      <div className="min-h-screen w-full bg-white max-w-md mx-auto p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Loading profile data and authentication...</p>
      </div>
    );
  }

  // Final check: user must be defined if we reached here
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-white max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-black">Create Your Profile</h1>

      {/* Draft indicator */}
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
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
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
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
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
                value={user.email || ''}
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
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select your role</option>
                <option value="dog_owner">Dog Owner</option>
                <option value="petpal">PetPal</option>
                <option value="both">Both</option>
              </select>
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
                  value={profile.city ?? ''}
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
                  value={profile.state ?? ''}
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
  // #endregion Rendering
}
// #endregion Component
