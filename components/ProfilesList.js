'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ProfileCard from './ProfileCard';

export default function ProfilesList({ role, onMessage, locationFilter }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef(null);

  const fetchProfiles = useCallback(
    async (cursor = null, isReset = false) => {
      setLoading(true);
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
        const data = await res.json();
        const newItems = data.items || [];

        setProfiles((prev) => {
          if (isReset) return newItems;

          // ✅ DEDUPE BY ID (CRITICAL FIX)
          const map = new Map(prev.map((p) => [p.id, p]));
          newItems.forEach((p) => map.set(p.id, p));
          return Array.from(map.values());
        });

        setNextCursor(data.nextCursor ?? null);
        setHasMore(Boolean(data.nextCursor));
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    },
    [role, locationFilter]
  );

  // Reset on filter change
  useEffect(() => {
    setHasMore(true);
    setNextCursor(null);
    fetchProfiles(null, true);
  }, [role, locationFilter, fetchProfiles]);

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) {
          fetchProfiles(nextCursor);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [nextCursor, hasMore, loading, fetchProfiles]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {profiles.map((p) => (
          <ProfileCard key={p.id} profile={p} onMessage={onMessage} />
        ))}
      </div>

      <div ref={sentinelRef} className="h-10 w-full flex justify-center">
        {loading && <p className="text-gray-500">Loading more community members...</p>}
      </div>
    </div>
  );
}
