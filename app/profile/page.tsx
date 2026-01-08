'use client';

// #region Imports

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState, type JSX } from 'react';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import DeletionRequestStatus from '@/components/DeletionRequestStatus';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import UserReviews from '@/components/UserReviews';
import { formatLocation } from '@/libs/utils';

// #endregion

// #region Type Definitions

/**
 * @description Defines the possible values for community support preferences.
 */
type SupportPref =
  | 'elderly_dog_owners'
  | 'sick_recovering'
  | 'low_income_families'
  | 'people_disabilities'
  | 'single_parents'
  | 'other';

/**
 * @description Represents the structure of a user's profile from the 'profiles' table.
 */
interface Profile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  profile_photo_url?: string | null;
  role?: string | null;
  support_preferences?: SupportPref[] | null;
  support_story?: string | null;
  bio?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  airbnb_url?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string;
}

// #endregion

// #region Component

/**
 * @description Renders the authenticated user's profile page.
 * Fetches and displays profile data, reviews, and provides links to edit or delete the account.
 * @returns {JSX.Element} The rendered profile page component.
 */
export default function ProfilePage(): JSX.Element {
  // #region State

  /**
   * @description The authenticated user object and loading state from the context.
   */
  const { user, loading: userLoading } = useUser();

  /**
   * @description Stores the user's profile data fetched from Supabase.
   */
  const [profile, setProfile] = useState<Profile | null>(null);

  /**
   * @description Loading state for the profile data fetch.
   */
  const [loading, setLoading] = useState<boolean>(true);

  /**
   * @description Error message string, if any, during data fetching.
   */
  const [error, setError] = useState<string | null>(null);

  /**
   * @description Toggles the visibility of the delete account confirmation modal.
   */
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  // #endregion

  // #region Data Fetching

  /**
   * @description Fetches the user's profile from the 'profiles' table based on the authenticated user's ID.
   */
  const loadProfile = useCallback(async (): Promise<void> => {
    if (!user) {
      setLoading(false);
      setError('No session');
      return;
    }

    try {
      const supabase = createClient();
      // Rename 'error' to 'dbError' to avoid conflict with state variable
      const { data, error: dbError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single<Profile>(); // Use generic to type the returned data

      if (dbError && dbError.code !== 'PGRST116') {
        throw dbError; // PGRST116 is "not found", which is fine
      }

      setProfile(data);
    } catch (err: unknown) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
    // State setters are stable and not required in deps array
  }, [user]);

  // #endregion

  // #region Effects

  /**
   * @description Effect to load the profile when the user session is available.
   */
  useEffect(() => {
    if (userLoading) return; // Wait until user loading is complete

    loadProfile();
  }, [user, userLoading, loadProfile]);

  // #endregion

  // #region Render Logic: Loading

  if (loading || userLoading) {
    return (
      <div className="min-h-screen w-full bg-white max-w-md mx-auto p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Loading your profile...</p>
      </div>
    );
  }

  // #endregion

  // #region Render Logic: Error

  if (error) {
    return (
      <div className="min-h-screen w-full bg-white max-w-md mx-auto p-6 text-center space-y-4">
        <h2 className="text-xl font-semibold text-red-600">Error Loading Profile</h2>
        <p className="text-gray-600">{error}</p>
        <button
          onClick={() => globalThis.location.reload()}
          className="inline-block bg-blue-500 text-white px-6 py-2 rounded-sm hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  // #endregion

  // #region Render Logic: No Profile (Create)

  // This block now serves as a type guard; 'profile' is non-null after this.
  if (!profile) {
    return (
      <div className="min-h-screen w-full bg-white max-w-md mx-auto p-6 text-center space-y-4">
        <h2 className="text-xl font-semibold text-black">Profile Not Found</h2>
        <p className="text-gray-600">Please complete your profile setup.</p>
        <Link
          href="/profile/edit"
          className="inline-block bg-blue-500 text-white px-6 py-2 rounded-sm hover:bg-blue-600"
        >
          Create Your Profile
        </Link>
      </div>
    );
  }

  // #endregion

  // #region Render Logic: Main Profile

  return (
    <div className="min-h-screen w-full bg-white max-w-md mx-auto space-y-6 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2 text-black">
          {profile.first_name && profile.last_name
            ? `${profile.first_name} ${profile.last_name}'s Profile`
            : 'My Profile'}
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          This information is visible to other community members
        </p>

        {/* Profile Photo */}
        {profile.profile_photo_url && (
          <div className="mb-4">
            <Image
              src={profile.profile_photo_url}
              alt="Profile"
              className="w-24 h-24 rounded-full mx-auto object-cover"
              width={96}
              height={96}
              unoptimized
            />
          </div>
        )}

        {/* User Name Display */}
        {profile.first_name && profile.last_name && (
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {profile.first_name} {profile.last_name}
            </h2>
            {profile.role && (
              <p className="text-sm text-gray-600 capitalize">{profile.role.replace('_', ' ')}</p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <Link
            href="/profile/edit"
            className="inline-block bg-blue-500 text-white px-4 py-2 rounded-sm hover:bg-blue-600"
          >
            ✏️ Edit Profile
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-block bg-red-600 text-white px-4 py-2 rounded-sm hover:bg-red-700 transition-colors"
          >
            🗑️ Delete Account
          </button>
        </div>
      </div>

      {/* Deletion Request Status */}
      <DeletionRequestStatus userId={profile.id} />

      <div className="space-y-3">
        <div className="bg-gray-50 p-3 rounded-sm">
          <span className="font-medium text-gray-700">Role:</span>
          <span className="ml-2 capitalize">{profile.role}</span>
        </div>

        {/* Community Support Preferences */}
        {((profile.support_preferences && profile.support_preferences.length > 0) ||
          profile.support_story) && (
          <div className="bg-linear-to-r from-blue-50 to-purple-50 p-4 rounded-sm border border-blue-200">
            <h3 className="font-medium text-gray-800 mb-3">Community Support Preferences</h3>

            {/* Support Preferences */}
            {profile.support_preferences && profile.support_preferences.length > 0 && (
              <div className="mb-3">
                <span className="font-medium text-gray-700">I feel most empowered supporting:</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {profile.support_preferences.map((pref: SupportPref) => (
                    <span
                      key={pref}
                      className="inline-flex items-center bg-gray-100 text-gray-700 px-2 py-1 rounded-sm text-sm"
                    >
                      {pref === 'elderly_dog_owners' && '👴🐕 Elderly dog owners'}
                      {pref === 'sick_recovering' && '🏥 Sick or recovering owners'}
                      {pref === 'low_income_families' && '💰 Low-income families'}
                      {pref === 'people_disabilities' && '♿ People with disabilities'}
                      {pref === 'single_parents' && '👨‍👩‍👧‍👦 Single parents'}
                      {pref === 'other' && '🤝 Other'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Support Story */}
            {profile.support_story && (
              <div>
                <span className="font-medium text-gray-700">
                  Additional thoughts about community support:
                </span>
                <p className="mt-1 text-sm text-gray-600">{profile.support_story}</p>
              </div>
            )}
          </div>
        )}

        {profile.bio && (
          <div className="bg-gray-50 p-3 rounded-sm">
            <span className="font-medium text-gray-700">Bio:</span>
            <p className="mt-1">{profile.bio}</p>
          </div>
        )}

        {/* Social Media Links */}
        {(profile.facebook_url ||
          profile.instagram_url ||
          profile.linkedin_url ||
          profile.airbnb_url) && (
          <div className="bg-gray-50 p-3 rounded-sm">
            <span className="font-medium text-gray-700">Social Links:</span>
            <div className="mt-2 space-y-1">
              {profile.facebook_url && (
                <a
                  href={profile.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-600 hover:underline"
                >
                  📘 Facebook
                </a>
              )}
              {profile.instagram_url && (
                <a
                  href={profile.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-pink-600 hover:underline"
                >
                  📷 Instagram
                </a>
              )}
              {profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-700 hover:underline"
                >
                  💼 LinkedIn
                </a>
              )}
              {profile.airbnb_url && (
                <a
                  href={profile.airbnb_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-red-500 hover:underline"
                >
                  🏠 Airbnb
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Location */}
      {profile.neighborhood && profile.city && (
        <div className="space-y-2">
          <h3 className="font-medium text-gray-700">Location</h3>
          <div className="bg-gray-50 p-3 rounded-sm">
            {(() => {
              const formattedLocation = formatLocation({
                neighborhood: profile.neighborhood,
                city: profile.city,
                state: profile.state,
              }) as { neighborhood?: string; city?: string; state?: string };
              return (
                <span className="font-medium text-gray-700">
                  📍 {formattedLocation.neighborhood}, {formattedLocation.city}
                  {formattedLocation.state && `, ${formattedLocation.state}`}
                </span>
              );
            })()}
            <div className="text-xs text-gray-500 mt-1">
              Approximate location for community matching. Your exact address remains private.
            </div>
          </div>
        </div>
      )}

      {/* Reviews Section */}
      <div className="space-y-2">
        <h3 className="font-medium text-gray-700">My Reviews</h3>
        <UserReviews profileId={profile.id} showAll={true} />
      </div>

      {/* Delete Account Modal */}
      <DeleteAccountModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} />
    </div>
  );

  // #endregion
}

// #endregion
