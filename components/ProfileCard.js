import Link from 'next/link';
import Image from 'next/image';

// List of common patterns found in provider placeholder URLs
// This is less fragile than a single hardcoded URL, but still client-side.
const BAD_URL_PATTERNS = [
  // Common Google placeholder URLs:
  'googleusercontent.com/profile/picture/0', // Matches the original, but as a pattern
  '/profile/picture/0',
  // Add other known bad patterns (e.g., from other providers) here:
  // 'facebook.com/images/default_profile',
  // 's3.amazonaws.com/placeholders/default',
];

export default function ProfileCard({ profile, onMessage }) {
  const { id, first_name, photo_url, city, neighborhood, role, bio_excerpt } = profile;

  // ---------------------------------------------------------------------
  // NEW CONDITIONAL CHECK:
  // Check if photo_url is truthy AND does NOT contain any known bad patterns.
  // This is a more robust client-side fix than hardcoding a single URL.
  const isPlaceholderUrl =
    photo_url && BAD_URL_PATTERNS.some((pattern) => photo_url.includes(pattern));

  const isValidImageUrl = photo_url && !isPlaceholderUrl;
  // ---------------------------------------------------------------------

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

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-200 hover:shadow-lg transition-all duration-200">
      {/* Profile Header */}
      <div className="flex items-center space-x-3 mb-4">
        {/* FIX: Only render Image if the URL is valid and not a known placeholder pattern */}
        {isValidImageUrl ? (
          <Image
            src={photo_url}
            alt={first_name}
            className="w-12 h-12 rounded-full object-cover"
            onError={(e) => {
              // On genuine failure, hide the image and show the fallback icon container.
              console.error('Profile image failed to load:', photo_url);
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'flex';
            }}
            unoptimized
          />
        ) : null}
        <div
          data-testid="fallback-icon-container"
          // FIX: The fallback is now shown if the URL is missing OR if it matches a known placeholder pattern
          className={`w-12 h-12 bg-linear-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center ${isValidImageUrl ? 'hidden' : ''}`}
        >
          <span className="text-xl">{getRoleIcon(role)}</span>
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{first_name}</h4>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>{getRoleIcon(role)}</span>
            <span className="capitalize">{role.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      {/* Location */}
      {(city || neighborhood) && (
        <div className="mb-3">
          <p className="text-sm text-gray-600">
            📍 {[neighborhood, city].filter(Boolean).join(', ')}
          </p>
        </div>
      )}

      {/* Bio */}
      {bio_excerpt && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 line-clamp-3">{bio_excerpt}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
        <Link
          href={`/profile/${id}`}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm text-center"
        >
          View Details
        </Link>
        <button
          onClick={() => onMessage(profile)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
        >
          Message
        </button>
      </div>
    </div>
  );
}
