'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/libs/supabase/client';
import { useUser } from '@/libs/supabase/hooks';
import { formatLocation } from '@/libs/utils';
import DeleteAccountModal from '../../components/DeleteAccountModal';
import UserReviews from '../../components/UserReviews';
import DeletionRequestStatus from '../../components/DeletionRequestStatus';

export default function ProfilePage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setError('No session');
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"

      setProfile(data);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    if (userLoading) return;

    loadProfile();
  }, [user, userLoading, loadProfile]);

  if (loading || userLoading) {
    return (
      <div className="min-h-screen w-full bg-white max-w-md mx-auto p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-white max-w-md mx-auto p-6 text-center space-y-4">
        <h2 className="text-xl font-semibold text-red-600">Error Loading Profile</h2>
        <p className="text-gray-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="inline-block bg-blue-500 text-white px-6 py-2 rounded-sm hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

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
            <img
              src={profile.profile_photo_url}
              alt="Profile"
              className="w-24 h-24 rounded-full mx-auto object-cover"
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
        {(profile.support_preferences?.length > 0 || profile.support_story) && (
          <div className="bg-linear-to-r from-blue-50 to-purple-50 p-4 rounded-sm border border-blue-200">
            <h3 className="font-medium text-gray-800 mb-3">Community Support Preferences</h3>

            {/* Support Preferences */}
            {profile.support_preferences && profile.support_preferences.length > 0 && (
              <div className="mb-3">
                <span className="font-medium text-gray-700">
                  I feel most empowered supporting: (Select all that apply)
                </span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {profile.support_preferences.map((pref) => (
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
              });
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
        <UserReviews userId={profile.id} showAll={true} />
      </div>

      {/* Delete Account Modal */}
      <DeleteAccountModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} />
    </div>
  );
}
