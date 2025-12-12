/**
 * Geocode a zip code or city name to get coordinates using Nominatim API
 */

interface Coordinates {
  lat: number;
  lng: number;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

/**
 * Geocode a zip code or city name to get coordinates using Nominatim API
 * @param query - Zip code or city name (e.g., "78701" or "Austin, TX")
 * @returns Promise resolving to coordinates or null on error
 */
export async function geocodeLocation(query: string): Promise<Coordinates | null> {
  if (!query || !query.trim()) {
    return null;
  }

  try {
    // Improved geocoding: better format for zip codes and cities
    let searchQuery = query.trim();

    // Check if it's a zip code (5 digits)
    const isZipCode = /^\d{5}$/.test(searchQuery);

    // For zip codes, add country code for better accuracy
    if (isZipCode) {
      searchQuery = `${searchQuery}, USA`;
    }
    // For city names, ensure we have state if not provided
    // (e.g., "Austin" becomes "Austin, TX, USA" if no state)
    else if (!searchQuery.includes(',')) {
      // If it's just a city name without state, add USA for better results
      searchQuery = `${searchQuery}, USA`;
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery
      )}&limit=1&addressdetails=1&countrycodes=us`
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data: NominatimResult[] = await response.json();

    if (data && data.length > 0) {
      const result = data[0];
      const coords: Coordinates = {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
      };

      return coords;
    }

    return null;
  } catch (error) {
    console.error('Error geocoding location:', error);
    return null;
  }
}
