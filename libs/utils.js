/**
 * Utility functions for the application
 */

/**
 * Utility function to merge class names
 * @param {...(string | undefined | null | false)} classes - Class names to merge
 * @returns {string} - Merged class names
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Properly capitalizes location text
 * Handles state abbreviations, multi-word locations, and common exceptions
 * @param {string} text - The text to capitalize
 * @returns {string} - Properly capitalized text
 */
export function capitalizeLocation(text) {
  if (!text || typeof text !== 'string') return text;

  // Handle state abbreviations (keep uppercase)
  const stateAbbreviations = [
    'ca',
    'ny',
    'tx',
    'fl',
    'il',
    'pa',
    'oh',
    'ga',
    'nc',
    'mi',
    'nj',
    'va',
    'wa',
    'az',
    'ma',
    'tn',
    'in',
    'mo',
    'md',
    'co',
    'or',
    'wi',
    'mn',
    'sc',
    'al',
    'la',
    'ky',
    'ar',
    'ut',
    'ia',
    'nv',
    'ct',
    'ms',
    'ks',
    'ne',
    'id',
    'hi',
    'nh',
    'me',
    'ri',
    'mt',
    'de',
    'sd',
    'nd',
    'ak',
    'vt',
    'wy',
    'wv',
  ];

  const lowerText = text.toLowerCase().trim();

  // If it's a state abbreviation, return it uppercase
  if (stateAbbreviations.includes(lowerText)) {
    return lowerText.toUpperCase();
  }

  // Split by spaces and capitalize each word
  const words = lowerText.split(' ');
  const capitalizedWords = words.map((word, index) => {
    // Handle special cases
    // FIX: Only apply lowercase rules if it's NOT the first word (index > 0)
    if (
      index > 0 &&
      (word === 'of' || word === 'the' || word === 'and' || word === 'in' || word === 'at')
    ) {
      return word; // Keep lowercase for articles and prepositions
    }

    // Capitalize first letter of each word
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  return capitalizedWords.join(' ');
}

/**
 * Formats a full location string with proper capitalization
 * @param {Object} location - Object containing location fields
 * @param {string} location.neighborhood - Neighborhood name
 * @param {string} location.city - City name
 * @param {string} location.state - State name or abbreviation
 * @returns {Object} - Object with capitalized location fields
 */
export function formatLocation(location) {
  if (!location) return location;

  return {
    neighborhood: location.neighborhood
      ? capitalizeLocation(location.neighborhood)
      : location.neighborhood,
    city: location.city ? capitalizeLocation(location.city) : location.city,
    state: location.state ? capitalizeLocation(location.state) : location.state,
  };
}
