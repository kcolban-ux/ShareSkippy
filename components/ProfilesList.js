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
      if (loading && !isReset) return; // Allow reset even if "loading" state is stuck
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

          // ✅ DEDUPE BY ID: Prevents key collisions if a user moves between pages
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
    [role, locationFilter, loading]
  );

  // Reset list when filters change
  useEffect(() => {
    setProfiles([]);
    setNextCursor(null);
    setHasMore(true);
    fetchProfiles(null, true);
    // Added fetchProfiles to dependency array to fix eslint react-hooks/exhaustive-deps
  }, [role, locationFilter, fetchProfiles]);

  // Infinite Scroll Sentinel
  useEffect(() => {
    const currentSentinel = sentinelRef.current;
    if (!currentSentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) {
          fetchProfiles(nextCursor);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(currentSentinel);
    return () => observer.disconnect();
  }, [nextCursor, hasMore, loading, fetchProfiles]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {profiles.map((p) => (
          <ProfileCard key={p.id} profile={p} onMessage={onMessage} />
        ))}
      </div>

      {/* This element triggers the next fetch when it enters the viewport */}
      <div ref={sentinelRef} className="h-20 w-full flex items-center justify-center">
        {loading && (
          <div className="animate-pulse text-gray-500 font-medium">Loading more neighbors...</div>
        )}
        {/* Fixed: Replaced ' with &apos; to satisfy eslint react/no-unescaped-entities */}
        {!hasMore && profiles.length > 0 && (
          <p className="text-gray-400 text-sm italic">
            You&apos;ve reached the end of the community.
          </p>
        )}
      </div>
    </div>
  );
}
