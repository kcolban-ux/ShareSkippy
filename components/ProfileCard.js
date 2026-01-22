'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// List of common patterns found in provider placeholder URLs
const BAD_URL_PATTERNS = ['googleusercontent.com/profile/picture/0', '/profile/picture/0'];

/**
 * ProfileCard component to display user summary information.
 * @param {Object} props
 * @param {Object} props.profile - The profile object containing id, first_name, photo_url, etc.
 * @param {Function} props.onMessage - Callback function triggered when 'Message' button is clicked.
 */
export default function ProfileCard({ profile, onMessage }) {
  const { id, first_name, photo_url, city, neighborhood, role, bio_excerpt } = profile;

  // Track image loading errors via state to trigger re-renders
  const [imgError, setImgError] = useState(false);

  // Logic to determine if we should even attempt to show the image
  const isPlaceholderUrl =
    photo_url && BAD_URL_PATTERNS.some((pattern) => photo_url.includes(pattern));
  const shouldShowImage = photo_url && !isPlaceholderUrl && !imgError;

  const getRoleIcon = (role) => {
    switch (role) {
      case 'dog_owner':
        return '🐕';
      case 'petpal':
        return '🤝';
      case 'both':
        return '🐕‍🦺'; // Exact emoji expected by test
      default:
        return '👤';
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-200 hover:shadow-lg transition-all duration-200 flex flex-col h-full">
      <div className="flex items-center space-x-3 mb-4">
        {/* Profile Image - Using state for visibility to satisfy test style assertions */}
        {photo_url && !isPlaceholderUrl && (
          <Image
            src={photo_url}
            alt={first_name}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full object-cover"
            style={{ display: imgError ? 'none' : 'block' }}
            onError={() => setImgError(true)}
            unoptimized
          />
        )}

        {/* Fallback Icon Container - Shows if image fails or is missing */}
        <div
          data-testid="fallback-icon-container"
          className={`w-12 h-12 bg-linear-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center ${shouldShowImage ? 'hidden' : ''}`}
          style={{ display: shouldShowImage ? 'none' : 'flex' }}
        >
          <span className="text-xl">{getRoleIcon(role)}</span>
        </div>

        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{first_name}</h4>
          {/* Role line item - Test searches for text content following the name */}
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>{getRoleIcon(role)}</span>
            <span className="capitalize">{role.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      {/* Location Section */}
      {(city || neighborhood) && (
        <p className="text-sm text-gray-600 mb-3">
          📍 {[neighborhood, city].filter(Boolean).join(', ')}
        </p>
      )}

      {/* Bio Excerpt */}
      {bio_excerpt && <p className="text-sm text-gray-600 line-clamp-3 mb-4 grow">{bio_excerpt}</p>}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mt-auto">
        <Link
          href={`/profile/${id}`}
          className="flex-1 border-2 border-gray-300 text-gray-700 bg-white px-5 py-3 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all text-base text-center font-medium"
        >
          View Details
        </Link>
        <button
          onClick={() => onMessage(profile)}
          className="flex-1 bg-green-600 text-white px-5 py-3 rounded-lg hover:bg-green-700 shadow-sm hover:shadow-md transition-all text-base font-medium"
        >
          Message
        </button>
      </div>
    </div>
  );
}
