import {
  cn,
  capitalizeLocation,
  formatLocation,
  getRoleLabel,
  getRoleBadgePattern,
  formatParticipantLocation,
  formatTime,
  formatDate,
} from './utils';

// --- cn (Class Names) ---
describe('cn', () => {
  it('should merge multiple string arguments', () => {
    expect(cn('class-a', 'class-b', 'class-c')).toBe('class-a class-b class-c');
  });

  it('should filter out falsy values (null, undefined, false, "")', () => {
    expect(cn('class-a', false, 'class-b', null, 'class-c', undefined, '', 'class-d')).toBe(
      'class-a class-b class-c class-d'
    );
  });

  it('should return an empty string for no arguments', () => {
    expect(cn()).toBe('');
  });

  it('should return an empty string for all falsy arguments', () => {
    expect(cn(false, null, undefined, '')).toBe('');
  });
});

// --- capitalizeLocation ---
describe('capitalizeLocation', () => {
  it('should capitalize single-word cities', () => {
    expect(capitalizeLocation('austin')).toBe('Austin');
  });

  it('should handle multi-word cities', () => {
    expect(capitalizeLocation('new york')).toBe('New York');
  });

  it('should normalize mixed-case input', () => {
    expect(capitalizeLocation('sAn FrAnCiScO')).toBe('San Francisco');
  });

  it('should trim whitespace from the beginning and end', () => {
    expect(capitalizeLocation('  dallas  ')).toBe('Dallas');
  });

  it('should correctly uppercase state abbreviations (lowercase input)', () => {
    expect(capitalizeLocation('tx')).toBe('TX');
    expect(capitalizeLocation('ca')).toBe('CA');
  });

  it('should normalize and uppercase mixed-case state abbreviations', () => {
    expect(capitalizeLocation('Ny')).toBe('NY');
  });

  it('should keep special words (of, the, and, in, at) lowercase', () => {
    expect(capitalizeLocation('city of austin')).toBe('City of Austin');
    expect(capitalizeLocation('the woodlands')).toBe('The Woodlands');
    expect(capitalizeLocation('stratford-upon-avon')).toBe('Stratford-upon-avon');
  });

  it('should return non-string values as-is', () => {
    expect(capitalizeLocation(null)).toBe(null);
    expect(capitalizeLocation(undefined)).toBe(undefined);
    expect(capitalizeLocation('12345')).toBe('12345');
  });

  it('should return an empty string if passed an empty string', () => {
    expect(capitalizeLocation('')).toBe('');
  });
});

// --- formatLocation ---
describe('formatLocation', () => {
  it('should format all fields of a location object', () => {
    const location = {
      neighborhood: 'south congress',
      city: 'austin',
      state: 'tx',
    };
    const expected = {
      neighborhood: 'South Congress',
      city: 'Austin',
      state: 'TX',
    };
    // Cast to 'any' to bypass strict type checking
    expect(formatLocation(location)).toEqual(expected);
  });

  it('should handle fields with null values', () => {
    const location = { neighborhood: null, city: 'houston', state: 'tx' };
    const expected = {
      neighborhood: null,
      city: 'Houston',
      state: 'TX',
    };
    // Cast to 'any'
    expect(formatLocation(location)).toEqual(expected);
  });

  it('should return null or undefined if passed as input', () => {
    expect(formatLocation(null)).toBe(null);
    expect(formatLocation(undefined)).toBe(undefined);
  });
});

// --- getRoleLabel ---
describe('getRoleLabel', () => {
  it('should return correct label for dog owner', () => {
    expect(getRoleLabel('dog_owner')).toBe('Dog Owner');
    expect(getRoleLabel('petpal')).toBe('PetPal');
    expect(getRoleLabel('both')).toBe('Dog Owner & PetPal');
  });

  it('should handle invalid label and return community member', () => {
    expect(getRoleLabel('anything else')).toBe('Community Member');
    expect(getRoleLabel('')).toBe('Community Member');
  });

  it('should handle null/undefined input and return community member', () => {
    expect(getRoleLabel(null)).toBe('Community Member');
    expect(getRoleLabel(undefined)).toBe('Community Member');
  });
});

