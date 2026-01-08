'use client';
import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatLocation } from '@/libs/utils';
import UserReviews from '@/components/UserReviews';
import MessageModal from '@/components/MessageModal';

export default function PublicProfilePage() {
  const params = useParams();
  const profileId = params.id;

  const [profile, setProfile] = useState(null);
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [messageModal, setMessageModal] = useState({ isOpen: false, recipient: null });

  const loadCurrentUser = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (err) {
      console.error('Error loading current user:', err);
    }
  }, [setCurrentUser]);

  const loadProfile = useCallback(async () => {
    try {
      const supabase = createClient();

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (profileError) throw profileError;

      if (!profileData) {
        setError('Profile not found');
        setLoading(false);
        return;
      }

      setProfile(profileData);

      const { data: dogsData, error: dogsError } = await supabase
        .from('dogs')
        .select('*')
        .eq('owner_id', profileId);

      if (!dogsError && dogsData) {
        setDogs(dogsData);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [profileId, setProfile]);

  useEffect(() => {
    loadProfile();
    loadCurrentUser();
  }, [loadProfile, loadCurrentUser]);

  const openMessageModal = () => {
    setMessageModal({ isOpen: true, recipient: profile });
  };

  const closeMessageModal = () => {
    setMessageModal({ isOpen: false, recipient: null });
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="max-w-md mx-auto p-6 text-center space-y-4">
          <h2 className="text-2xl font-bold text-red-600">Error</h2>
          <p className="text-gray-600">{error}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
            <Link
              href="/community"
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
            >
              Back to Community
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen w-full bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="max-w-md mx-auto p-6 text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Profile Not Found</h2>
          <p className="text-gray-600">
            This profile doesn&apos;t exist or is no longer available.
          </p>
          <Link
            href="/community"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Community
          </Link>
        </div>
      </div>
    );
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'dog_owner':
        return '🐕';
      case 'petpal':
        return '🤝';
      case 'both':
        return '🐕‍🦺';
      default:
        return '👤';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'dog_owner':
        return 'Dog Owner';
      case 'petpal':
        return 'PetPal';
      case 'both':
        return 'Dog Owner & PetPal';
      default:
        return 'Community Member';
    }
  };

  return (
    <div className="min-h-screen w-full bg-linear-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/community"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <span className="mr-2">←</span>
            Back to Community
          </Link>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-6">
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 mb-6">
            {/* Profile Photo */}
            {profile.profile_photo_url ? (
              <Image
                src={profile.profile_photo_url}
                alt={`${profile.first_name}'s profile`}
                width={128}
                height={128}
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-blue-100"
                unoptimized
              />
            ) : (
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-linear-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center text-4xl border-4 border-blue-100">
                {getRoleIcon(profile.role)}
              </div>
            )}

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {profile.first_name} {profile.last_name}
              </h1>
              <div className="flex items-center justify-center sm:justify-start space-x-2 mb-3">
                <span className="text-2xl">{getRoleIcon(profile.role)}</span>
                <span className="text-lg text-gray-600">{getRoleLabel(profile.role)}</span>
              </div>

              {/* Location */}
              {(profile.neighborhood || profile.city) && (
                <div className="flex items-center justify-center sm:justify-start text-gray-600 mb-4">
                  <span className="mr-2">📍</span>
                  <span>
                    {(() => {
                      const formattedLocation = formatLocation({
                        neighborhood: profile.neighborhood,
                        city: profile.city,
                        state: profile.state,
                      });
                      return (
                        <>
                          {formattedLocation.neighborhood && `${formattedLocation.neighborhood}, `}
                          {formattedLocation.city}
                          {formattedLocation.state && `, ${formattedLocation.state}`}
                        </>
                      );
                    })()}
                  </span>
                </div>
              )}

              {/* Message Button */}
              {currentUser && currentUser.id !== profile.id && (
                <button
                  onClick={openMessageModal}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  💬 Send Message
                </button>
              )}

              {currentUser && currentUser.id === profile.id && (
                <Link
                  href="/profile/edit"
                  className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ✏️ Edit Profile
                </Link>
              )}

              {!currentUser && <p className="text-sm text-gray-500">Sign in to send a message</p>}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">About</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{profile.bio}</p>
            </div>
          )}

          {/* Community Support Preferences */}
          {(profile.support_preferences?.length > 0 || profile.support_story) && (
            <div className="mb-6 p-4 bg-linear-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-3">Community Support Preferences</h3>

              {/* Support Preferences */}
              {profile.support_preferences && profile.support_preferences.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Feels most empowered supporting:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.support_preferences.map((pref) => (
                      <span
                        key={pref}
                        className="inline-flex items-center bg-white text-gray-700 px-3 py-1 rounded-full text-sm border border-blue-200"
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
                  <p className="text-sm font-medium text-gray-700 mb-2">Additional thoughts:</p>
                  <p className="text-sm text-gray-700">{profile.support_story}</p>
                </div>
              )}
            </div>
          )}

          {/* Social Links */}
          {(profile.facebook_url ||
            profile.instagram_url ||
            profile.linkedin_url ||
            profile.airbnb_url) && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Social Links</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {profile.facebook_url && (
                  <a
                    href={profile.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center p-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    📘 Facebook
                  </a>
                )}
                {profile.instagram_url && (
                  <a
                    href={profile.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center p-3 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition-colors"
                  >
                    📷 Instagram
                  </a>
                )}
                {profile.linkedin_url && (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center p-3 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    💼 LinkedIn
                  </a>
                )}
                {profile.airbnb_url && (
                  <a
                    href={profile.airbnb_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center p-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    🏠 Airbnb
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dogs Section */}
        {dogs.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">🐕</span>
              {profile.first_name}&apos;s {dogs.length === 1 ? 'Dog' : 'Dogs'}{' '}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dogs.map((dog) => (
                <div key={dog.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center space-x-4">
                    {dog.photo_url ? (
                      <Image
                        src={dog.photo_url}
                        alt={dog.name}
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-2xl">
                        🐕
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">{dog.name}</h3>
                      <p className="text-sm text-gray-600">{dog.breed}</p>
                      {dog.age && <p className="text-sm text-gray-500">{dog.age} years old</p>}
                      {dog.size && (
                        <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {dog.size}
                        </span>
                      )}
                    </div>
                  </div>
                  {dog.bio && <p className="mt-3 text-sm text-gray-600">{dog.bio}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">⭐</span>
            Reviews
          </h2>
          <UserReviews userId={profile.id} showAll={true} />
        </div>
      </div>

      {/* Message Modal */}
      <MessageModal
        isOpen={messageModal.isOpen}
        onClose={closeMessageModal}
        recipient={messageModal.recipient}
      />
    </div>
  );
}
