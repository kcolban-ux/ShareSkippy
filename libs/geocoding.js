/**
 * Geocode a zip code or city name to get coordinates using Nominatim API
 * @param {string} query - Zip code or city name (e.g., "78701" or "Austin, TX")
 * @returns {Promise<{lat: number, lng: number} | null>} Coordinates or null on error
 */
export async function geocodeLocation(query) {
  if (!query || !query.trim()) {
    return null;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query.trim()
      )}&limit=1&addressdetails=1`
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const result = data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
      };
    }

    return null;
  } catch (error) {
    console.error('Error geocoding location:', error);
    return null;
  }
}