// --- getRoleBadgePattern ---
describe('getRoleBadgePattern', () => {
  it('should return the correct badge pattern for different role', () => {
    expect(getRoleBadgePattern('dog_owner')).toBe('bg-blue-100 text-blue-800');
    expect(getRoleBadgePattern('petpal')).toBe('bg-green-100 text-green-800');
    expect(getRoleBadgePattern('both')).toBe('bg-purple-100 text-purple-800');
  });

  it('should handle invalid input and return community member pattern(gray)', () => {
    expect(getRoleBadgePattern('unknown')).toBe('bg-gray-100 text-gray-800');
    expect(getRoleBadgePattern('')).toBe('bg-gray-100 text-gray-800');
  });

  it('should handle null and undefined input and return community member pattern(gray)', () => {
    expect(getRoleBadgePattern(null)).toBe('bg-gray-100 text-gray-800');
    expect(getRoleBadgePattern(undefined)).toBe('bg-gray-100 text-gray-800');
  });
});

// --- formatParticipantLocation ---
describe('formatParticipantLocation', () => {
  it('should return null for null and undefined input', () => {
    expect(formatParticipantLocation(null)).toBe(null);
    expect(formatParticipantLocation(undefined)).toBe(null);
    expect(formatParticipantLocation({ neighborhood: null, city: null, state: null })).toBe(null);
  });

  it('should return correct address(ignoring state) for completed location', () => {
    const location = {
      neighborhood: 'south congress',
      city: 'austin',
      state: 'tx',
    };
    const expected = 'South Congress, Austin';
    expect(formatParticipantLocation(location)).toBe(expected);
  });

  it('should only format city when neighborhood is missing', () => {
    const location = {
      city: 'new york',
      state: 'ny',
    };
    const expected = 'New York';
    expect(formatParticipantLocation(location)).toBe(expected);
  });

  it('should only format neighborhood when city is missing', () => {
    const location = {
      neighborhood: 'downtown',
      state: 'ny',
    };
    const expected = 'Downtown';
    expect(formatParticipantLocation(location)).toBe(expected);
  });
});

// --- formatTime ---
describe('formatTime', () => {
  it('should format time for am input', () => {
    const dateString = '2025-01-01T10:39:00';
    const expected = '10:39 AM';
    expect(formatTime(dateString)).toBe(expected);
  });

  it('should format time for pm input', () => {
    const dateString = '2023-08-15T14:30:00';
    const expected = '2:30 PM';
    expect(formatTime(dateString)).toBe(expected);
  });

  it('should format time for edge input for 12pm', () => {
    const dateString = '2024-01-01T12:00:00';
    const expected = '12:00 PM';
    expect(formatTime(dateString)).toBe(expected);
  });

  it('should format time for edge input for 0am', () => {
    const dateString = '2026-01-01T00:00:00';
    const expected = '12:00 AM';
    expect(formatTime(dateString)).toBe(expected);
  });

  it('should format minutes with leading zero when needed', () => {
    const dateString = '2026-01-01T09:05:00';
    const expected = '9:05 AM';
    expect(formatTime(dateString)).toBe(expected);
  });

  it('should ignore seconds and so on', () => {
    const dateString = '2025-01-01T10:30:45.123';
    const expected = '10:30 AM';
    expect(formatTime(dateString)).toBe(expected);
  });
});

// --- formatDate ---
describe('formatDate', () => {
  it('should return Today for the same date input', () => {
    const today = new Date();
    const dateString = today.toISOString();

    expect(formatDate(dateString)).toBe('Today');
  });

  it('should return Yesterday for the yesterday date input', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateString = yesterday.toISOString();

    expect(formatDate(dateString)).toBe('Yesterday');
  });

  it('should return the weekday name for any dates within 7 days', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const dateString = threeDaysAgo.toISOString();

    //can't determine the exact date here, so just check if it's one of the weekdays
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    expect(weekdays).toContain(formatDate(dateString));
  });

  it('should return the weekday name for dates 6 days ago (edge case)', () => {
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
    const dateString = sixDaysAgo.toISOString();

    //can't determine the exact date here, so just check if it's one of the weekdays
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    expect(weekdays).toContain(formatDate(dateString));
  });

  it('returns month and day for dates older than 7 days', () => {
    const result = formatDate('2025-12-31T12:00:00');
    expect(result).toBe('Dec 31');
  });

  it('should ignore time and only compare the date', () => {
    const todayLate = new Date();
    todayLate.setHours(23, 59, 59, 999);
    const dateString = todayLate.toISOString();

    expect(formatDate(dateString)).toBe('Today');
  });
});
