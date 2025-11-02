import { cn, capitalizeLocation, formatLocation } from './utils';

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
    expect(capitalizeLocation(12345 as any)).toBe(12345);
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
    expect(formatLocation(location as any)).toEqual(expected);
  });

  it('should handle partial objects with missing fields', () => {
    const location = { city: 'new york', state: 'NY' };
    const expected = {
      neighborhood: undefined,
      city: 'New York',
      state: 'NY',
    };
    // Cast to 'any'
    expect(formatLocation(location as any)).toEqual(expected);
  });

  it('should handle fields with null values', () => {
    const location = { neighborhood: null, city: 'houston', state: 'tx' };
    const expected = {
      neighborhood: null,
      city: 'Houston',
      state: 'TX',
    };
    // Cast to 'any'
    expect(formatLocation(location as any)).toEqual(expected);
  });

  it('should handle an empty object', () => {
    const location = {};
    const expected = {
      neighborhood: undefined,
      city: undefined,
      state: undefined,
    };
    // Cast to 'any'
    expect(formatLocation(location as any)).toEqual(expected);
  });

  it('should return null or undefined if passed as input', () => {
    expect(formatLocation(null)).toBe(null);
    expect(formatLocation(undefined)).toBe(undefined);
  });
});
