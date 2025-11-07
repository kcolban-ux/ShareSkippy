'use client';

import Link from 'next/link';

const formatRole = (role) => {
  if (!role) return null;
  const normalized = role.toLowerCase();
  if (normalized === 'owner' || normalized === 'dog_owner') return 'Owner';
  if (normalized === 'petpal' || normalized === 'dog_sitter') return 'PetPal';
  if (normalized === 'both') return 'Owner · PetPal';
  return null;
};

export default function MessagesProfileCard({ profile, userId }) {
  if (!profile) return null;

  const { id, first_name, last_name, profile_photo_url, role, city, neighborhood } = profile;
  const displayName = `${first_name || ''} ${last_name || ''}`.trim() || 'Unknown User';
  const roleLabel = formatRole(role);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center space-x-3 mb-3">
        <Link
          href={`/profile/${id}`}
          className="flex-shrink-0"
        >
          {profile_photo_url ? (
            <img
              src={profile_photo_url}
              alt={displayName}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center text-lg font-medium text-gray-600">
              {displayName[0] || '👤'}
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            href={`/profile/${id}`}
            className="block"
          >
            <h4 className="font-semibold text-gray-900 truncate hover:text-blue-600 transition-colors">
              {displayName}
            </h4>
          </Link>
          {roleLabel && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
              {roleLabel}
            </span>
          )}
        </div>
      </div>
      
      {(city || neighborhood) && (
        <div className="text-sm text-gray-600">
          📍 {[neighborhood, city].filter(Boolean).join(', ')}
        </div>
      )}

      <Link
        href={`/profile/${id}`}
        className="mt-3 inline-block w-full text-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
      >
        View Profile
      </Link>
    </div>
  );
}

