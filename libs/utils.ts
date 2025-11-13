// #region Types

/**
 * @description Defines the allowable values for the `cn` utility function.
 * This includes strings, or falsy values that should be filtered out.
 */
type ClassValue = string | undefined | null | false;

/**
 * @description Represents the structure for location data fields.
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
 * @description A Set of common US state abbreviations to keep uppercase.
 * Using a Set provides faster (O(1)) lookups compared to an array's .includes().
 */
const stateAbbreviations: Set<string> = new Set([
  "ca",
  "ny",
  "tx",
  "fl",
  "il",
  "pa",
  "oh",
  "ga",
  "nc",
  "mi",
  "nj",
  "va",
  "wa",
  "az",
  "ma",
  "tn",
  "in",
  "mo",
  "md",
  "co",
  "or",
  "wi",
  "mn",
  "sc",
  "al",
  "la",
  "ky",
  "ar",
  "ut",
  "ia",
  "nv",
  "ct",
  "ms",
  "ks",
  "ne",
  "id",
  "hi",
  "nh",
  "me",
  "ri",
  "mt",
  "de",
  "sd",
  "nd",
  "ak",
  "vt",
  "wy",
  "wv",
]);

// #endregion

// #region Functions

/**
 * @description Utility function to merge class names, filtering out falsy values.
 * @param {...ClassValue} classes - A list of class names to merge.
 * @returns {string} - A single string of merged class names.
 */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * @description Properly capitalizes location text, handling abbreviations and exceptions.
 * @param {string | null | undefined} text - The text to capitalize.
 * @returns {string | null | undefined} - Properly capitalized text, or the original falsy value.
 */
export function capitalizeLocation(
  text: string | null | undefined,
): string | null | undefined {
  // Type guard: If text is falsy (null, undefined, ''), return it directly.
  if (!text) {
    return text;
  }

  const lowerText = text.toLowerCase().trim();

  // If it's a state abbreviation, return it uppercase
  // Use .has() for efficient O(1) lookup in the Set
  if (stateAbbreviations.has(lowerText)) {
    return lowerText.toUpperCase();
  }

  // Split by spaces and capitalize each word
  const words: string[] = lowerText.split(" ");
  const capitalizedWords: string[] = words.map((word: string) => {
    // Handle special cases for articles and prepositions
    if (
      word === "of" || word === "the" || word === "and" || word === "in" ||
      word === "at"
    ) {
      return word;
    }

    // Capitalize first letter of each word
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  return capitalizedWords.join(" ");
}

/**
 * @description Formats a location object with proper capitalization.
 * @param {LocationFields | null | undefined} location - Object containing location fields.
 * @returns {LocationFields | null | undefined} - Object with capitalized fields, or the original falsy value.
 */
export function formatLocation(
  location: LocationFields | null | undefined,
): LocationFields | null | undefined {
  // Type guard: If location is falsy, return it directly.
  if (!location) {
    return location;
  }

  // We can call capitalizeLocation directly on each property,
  // as it's built to handle null/undefined values.
  return {
    neighborhood: capitalizeLocation(location.neighborhood),
    city: capitalizeLocation(location.city),
    state: capitalizeLocation(location.state),
  };
}

// #endregion
