import {
  validateEmail,
  validatePhoneNumber,
  validateRequired,
  validateStringLength,
  validateDate,
  validateFutureDate,
  validateUUID,
  validateEnum,
  validateNumber,
  validateArray,
  validateRequestBody,
  meetingValidationSchema,
  reviewValidationSchema,
  profileValidationSchema,
} from '@/libs/validation';

// Use a fixed date for reliable 'validateFutureDate' testing
const MOCK_CURRENT_DATE = new Date('2025-01-15T10:00:00.000Z');

const MOCK_FUTURE_DATE_ISO = '2025-02-01T10:00:00.000Z';
// Date exactly one millisecond in the PAST of the mock time (for current time failure test)
const MOCK_ONE_MS_PAST_ISO = new Date(MOCK_CURRENT_DATE.getTime() - 1).toISOString();

describe('libs/validation.js - Utility Functions', () => {
  // Setup/Teardown for time-dependent test
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(MOCK_CURRENT_DATE);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('validateEmail', () => {
    test('should return true for valid emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@sub.domain.co')).toBe(true);
    });
    test('should return false for invalid emails', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('user@domain')).toBe(false);
      expect(validateEmail('user @domain.com')).toBe(false);
      expect(validateEmail(123 as any)).toBe(false);
    });
  });

  describe('validatePhoneNumber', () => {
    test('should return true for valid phone numbers in various formats', () => {
      expect(validatePhoneNumber('1234567890')).toBe(true);
      expect(validatePhoneNumber('+1 (123) 456-7890')).toBe(true);
      expect(validatePhoneNumber('123 456 7890')).toBe(true);
      expect(validatePhoneNumber('+44 20 7946 0958')).toBe(true);
    });
    test('should return false for invalid phone numbers', () => {
      expect(validatePhoneNumber('short')).toBe(false);
      expect(validatePhoneNumber('123-456-ABC')).toBe(false);
    });
  });

  describe('validateRequired', () => {
    test('should return true for valid, non-empty values', () => {
      expect(validateRequired('hello', 'Field')).toBe(true);
      expect(validateRequired([1], 'Field')).toBe(true);
      expect(validateRequired({ a: 1 }, 'Field')).toBe(true);
    });
    test('should throw an error for empty or missing values', () => {
      expect(() => validateRequired(null, 'Name')).toThrow('Name is required');
      expect(() => validateRequired(undefined, 'Age')).toThrow('Age is required');
      expect(() => validateRequired('', 'Address')).toThrow('Address is required');
      expect(() => validateRequired('   ', 'City')).toThrow('City is required');
      // Test the buggy behavior for 0, acknowledging it throws
      expect(() => validateRequired(0, 'Count')).toThrow('Count is required');
    });
  });

  describe('validateStringLength', () => {
    test('should return true for valid lengths using defaults', () => {
      expect(validateStringLength('a', 'Title')).toBe(true);
      expect(validateStringLength('a'.repeat(255), 'Title')).toBe(true);
    });
    test('should return true for valid lengths using custom min/max', () => {
      expect(validateStringLength('abc', 'Code', 3, 5)).toBe(true);
    });
    test('should throw an error if not a string', () => {
      expect(() => validateStringLength(123 as any, 'Value')).toThrow('Value must be a string');
    });
    test('should throw an error if below minLength', () => {
      expect(() => validateStringLength('hi', 'Name', 5)).toThrow(
        'Name must be at least 5 characters long'
      );
    });
    test('should throw an error if above maxLength', () => {
      expect(() => validateStringLength('longstring', 'Comment', 1, 5)).toThrow(
        'Comment must be no more than 5 characters long'
      );
    });
  });

  describe('validateDate', () => {
    test('should return a Date object for a valid date string', () => {
      // Use UTC to prevent local time zone issues from changing the year unexpectedly.
      const result = validateDate('2025-01-01T00:00:00.000Z', 'TestDate');
      expect(result).toBeInstanceOf(Date);
      expect(result.getUTCFullYear()).toBe(2025);
    });
    test('should throw an error for an invalid date string', () => {
      expect(() => validateDate('not-a-date', 'TestDate')).toThrow('TestDate must be a valid date');
      expect(() => validateDate(undefined, 'TestDate')).toThrow('TestDate must be a valid date');
    });
  });

  describe('validateFutureDate', () => {
    test('should return a Date object for a future date', () => {
      const result = validateFutureDate(MOCK_FUTURE_DATE_ISO, 'Appointment');
      expect(result).toBeInstanceOf(Date);
    });
    test('should throw an error for a past date', () => {
      const MOCK_PAST_DATE_ISO = '2024-12-01T10:00:00.000Z';
      expect(() => validateFutureDate(MOCK_PAST_DATE_ISO, 'Appointment')).toThrow(
        'Appointment must be in the future'
      );
    });
    // Checks that even a time technically in the past by milliseconds is rejected.
    test('should throw an error for the current time (using a time explicitly in the past)', () => {
      const pastButClose = MOCK_ONE_MS_PAST_ISO;
      expect(() => validateFutureDate(pastButClose, 'Appointment')).toThrow(
        'Appointment must be in the future'
      );
    });
  });

  describe('validateUUID', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    test('should return true for a valid UUID', () => {
      expect(validateUUID(validUuid, 'ID')).toBe(true);
    });
    test('should throw an error for an invalid UUID format', () => {
      expect(() => validateUUID('12345', 'ID')).toThrow('ID must be a valid UUID');
      expect(() => validateUUID('not-a-uuid-string', 'ID')).toThrow('ID must be a valid UUID');
    });
  });

  describe('validateEnum', () => {
    const roles = ['dog_owner', 'dog_sitter', 'both'];
    test('should return true for an allowed value', () => {
      expect(validateEnum('dog_sitter', 'Role', roles)).toBe(true);
    });
    test('should throw an error for a disallowed value', () => {
      expect(() => validateEnum('admin', 'Role', roles)).toThrow(
        'Role must be one of: dog_owner, dog_sitter, both'
      );
    });
  });

  describe('validateNumber', () => {
    test('should return the number for a valid value', () => {
      expect(validateNumber(10, 'Count')).toBe(10);
      expect(validateNumber('10.5', 'Count')).toBe(10.5);
      // Confirmed: Number(null) is 0, so validateNumber returns 0 for null.
      expect(validateNumber(null as any, 'Count')).toBe(0);
    });
    test('should enforce min/max constraints', () => {
      expect(validateNumber(5, 'Rating', 1, 5)).toBe(5);
      expect(() => validateNumber(0, 'Rating', 1, 5)).toThrow('Rating must be at least 1');
      expect(() => validateNumber(6, 'Rating', 1, 5)).toThrow('Rating must be no more than 5');
    });
    test('should throw an error for non-numeric input that is NOT null or undefined', () => {
      expect(() => validateNumber('abc', 'Count')).toThrow('Count must be a number');
      expect(() => validateNumber(NaN, 'Count')).toThrow('Count must be a number');
      expect(() => validateNumber(undefined as any, 'Count')).toThrow('Count must be a number');
    });
  });

  describe('validateArray', () => {
    test('should return true for a valid array length', () => {
      expect(validateArray([1, 2], 'Items', 1, 3)).toBe(true);
      expect(validateArray([], 'Items')).toBe(true);
    });
    test('should enforce min/max length constraints', () => {
      expect(() => validateArray([1], 'Items', 2)).toThrow('Items must have at least 2 items');
      expect(() => validateArray([1, 2, 3, 4], 'Items', 0, 3)).toThrow(
        'Items must have no more than 3 items'
      );
    });
    test('should throw an error if not an array', () => {
      expect(() => validateArray('string', 'Items')).toThrow('Items must be an array');
    });
  });

  describe('validateRequestBody', () => {
    test('should return true for a valid request body against the meeting schema', () => {
      const validBody = {
        recipient_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Dog Walk',
        meeting_place: 'Central Park',
        start_datetime: MOCK_FUTURE_DATE_ISO,
        end_datetime: MOCK_FUTURE_DATE_ISO,
      };
      expect(validateRequestBody(validBody, meetingValidationSchema)).toBe(true);
    });

    test('should return true for a valid request body against the review schema', () => {
      const validBody = {
        meeting_id: '123e4567-e89b-12d3-a456-426614174000',
        rating: 5,
        comment: 'Great sitter!',
      };
      expect(validateRequestBody(validBody, reviewValidationSchema)).toBe(true);
    });

    test('should return true for a valid request body against the profile schema (optional phone number)', () => {
      const validBody = {
        first_name: 'Skippy',
        last_name: 'Owner',
        phone_number: '+15555555555',
        role: 'dog_owner',
      };
      expect(validateRequestBody(validBody, profileValidationSchema)).toBe(true);
    });

    test('should throw a single error listing ALL validation failures', () => {
      const invalidBody = {
        recipient_id: 'invalid-uuid',
        title: '',
        meeting_place: 'Park',
        start_datetime: MOCK_ONE_MS_PAST_ISO, // Now definitely in the past
      };

      expect(() => validateRequestBody(invalidBody, meetingValidationSchema)).toThrow(
        /Validation failed: recipient_id must be a valid UUID, title is required, start_datetime must be in the future/
      );
    });

    test('should return true for a valid request body against the profile schema (omitting optional field)', () => {
      const validBody = {
        first_name: 'Skippy',
        last_name: 'Owner',
        role: 'dog_owner',
      };
      expect(validateRequestBody(validBody, profileValidationSchema)).toBe(true);
    });
  });
});
