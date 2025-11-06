'use client';

import { useState, FormEvent } from 'react';
import { geocodeLocation } from '@/libs/geocoding';

interface LocationFilterConfig {
  type: 'shared-location' | 'zip-city';
  lat: number;
  lng: number;
  radius: number;
  query?: string;
}

interface LocationFilterProps {
  onFilterChange: (LocationFilterConfig | null) => void;
}

type FilterType = 'none' | 'shared-location' | 'zip-city';

export default function LocationFilter({ onFilterChange }: LocationFilterProps) {
  const [filterType, setFilterType] = useState<FilterType>('none');
  const [zipCityInput, setZipCityInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<LocationFilterConfig | null>(null);

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const filter: LocationFilterConfig = {
          type: 'shared-location',
          lat: latitude,
          lng: longitude,
          radius: 10, // 10 miles for shared location
        };
        setActiveFilter(filter);
        setFilterType('shared-location');
        onFilterChange(filter);
        setLoading(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError(
          err.code === 1
            ? 'Location permission denied. Please allow location access to use this feature.'
            : 'Unable to get your location. Please try again.'
        );
        setLoading(false);
      }
    );
  };

  const handleZipCitySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!zipCityInput.trim()) {
      setError('Please enter a zip code or city name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const coords = await geocodeLocation(zipCityInput.trim());

      if (!coords) {
        setError('Location not found. Please check your zip code or city name and try again.');
        setLoading(false);
        return;
      }

      const filter: LocationFilterConfig = {
        type: 'zip-city',
        lat: coords.lat,
        lng: coords.lng,
        radius: 5, // 5 miles for zip/city
        query: zipCityInput.trim(), // Store the query for display
      };
      setActiveFilter(filter);
      setFilterType('zip-city');
      onFilterChange(filter);
      setLoading(false);
    } catch (err) {
      console.error('Geocoding error:', err);
      setError('Failed to geocode location. Please try again.');
      setLoading(false);
    }
  };

  const handleClearFilter = () => {
    setFilterType('none');
    setZipCityInput('');
    setActiveFilter(null);
    setError(null);
    onFilterChange(null);
  };

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-gray-200 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">
            Filter by Location
          </h3>
          
          {activeFilter && (
            <div className="mb-3 text-sm text-gray-600">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {activeFilter.type === 'shared-location' 
                  ? `📍 Within ${activeFilter.radius} miles of your location`
                  : `📍 Within ${activeFilter.radius} miles of ${activeFilter.query || zipCityInput}`}
              </span>
            </div>
          )}

          {error && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {!activeFilter ? (
              <>
                <button
                  onClick={handleShareLocation}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && filterType === 'shared-location' ? (
                    <>
                      <span className="animate-spin">⟳</span>
                      <span>Getting location...</span>
                    </>
                  ) : (
                    <>
                      <span>📍</span>
                      <span>Share Location</span>
                    </>
                  )}
                </button>

                <form onSubmit={handleZipCitySubmit} className="flex flex-col sm:flex-row gap-2 flex-1">
                  <input
                    type="text"
                    value={zipCityInput}
                    onChange={(e) => setZipCityInput(e.target.value)}
                    placeholder="Enter zip code or city (e.g., 78701 or Austin, TX)"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 text-sm sm:text-base"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !zipCityInput.trim()}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading && filterType === 'zip-city' ? (
                      <>
                        <span className="animate-spin">⟳</span>
                        <span>Finding...</span>
                      </>
                    ) : (
                      <>
                        <span>🔍</span>
                        <span>Search</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <button
                onClick={handleClearFilter}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm sm:text-base flex items-center justify-center gap-2"
              >
                <span>✕</span>
                <span>Clear Filter</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
