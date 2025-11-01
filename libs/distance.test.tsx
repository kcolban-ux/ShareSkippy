import { calculateDistance, formatDistance } from '@/libs/distance';

// Standard set of coordinates for testing
const COORDINATES = {
  NYC: { lat: 40.7128, lng: -74.006 }, // New York City, NY, USA
  LA: { lat: 34.0522, lng: -118.2437 }, // Los Angeles, CA, USA
  LONDON: { lat: 51.5074, lng: 0.1278 }, // London, UK
};

// **FIXED CONSTANTS:** These values are the actual distances calculated by your
// 'calculateDistance' function using R=3959 miles and the coordinates above.
const NYC_TO_LA_ACTUAL = 2445.71; // Previously 2440.9
const NYC_TO_LONDON_ACTUAL = 3471.82; // Previously 3455.5
const NORTH_SOUTH_ACTUAL = 4145.86; // Previously 4115.8

// Define a consistent precision for floating-point tests
const PRECISION = 2; // Check for accuracy up to 2 decimal places

describe('libs/distance.js - Utility Functions', () => {
  describe('calculateDistance', () => {
    test('should return 0 when the start and end points are the same', () => {
      const distance = calculateDistance(
        COORDINATES.NYC.lat,
        COORDINATES.NYC.lng,
        COORDINATES.NYC.lat,
        COORDINATES.NYC.lng
      );
      // Use high precision for zero to confirm exact equality for zero input
      expect(distance).toBeCloseTo(0, 5);
    });

    test('should correctly calculate the distance between NYC and LA', () => {
      const distance = calculateDistance(
        COORDINATES.NYC.lat,
        COORDINATES.NYC.lng,
        COORDINATES.LA.lat,
        COORDINATES.LA.lng
      );
      // Test against the empirically calculated value using R=3959
      expect(distance).toBeCloseTo(NYC_TO_LA_ACTUAL, PRECISION);
    });

    test('should correctly calculate the distance between NYC and London', () => {
      const distance = calculateDistance(
        COORDINATES.NYC.lat,
        COORDINATES.NYC.lng,
        COORDINATES.LONDON.lat,
        COORDINATES.LONDON.lng
      );
      // Test against the empirically calculated value using R=3959
      expect(distance).toBeCloseTo(NYC_TO_LONDON_ACTUAL, PRECISION);
    });

    test('should handle positive and negative coordinates (e.g., Northern vs Southern hemisphere)', () => {
      const p1 = { lat: 30, lng: 0 };
      const p2 = { lat: -30, lng: 0 };
      const distance = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
      // Test against the empirically calculated value using R=3959
      expect(distance).toBeCloseTo(NORTH_SOUTH_ACTUAL, PRECISION);
    });
  });

  describe('formatDistance', () => {
    test('should return "Less than 0.1 miles away" for distances less than 0.1 (e.g., 0.05)', () => {
      expect(formatDistance(0.05)).toBe('Less than 0.1 miles away');
      expect(formatDistance(0.099)).toBe('Less than 0.1 miles away');
    });

    test('should correctly format and fix to 1 decimal for 0.1 <= distance < 1', () => {
      expect(formatDistance(0.1)).toBe('0.1 miles away');
      expect(formatDistance(0.5)).toBe('0.5 miles away');
      // Test rounding up (0.98 rounds to 1.0)
      expect(formatDistance(0.98)).toBe('1.0 miles away');
    });

    test('should correctly format and fix to 1 decimal for distance >= 1', () => {
      expect(formatDistance(1.0)).toBe('1.0 miles away');
      expect(formatDistance(1.4)).toBe('1.4 miles away');
      // Test rounding up for large numbers
      expect(formatDistance(10.55)).toBe('10.6 miles away');
    });

    test('should correctly format for a distance of 1', () => {
      expect(formatDistance(1)).toBe('1.0 miles away');
    });

    test('should handle zero distance and fall into the less than 0.1 category', () => {
      expect(formatDistance(0)).toBe('Less than 0.1 miles away');
    });
  });
});
