'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/libs/supabase';

export default function AvailabilityCard({ availabilityId, userId }) {
  const [availability, setAvailability] = useState(null);
  const [dog, setDog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!availabilityId) {
      setLoading(false);
      return;
    }

    const fetchAvailability = async () => {
      try {
        // Fetch availability with dog info
        const { data: avail, error: availError } = await supabase
          .from('availability')
          .select(`
            id,
            title,
            post_type,
            city_label,
            custom_location_city,
            custom_location_neighborhood,
            dog_id,
            dog_ids
          `)
          .eq('id', availabilityId)
          .single();

        if (availError) throw availError;

        setAvailability(avail);

        // Fetch dog info if available
        const dogId = avail.dog_id || (avail.dog_ids && avail.dog_ids[0]);
        if (dogId) {
          const { data: dogData, error: dogError } = await supabase
            .from('dogs')
            .select('id, name, breed')
            .eq('id', dogId)
            .single();

          if (!dogError && dogData) {
            setDog(dogData);
          }
        }
      } catch (error) {
        console.error('Error fetching availability:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [availabilityId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!availability) return null;

  const location = availability.city_label || 
                   availability.custom_location_city || 
                   availability.custom_location_neighborhood || 
                   null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h5 className="font-semibold text-gray-900 mb-2">{availability.title}</h5>
      
      {dog && (
        <div className="text-sm text-gray-600 mb-2">
          <span className="font-medium">🐕 {dog.name}</span>
          {dog.breed && <span className="ml-2">• {dog.breed}</span>}
        </div>
      )}

      {location && (
        <div className="text-sm text-gray-600 mb-3">
          📍 {location}
        </div>
      )}

      <Link
        href={`/community/availability/${availability.id}`}
        className="inline-block w-full text-center px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
      >
        View Post
      </Link>
    </div>
  );
}

