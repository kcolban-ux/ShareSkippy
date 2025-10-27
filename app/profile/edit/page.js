"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/libs/supabase/client";
import { useUser } from "@/libs/supabase/hooks";
import { useProfileDraft } from "@/hooks/useProfileDraft";
import toast from 'react-hot-toast';
import PhotoUpload from '../../../components/ui/PhotoUpload';
import { formatLocation } from '@/libs/utils';

export default function ProfileEditPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifyingAddress, setVerifyingAddress] = useState(false);
  const [addressVerified, setAddressVerified] = useState(false);
  // Initial profile state
  const initialProfile = {
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
    zip_code: ''
  };

  // Use the sessionStorage-based profile draft hook
  const {
    profile,
    setProfile,
    loadDraft,
    clearDraft,
    hasDraft,
    draftSource
  } = useProfileDraft(initialProfile);

  useEffect(() => {
    if (userLoading) return;
    
    if (!user) {
      router.push('/signin');
      return;
    }
    
    // Try to load draft first, then load profile
    const draft = loadDraft();
    if (draft) {
      // eslint-disable-next-line no-console
      console.log('📂 Restoring profile draft from sessionStorage');
      setLoading(false);
    } else {
      loadProfile();
    }
  }, [user, userLoading, router, loadDraft]);

  const loadProfile = async () => {
    try {
      const supabase = createClient();
      
      console.log('Loading profile for user:', user?.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        if (error.code === 'PGRST116') {
          console.log('Profile not found, will create new one');
          // Profile doesn't exist yet, that's okay
        } else {
          throw error;
        }
      }
      
      // Get Google auth metadata for pre-filling
      const userMetadata = user?.user_metadata || {};
      const googleGivenName = userMetadata?.given_name || userMetadata?.first_name;
      const googleFamilyName = userMetadata?.family_name || userMetadata?.last_name;
      const googlePicture = userMetadata?.picture || userMetadata?.avatar_url;
      
      console.log('🔍 Debug: Google user metadata for pre-filling:', {
        given_name: googleGivenName,
        family_name: googleFamilyName,
        picture: googlePicture
      });
      
      if (data) {
        console.log('Profile loaded successfully:', data);
        setProfile({
          first_name: data.first_name || googleGivenName || '',
          last_name: data.last_name || googleFamilyName || '',
          phone_number: data.phone_number || '',
          role: data.role || '',
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_number: data.emergency_contact_number || '',
          emergency_contact_email: data.emergency_contact_email || '',
          bio: data.bio || '',
          facebook_url: data.facebook_url || '',
          instagram_url: data.instagram_url || '',
          linkedin_url: data.linkedin_url || '',
          airbnb_url: data.airbnb_url || '',
          other_social_url: data.other_social_url || '',
          community_support_badge: data.community_support_badge || '',
          support_preferences: data.support_preferences || [],
          support_story: data.support_story || '',
          other_support_description: data.other_support_description || '',
          profile_photo_url: data.profile_photo_url || googlePicture || '',
          display_lat: data.display_lat || null,
          display_lng: data.display_lng || null,
          neighborhood: data.neighborhood || '',
          city: data.city || '',
          street_address: data.street_address || '',
          state: data.state || '',
          zip_code: data.zip_code || ''
        });
      } else {
        console.log('No profile data found, using Google data for pre-filling');
        setProfile({
          first_name: googleGivenName || '',
          last_name: googleFamilyName || '',
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
          profile_photo_url: googlePicture || '',
          display_lat: null,
          display_lng: null,
          neighborhood: '',
          city: '',
          street_address: '',
          state: '',
          zip_code: ''
        });
      }

    } catch (err) {
      console.error('Error loading profile:', err);
      toast.error(`Failed to load profile: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const supabase = createClient();
      
      // Validate required fields
      if (!profile.first_name?.trim() || !profile.last_name?.trim() || !profile.phone_number?.trim() || !profile.role?.trim()) {
        toast.error('Please fill in all required fields (First Name, Last Name, Phone Number, and Role)');
        setSaving(false);
        return;
      }

      // Prepare profile data with proper data types
      // Only include columns that exist in the database
      const profileData = {
        id: user.id,
        email: user.email,
        first_name: profile.first_name.trim(),
        last_name: profile.last_name.trim(),
        phone_number: profile.phone_number.trim(),
        role: profile.role.trim(),
        emergency_contact_name: profile.emergency_contact_name?.trim() || null,
        emergency_contact_number: profile.emergency_contact_number?.trim() || null,
        emergency_contact_email: profile.emergency_contact_email?.trim() || null,
        bio: profile.bio?.trim() || null,
        facebook_url: profile.facebook_url?.trim() || null,
        instagram_url: profile.instagram_url?.trim() || null,
        linkedin_url: profile.linkedin_url?.trim() || null,
        airbnb_url: profile.airbnb_url?.trim() || null,
        other_social_url: profile.other_social_url?.trim() || null,
        community_support_badge: profile.community_support_badge?.trim() || null,
        support_preferences: profile.support_preferences || [],
        support_story: profile.support_story?.trim() || null,
        other_support_description: profile.other_support_description?.trim() || null,
        profile_photo_url: profile.profile_photo_url?.trim() || null,
        display_lat: profile.display_lat ? parseFloat(profile.display_lat) : null,
        display_lng: profile.display_lng ? parseFloat(profile.display_lng) : null,
        street_address: profile.street_address?.trim() || null,
        state: profile.state?.trim() || null,
        zip_code: profile.zip_code?.trim() || null,
        updated_at: new Date().toISOString()
      };

      // Format location data with proper capitalization
      const formattedLocation = formatLocation({
        neighborhood: profile.neighborhood?.trim() || '',
        city: profile.city?.trim() || '',
        state: profile.state?.trim() || ''
      });

      // Add location data with proper capitalization
      if (formattedLocation.neighborhood) {
        profileData.neighborhood = formattedLocation.neighborhood;
      }
      if (formattedLocation.city) {
        profileData.city = formattedLocation.city;
      }
      if (formattedLocation.state) {
        profileData.state = formattedLocation.state;
      }

      console.log('Attempting to save profile with data:', profileData);
      
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'id'
        });

      if (error) {
        console.error('Supabase error details:', error);
        throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
      }

      // eslint-disable-next-line no-console
      console.log('Profile saved successfully:', data);
      toast.success('Profile saved successfully!');
      
      // Clear the draft since profile is now saved
      clearDraft();
      
      // eslint-disable-next-line no-console
      console.log('Redirecting to welcome page...');
      
      // Use window.location for a full page navigation to ensure proper context loading
      window.location.href = '/onboarding/welcome';
    } catch (err) {
      console.error('Error saving profile:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to save profile';
      if (err.message.includes('Database error:')) {
        errorMessage = err.message;
      } else if (err.message.includes('JWT')) {
        errorMessage = 'Authentication error. Please try logging in again.';
      } else if (err.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSupportPreferenceChange = (preference) => {
    setProfile(prev => ({
      ...prev,
      support_preferences: prev.support_preferences.includes(preference)
        ? prev.support_preferences.filter(p => p !== preference)
        : [...prev.support_preferences, preference]
    }));
  };

  const handlePhotoUpload = (photoUrl) => {
    setProfile(prev => ({
      ...prev,
      profile_photo_url: photoUrl
    }));
  };

  const verifyAddress = async () => {
    if (!profile.street_address.trim() || !profile.city.trim() || !profile.state.trim() || !profile.zip_code.trim()) {
      toast.error('Please fill in all address fields');
      return;
    }

    setVerifyingAddress(true);
    try {
      // Create a full address string for geocoding
      const fullAddress = `${profile.street_address}, ${profile.city}, ${profile.state} ${profile.zip_code}`;
      
      // Get geocoding result
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1&addressdetails=1`);
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
          result.address.neighborhood ||      // US spelling
          result.address.neighbourhood ||     // Intl spelling
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

        // State (if present):
        const state = result.address.state || '';

        // Then keep existing formatting:
        const formatted = formatLocation({
          neighborhood: area || '',
          city,
          state
        });
        
        // Update profile with verified location (with proper capitalization)
        
        setProfile(prev => ({
          ...prev,
          display_lat: lat,
          display_lng: lng,
          neighborhood: formatted.neighborhood,
          city: formatted.city,
          state: formatted.state
        }));

        setAddressVerified(true);
        toast.success('Address verified successfully!');
      } else {
        toast.error('Address not found. Please check your address details.');
      }
    } catch (error) {
      console.error('Error verifying address:', error);
      toast.error('Failed to verify address. Please try again.');
    } finally {
      setVerifyingAddress(false);
    }
  };

  if (loading || userLoading) {
    return (
      <div className="min-h-screen w-full bg-white max-w-md mx-auto p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-black">Create Your Profile</h1>
      
      {/* Draft indicator */}
      {hasDraft && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
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
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Photo
              </label>
              <PhotoUpload
                onPhotoUploaded={handlePhotoUpload}
                initialPhotoUrl={profile.profile_photo_url}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={profile.first_name}
                  onChange={handleInputChange}
                  required
                  placeholder="First Name"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={profile.last_name}
                  onChange={handleInputChange}
                  required
                  placeholder="Last Name"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={profile.email || user?.email || ''}
                disabled
                className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone_number"
                value={profile.phone_number}
                onChange={handleInputChange}
                required
                placeholder="Phone Number"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role *
              </label>
              <select
                name="role"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                name="bio"
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
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Social Media Links</h2>
          <p className="text-sm text-gray-600 mb-4">
            To help verify your identity and build trust in the community, please share your social media profiles.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Facebook URL
              </label>
              <input
                type="url"
                name="facebook_url"
                value={profile.facebook_url}
                onChange={handleInputChange}
                placeholder="https://facebook.com/yourprofile"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instagram URL
              </label>
              <input
                type="url"
                name="instagram_url"
                value={profile.instagram_url}
                onChange={handleInputChange}
                placeholder="https://instagram.com/yourprofile"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LinkedIn URL
              </label>
              <input
                type="url"
                name="linkedin_url"
                value={profile.linkedin_url}
                onChange={handleInputChange}
                placeholder="https://linkedin.com/in/yourprofile"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Airbnb URL
              </label>
              <input
                type="url"
                name="airbnb_url"
                value={profile.airbnb_url}
                onChange={handleInputChange}
                placeholder="https://airbnb.com/users/show/yourprofile"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Other Social Media URL
              </label>
              <input
                type="url"
                name="other_social_url"
                value={profile.other_social_url}
                onChange={handleInputChange}
                placeholder="https://your-other-profile.com"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Location</h2>
          <p className="text-sm text-gray-600 mb-4">
            Enter your address to help community members find you. Only your neighborhood and city will be shown publicly.
          </p>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  name="street_address"
                  value={profile.street_address}
                  onChange={handleInputChange}
                  placeholder="123 Main Street"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={profile.city}
                  onChange={handleInputChange}
                  placeholder="Berkeley"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={profile.state}
                  onChange={handleInputChange}
                  placeholder="CA"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  name="zip_code"
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
                  disabled={verifyingAddress || !profile.street_address.trim() || !profile.city.trim() || !profile.state.trim() || !profile.zip_code.trim()}
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
                  <div><strong>Neighborhood:</strong> {profile.neighborhood}</div>
                  <div><strong>City:</strong> {profile.city}</div>
                  <div className="text-xs text-green-600 mt-2">
                    This is what will be shown publicly to other community members.
                  </div>
                </div>
              </div>
            )}
            

            
            <div className="text-xs text-gray-500">
              💡 Your exact address is never shared publicly. Only your neighborhood and city are visible to help with community matching.
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Emergency Contact</h2>
          <p className="text-sm text-gray-600 mb-4">
            Optional emergency contact information for safety purposes.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Emergency Contact
              </label>
              <div className="space-y-3">
                <input
                  type="text"
                  name="emergency_contact_name"
                  value={profile.emergency_contact_name}
                  onChange={handleInputChange}
                  placeholder="Name"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
                <input
                  type="tel"
                  name="emergency_contact_number"
                  value={profile.emergency_contact_number}
                  onChange={handleInputChange}
                  placeholder="Phone Number"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
                <input
                  type="email"
                  name="emergency_contact_email"
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
