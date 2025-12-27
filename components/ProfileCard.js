import Link from 'next/link';
import Image from 'next/image';

const BAD_URL_PATTERNS = ['googleusercontent.com/profile/picture/0', '/profile/picture/0'];

/**
 * ProfileCard component to display user summary information.
 * * @param {Object} props
 * @param {Object} props.profile - The profile object containing id, first_name, photo_url, etc.
 * @param {Function} props.onMessage - Callback function triggered when 'Message' button is clicked.
 */
export default function ProfileCard({ profile, onMessage }) {
  const { id, first_name, photo_url, city, neighborhood, role, bio_excerpt } = profile;

  const isPlaceholderUrl =
    photo_url && BAD_URL_PATTERNS.some((pattern) => photo_url.includes(pattern));
  const isValidImageUrl = photo_url && !isPlaceholderUrl;

  const getRoleIcon = (role) => {
    switch (role) {
      case 'dog_owner':
        return '🐶';
      case 'petpal':
        return '🤝';
      case 'both':
        return '🐶🤝';
      default:
        return '👤';
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-200 hover:shadow-lg transition-all duration-200 flex flex-col h-full">
      <div className="flex items-center space-x-3 mb-4">
        {isValidImageUrl ? (
          <Image
            src={photo_url}
            alt={first_name}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.parentElement?.querySelector(
                '[data-testid="fallback-icon-container"]'
              );
              if (fallback) fallback.classList.remove('hidden');
            }}
            unoptimized
          />
        ) : null}

        <div
          data-testid="fallback-icon-container"
          className={`w-12 h-12 bg-linear-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center ${isValidImageUrl ? 'hidden' : ''}`}
        >
          <span className="text-xl">{getRoleIcon(role)}</span>
        </div>

        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{first_name}</h4>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span className="capitalize">{role.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      {(city || neighborhood) && (
        <p className="text-sm text-gray-600 mb-3">
          📍 {[neighborhood, city].filter(Boolean).join(', ')}
        </p>
      )}

      {bio_excerpt && <p className="text-sm text-gray-600 line-clamp-3 mb-4 grow">{bio_excerpt}</p>}

      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-auto">
        <Link
          href={`/profile/${id}`}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm text-center"
        >
          View Details
        </Link>
        <button
          onClick={() => onMessage(profile)}
          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
        >
          Message
        </button>
      </div>
    </div>
  );
}
