'use client';

import { useState, FormEvent, ChangeEvent, JSX } from 'react';
import { geocodeLocation } from '@/libs/geocoding';

// #region Type Definitions

/**
 * @description Defines the type of filter currently active.
 */
type FilterType = 'none' | 'shared-location' | 'zip-city';

/**
 * @description Base configuration for any location filter.
 * Properties are marked 'readonly' for immutability.
 */
type BaseFilterConfig = {
  /** The latitude for the filter center. */
  readonly lat: number;
  /** The longitude for the filter center. */
  readonly lng: number;
  /** The search radius in miles. */
  readonly radius: number;
};

/**
 * @description Filter configuration for a shared user location.
 */
type SharedLocationFilter = BaseFilterConfig & {
  readonly type: 'shared-location';
};

/**
 * @description Filter configuration for a zip code or city search.
 */
type ZipCityFilter = BaseFilterConfig & {
  readonly type: 'zip-city';
  /** The original search query (e.g., "78701" or "Austin, TX"). */
  readonly query: string;
};

/**
 * @description A discriminated union of all possible location filter configurations.
 * This ensures that 'query' is only present when type is 'zip-city'.
 */
type LocationFilterConfig = SharedLocationFilter | ZipCityFilter;

/**
 * @description Props for the LocationFilter component.
 * Props are marked 'readonly' to prevent mutation within the component.
 */
type LocationFilterProps = {
  /**
   * @description Callback function to notify the parent component of a filter change.
   * Sends the new filter config or 'null' if the filter is cleared.
   */
  // eslint-disable-next-line no-unused-vars
  readonly onFilterChange: (filter: LocationFilterConfig | null) => void;
};

// #endregion

// #region Component

/**
 * @description A React component for filtering by location, either via
 * browser Geolocation API or by a zip code/city search.
 */
export default function LocationFilter({ onFilterChange }: LocationFilterProps): JSX.Element {
  // #region State
  const [filterType, setFilterType] = useState<FilterType>('none');
  const [zipCityInput, setZipCityInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<LocationFilterConfig | null>(null);
  // #endregion

  // #region Event Handlers

  /**
   * @description Handles the "Share Location" button click.
   * Uses the browser's Geolocation API to get the user's current position.
   */
  const handleShareLocation = (): void => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setFilterType('shared-location'); // Set type early for loading indicator
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position: GeolocationPosition) => {
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
      (err: GeolocationPositionError) => {
        console.error('Geolocation error:', err);
        setError(
          err.code === 1 // PERMISSION_DENIED
            ? 'Location permission denied. Please allow location access to use this feature.'
            : 'Unable to get your location. Please try again.'
        );
        setLoading(false);
        setFilterType('none'); // Reset type on error
      }
    );
  };

  /**
   * @description Handles the submission of the zip code/city search form.
   */
  const handleZipCitySubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const trimmedQuery = zipCityInput.trim();

    if (!trimmedQuery) {
      setError('Please enter a zip code or city name');
      return;
    }

    setLoading(true);
    setFilterType('zip-city'); // Set type early for loading indicator
    setError(null);

    try {
      // Assuming geocodeLocation returns { lat: number; lng: number } | null
      const coords = await geocodeLocation(trimmedQuery);

      if (!coords) {
        setError('Location not found. Please check your zip code or city name and try again.');
        setLoading(false);
        setFilterType('none'); // Reset type on error
        return;
      }

      const filter: LocationFilterConfig = {
        type: 'zip-city',
        lat: coords.lat,
        lng: coords.lng,
        radius: 5, // 5 miles for zip/city
        query: trimmedQuery, // Store the query for display
      };
      setActiveFilter(filter);
      setFilterType('zip-city');
      onFilterChange(filter);
      setLoading(false);
    } catch (err: unknown) {
      console.error('Geocoding error:', err);
      setError('Failed to geocode location. Please try again.');
      setLoading(false);
      setFilterType('none'); // Reset type on error
    }
  };

  /**
   * @description Handles the "Clear Filter" button click.
   * Resets all state and notifies the parent component.
   */
  const handleClearFilter = (): void => {
    setFilterType('none');
    setZipCityInput('');
    setActiveFilter(null);
    setError(null);
    onFilterChange(null);
  };

  /**
   * @description Handles changes to the text input field.
   */
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setZipCityInput(e.target.value);
    // Clear error as user types
    if (error) {
      setError(null);
    }
  };

  // #endregion

  // #region Render
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
                {/* Type narrowing from the discriminated union makes this safe.
                  TypeScript knows 'query' exists if type is not 'shared-location'.
                */}
                {activeFilter.type === 'shared-location'
                  ? `📍 Within ${activeFilter.radius} miles of your location`
                  : `📍 Within ${activeFilter.radius} miles of ${activeFilter.query}`}
              </span>
            </div>
          )}

          {error && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {activeFilter ? (
              <button
                onClick={handleClearFilter}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm sm:text-base flex items-center justify-center gap-2"
              >
                <span>✕</span>
                <span>Clear Filter</span>
              </button>
            ) : (
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

                <form
                  onSubmit={handleZipCitySubmit}
                  className="flex flex-col sm:flex-row gap-2 flex-1"
                >
                  <input
                    type="text"
                    value={zipCityInput}
                    onChange={handleInputChange}
                    placeholder="Enter zip code or city (e.g., 78701 or Austin, TX)"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 text-sm sm:text-base"
                    disabled={loading}
                    aria-label="Enter zip code or city"
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
  // #endregion
}
