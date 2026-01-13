'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ProfileCard from './ProfileCard';

export default function ProfilesList({ role, onMessage, locationFilter }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef(null);

  const isFetchingRef = useRef(false);

  const fetchProfiles = useCallback(
    async (cursor = null, isReset = false) => {
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ limit: '24' });
        if (cursor) params.append('cursor', cursor);
        if (role) params.append('role', role);
        if (locationFilter?.lat) {
          params.append('lat', locationFilter.lat);
          params.append('lng', locationFilter.lng);
          params.append('radius', locationFilter.radius);
        }

        const res = await fetch(`/api/community/profiles?${params}`);
        if (!res.ok) throw new Error('Failed to fetch profiles');

        const data = await res.json();
        const newItems = data.items || [];

        setProfiles((prev) => {
          if (isReset) return newItems;
          const map = new Map(prev.map((p) => [p.id, p]));
          newItems.forEach((p) => map.set(p.id, p));
          return Array.from(map.values());
        });

        setNextCursor(data.nextCursor ?? null);
        setHasMore(Boolean(data.nextCursor));
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Could not load profiles. Please try again.');
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    },
    [role, locationFilter]
  );

  useEffect(() => {
    fetchProfiles(null, true);
  }, [fetchProfiles]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Only trigger if not already loading
        if (entry.isIntersecting && hasMore && !loading && !isFetchingRef.current) {
          fetchProfiles(nextCursor);
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [nextCursor, hasMore, loading, fetchProfiles]);

  if (error && profiles.length === 0) {
    return (
      <div className="text-center py-12 bg-red-50 rounded-xl border border-red-100">
        <p className="text-red-600 font-medium mb-4">{error}</p>
        <button
          onClick={() => fetchProfiles(null, true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {profiles.map((p) => (
          <ProfileCard key={p.id} profile={p} onMessage={onMessage} />
        ))}
      </div>

      {/* Sentinel: Only render if we have profiles or are loading to avoid false triggers */}
      {(hasMore || loading) && profiles.length > 0 && (
        <div ref={sentinelRef} className="h-20 w-full flex items-center justify-center">
          {loading && (
            <div className="animate-pulse text-gray-500 font-medium">Loading more neighbors...</div>
          )}
        </div>
      )}

      {!hasMore && profiles.length > 0 && (
        <p className="text-center text-gray-400 text-sm italic py-8">
          You&apos;ve reached the end of the community.
        </p>
      )}

      {!loading && profiles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No profiles found matching your filters.</p>
        </div>
      )}
    </div>
  );
}
