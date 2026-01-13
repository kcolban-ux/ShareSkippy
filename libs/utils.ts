// #region Types

/**
 * Defines the allowable values for the `cn` utility function.
 * This includes strings, or falsy values that should be filtered out.
 */
type ClassValue = string | undefined | null | false;

/**
 * Represents the structure for location data fields.
 * All fields are optional and can be null.
 */
interface LocationFields {
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
}

// #endregion

// #region Constants

/**
 * A Set of common US state abbreviations to keep uppercase.
 * Using a Set provides faster (O(1)) lookups compared to an array's .includes().
 */
const stateAbbreviations: Set<string> = new Set([
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
]);

// #endregion

// #region Functions

/**
 * Utility function to merge class names, filtering out falsy values.
 * @param {...ClassValue} classes - A list of class names to merge.
 * @returns {string} - A single string of merged class names.
 */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Properly capitalizes location text, handling abbreviations and exceptions.
 * @param {string | null | undefined} text - The text to capitalize.
 * @returns {string | null | undefined} - Properly capitalized text, or the original falsy value.
 */
export function capitalizeLocation(text: string | null | undefined): string | null | undefined {
  if (!text) {
    return text;
  }

  const lowerText = text.toLowerCase().trim();

  // If it's a state abbreviation, return it uppercase
  if (stateAbbreviations.has(lowerText)) {
    return lowerText.toUpperCase();
  }

  // Split by spaces and capitalize each word
  const words: string[] = lowerText.split(' ');
  const specialWords = new Set(['of', 'the', 'and', 'in', 'at']);

  const capitalizeSegment = (segment: string) =>
    segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : segment;

  const capitalizedWords: string[] = words.map((word: string, index: number) => {
    if (!word) return word;

    const segments = word.split('-');
    const capitalizedSegments = segments.map((segment: string, segmentIndex: number) => {
      if (segmentIndex === 0) {
        return capitalizeSegment(segment);
      }

      return segment;
    });
    const normalizedWord = capitalizedSegments.join('-');

    // Handle special articles/prepositions, but allow the first word to be capitalized
    if (specialWords.has(word) && index > 0) {
      return word;
    }

    return normalizedWord;
  });

  return capitalizedWords.join(' ');
}

/**
 * Formats a location object with proper capitalization.
 * @param {LocationFields | null | undefined} location - Object containing location fields.
 * @returns {LocationFields | null | undefined} - Object with capitalized fields, or the original falsy value.
 */
export function formatLocation(
  location: LocationFields | null | undefined
): LocationFields | null | undefined {
  if (!location) {
    return location;
  }

  // capitalizeLocation is built to handle null/undefined values.
  return {
    neighborhood: capitalizeLocation(location.neighborhood),
    city: capitalizeLocation(location.city),
    state: capitalizeLocation(location.state),
  };
}

/**
 * Maps profile roles
 * @param {string | null | undefined} role - The role key
 * @returns {string} - The readable label
 */
export function getRoleLabel(role?: string | null): string {
  switch (role) {
    case 'dog_owner':
      return 'Dog Owner';
    case 'petpal':
      return 'PetPal';
    case 'both':
      return 'Dog Owner & PetPal';
    default:
      return 'Community Member';
  }
}
/**
 * Formats a participant's location into comma-seperated string
 * @param {LocationFields | null | undefined} participant - contains location fields
 * @returns {string | null} - The readable location
 */
export function formatParticipantLocation(
  participant: LocationFields | null | undefined
): string | null {
  if (!participant) return null;

  const { neighborhood, city, state } = participant;
  if (!neighborhood && !city && !state) return null;

  const location = formatLocation({ neighborhood, city, state });
  if (!location) return null;

  return [location.neighborhood, location.city].filter(Boolean).join(', ');
}

/**
 * Formats a date string into a simple time (e.g., "10:30 AM").
 * @param {string} dateString - contains date fields
 * @returns {string | null} - The readable time
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats a date string into a relative date (e.g., "Today", "Yesterday", "Tuesday").
 * @param {string} dateString - contains date fields
 * @returns {string} - The readable date
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (messageDate.getTime() === today.getTime()) {
    return 'Today';
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else if (now.getTime() - messageDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
// #endregion
