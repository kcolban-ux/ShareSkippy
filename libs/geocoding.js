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

    console.log('🌍 Geocoding query:', searchQuery);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery
      )}&limit=1&addressdetails=1&countrycodes=us`
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const result = data[0];
      const coords = {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
      };
      
      console.log('📍 Geocoded coordinates:', {
        originalQuery: query.trim(),
        searchQuery,
        lat: coords.lat,
        lng: coords.lng,
        display_name: result.display_name,
      });
      
      return coords;
    }

    console.log('⚠️ No geocoding results found for:', query.trim());
    return null;
  } catch (error) {
    console.error('Error geocoding location:', error);
    return null;
  }
}

