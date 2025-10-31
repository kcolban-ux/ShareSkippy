'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ProfileCard from './ProfileCard';

export default function ProfilesList({ role, onMessage }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState(null);
  
  const observerRef = useRef();
  const listRef = useRef();

  // Intersection observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading && hasMore) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (listRef.current) {
      observer.observe(listRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, hasMore]);

  // Fetch profiles
  const fetchProfiles = useCallback(async (cursor = null) => {
    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '24');
      // Add multiple cache-busting parameters
      params.append('_t', Date.now());
      params.append('_r', Math.random().toString(36).substring(7));
      params.append('_v', '1.0.0');

      const response = await fetch(`/api/community/profiles?${params}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (cursor) {
        // Append to existing profiles
        setProfiles(prev => [...prev, ...data.items]);
      } else {
        // Replace profiles
        setProfiles(data.items);
      }
      
      setNextCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } catch (err) {
      console.error('Error fetching profiles:', err);
      setError('Failed to load profiles. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Load more profiles
  const loadMore = useCallback(() => {
    if (nextCursor && !loading) {
      fetchProfiles(nextCursor);
    }
  }, [nextCursor, loading, fetchProfiles]);

  // Initial load when component becomes visible
  useEffect(() => {
    if (isVisible && profiles.length === 0 && !loading) {
      fetchProfiles();
    }
  }, [isVisible, profiles.length, loading, fetchProfiles]);

  // Filter profiles by role
  const filteredProfiles = profiles.filter(profile => {
    if (role === 'dog_owner') {
      return profile.role === 'dog_owner' || profile.role === 'both';
    } else if (role === 'petpal') {
      return profile.role === 'petpal' || profile.role === 'both';
    }
    return true;
  });

  // Skeleton loader component
  const SkeletonCard = () => (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-200 animate-pulse">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded-sm w-24 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded-sm w-32"></div>
        </div>
      </div>
      <div className="mb-3">
        <div className="h-3 bg-gray-200 rounded-sm w-40"></div>
      </div>
      <div className="mb-4">
        <div className="h-3 bg-gray-200 rounded-sm w-full mb-2"></div>
        <div className="h-3 bg-gray-200 rounded-sm w-3/4"></div>
      </div>
      <div className="flex space-x-2">
        <div className="h-8 bg-gray-200 rounded-sm w-20"></div>
        <div className="h-8 bg-gray-200 rounded-sm w-20"></div>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={() => fetchProfiles()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div ref={listRef} className="space-y-6">
      {/* Profiles Grid */}
      {filteredProfiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredProfiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onMessage={onMessage}
            />
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      )}

      {/* Load More Button */}
      {!loading && hasMore && filteredProfiles.length > 0 && (
        <div className="text-center">
          <button
            onClick={loadMore}
            className="bg-linear-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
          >
            Load More Profiles
          </button>
        </div>
      )}

      {/* No Profiles State */}
      {!loading && filteredProfiles.length === 0 && profiles.length > 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">
            {role === 'dog_owner' ? '🐕' : '🤝'}
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
            No {role === 'dog_owner' ? 'Dog Owners' : 'PetPals'} available right now
          </h3>
          <p className="text-sm sm:text-base text-gray-600">
            Check back later for new profiles!
          </p>
        </div>
      )}

      {/* Empty State (when no profiles at all) */}
      {!loading && profiles.length === 0 && !isVisible && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
            Loading profiles...
          </h3>
          <p className="text-sm sm:text-base text-gray-600">
            Please wait while we load the community profiles.
          </p>
        </div>
      )}
    </div>
  );
}

