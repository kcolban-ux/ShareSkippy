import { createClient } from './server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// #region Mocks and Setup
// ========================================================================= //

/**
 * Mock the Next.js cookies module.
 */
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

/**
 * Mock the @supabase/ssr module.
 */
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}));

/**
 * Mock cookie store for testing.
 */
const mockCookieStore = {
  getAll: jest.fn(),
  set: jest.fn(),
};

/**
 * Mock Supabase client.
 */
const mockSupabaseClient = {
  auth: {
    getSession: jest.fn(),
  },
};

/**
 * Store original environment variables to restore after tests.
 */
const originalEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

/**
 * Helper function to extract cookie methods from createServerClient mock call.
 */
function getCookieMethodsFromMock() {
  const calls = (createServerClient as jest.Mock).mock.calls;
  if (calls.length === 0) {
    throw new Error('createServerClient was not called');
  }
  const options = calls[0][2];
  return options.cookies;
}

beforeEach(() => {
  // Clear all mock call history before each test
  jest.clearAllMocks();

  // Set up default mock implementations
  (cookies as jest.Mock).mockResolvedValue(mockCookieStore);
  (createServerClient as jest.Mock).mockReturnValue(mockSupabaseClient);

  // Set up environment variables
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

  // Reset cookie store mocks
  mockCookieStore.getAll.mockReturnValue([{ name: 'sb-test-auth-token', value: 'mock-token' }]);
  mockCookieStore.set.mockClear();
});

afterEach(() => {
  // Restore original environment variables
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
    originalEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv.SUPABASE_SERVICE_ROLE_KEY;
});

// #endregion Mocks and Setup
// ========================================================================= //

// #region createClient
// ========================================================================= //

describe('createClient', () => {
  it('should create a client with the publishable key by default', async () => {
    await createClient();

    expect(createServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-publishable-key',
      expect.objectContaining({
        cookies: expect.any(Object),
      })
    );
  });

  it('should provide a getAll method that retrieves all cookies', async () => {
    const mockCookies = [
      { name: 'cookie1', value: 'value1' },
      { name: 'cookie2', value: 'value2' },
    ];
    mockCookieStore.getAll.mockReturnValue(mockCookies);

    await createClient();

    // Get the cookies object that was passed to createServerClient
    const cookieMethods = getCookieMethodsFromMock();

    // Test the getAll method
    const result = cookieMethods.getAll();
    expect(result).toEqual(mockCookies);
    expect(mockCookieStore.getAll).toHaveBeenCalled();
  });

  it('should provide a setAll method that sets cookies with proper options', async () => {
    await createClient();

    // Get the cookies object that was passed to createServerClient
    const cookieMethods = getCookieMethodsFromMock();

    // Test the setAll method
    const cookiesToSet = [
      {
        name: 'test-cookie-1',
        value: 'test-value-1',
        options: { httpOnly: true, secure: true },
      },
      {
        name: 'test-cookie-2',
        value: 'test-value-2',
        options: { httpOnly: false, secure: false },
      },
    ];

    cookieMethods.setAll(cookiesToSet);

    // Verify that set was called for each cookie with correct parameters
    expect(mockCookieStore.set).toHaveBeenCalledTimes(2);
    expect(mockCookieStore.set).toHaveBeenNthCalledWith(1, 'test-cookie-1', 'test-value-1', {
      httpOnly: true,
      secure: true,
    });
    expect(mockCookieStore.set).toHaveBeenNthCalledWith(2, 'test-cookie-2', 'test-value-2', {
      httpOnly: false,
      secure: false,
    });
  });

  it('should handle errors in setAll gracefully without throwing', async () => {
    mockCookieStore.set.mockImplementation(() => {
      throw new Error('Cookie setting failed');
    });

    await createClient();

    // Get the cookies object that was passed to createServerClient
    const cookieMethods = getCookieMethodsFromMock();

    // Test the setAll method with an error - it should not throw
    const cookiesToSet = [
      {
        name: 'test-cookie',
        value: 'test-value',
        options: { httpOnly: true },
      },
    ];

    // This should not throw an error
    expect(() => {
      cookieMethods.setAll(cookiesToSet);
    }).not.toThrow();

    // Verify that set was still called (even though it threw internally)
    expect(mockCookieStore.set).toHaveBeenCalledWith('test-cookie', 'test-value', {
      httpOnly: true,
    });
  });

  it('should return the Supabase client created by createServerClient', async () => {
    const client = await createClient();

    expect(client).toBe(mockSupabaseClient);
  });

  it('should await the cookies() function', async () => {
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

    await createClient();

    expect(cookies).toHaveBeenCalled();
  });
});

// #endregion createClient
// ========================================================================= //
