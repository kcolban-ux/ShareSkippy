import Link from 'next/link';
import Image from 'next/image';

export default function ProfileCard({ profile, onMessage }) {
  const { id, first_name, photo_url, city, neighborhood, role, bio_excerpt } = profile;

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
        {photo_url ? (
          <Image
            src={photo_url}
            alt={first_name}
            className="w-12 h-12 rounded-full object-cover"
            onError={(e) => {
              console.error('Profile image failed to load:', photo_url);
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className={`w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center ${photo_url ? 'hidden' : ''}`}
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
