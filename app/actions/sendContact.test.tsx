import { sendContact } from './sendContact';
// 1. Import the module. Jest's auto-mock (below) will replace it.
import { rateLimit } from '@/lib/ratelimit';

// --- Mock Dependencies ---

// Mock next/headers
const mockHeadersGet = jest.fn();
jest.mock('next/headers', () => ({
  headers: jest.fn(() => ({
    get: mockHeadersGet,
  })),
}));

// Mock rateLimit
// 2. Auto-mock the statically imported module.
// This must happen *before* the import statement,
// but thanks to hoisting, Jest handles it. We put the import at the top for clarity.
jest.mock('@/lib/ratelimit');

// 3. Cast the imported mock to get a typed handle to it.
const mockRateLimit = rateLimit as jest.Mock;

// Mock resend (which is dynamically imported)
// This pattern is CORRECT for dynamic imports, as `mockSendEmail`
// is defined before the import() is called at runtime.
const mockSendEmail = jest.fn();
jest.mock('@/libs/resend', () => ({
  __esModule: true,
  sendEmail: mockSendEmail,
}));

// --- Helper Functions ---

/**
 * Creates a FormData object from a plain object.
 */
const createMockFormData = (data: Record<string, string>): FormData => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.append(key, value);
  }
  return formData;
};

// --- Tests ---

describe('sendContact Server Action', () => {
  // A valid payload that should pass validation
  const validFormData = {
    name: 'Test User',
    email: 'test@example.com',
    category: 'general' as 'general',
    subject: 'Test Subject',
    message: 'This is a test message that is long enough.',
  };

  beforeEach(() => {
    // Reset all mock implementations and call history before each test
    jest.clearAllMocks(); // Set default "happy path" mock implementations

    mockHeadersGet.mockReturnValue('1.2.3.4'); // Default IP
    // 4. Use the mock handle. This will now work.
    mockRateLimit.mockResolvedValue(true); // Default: Not rate limited
    mockSendEmail.mockResolvedValue({ data: { id: 'email-id' }, error: null }); // Default: Email sends
  }); // --- Test Cases ---

  it('should successfully send an email with valid data', async () => {
    const formData = createMockFormData(validFormData);
    const result = await sendContact(formData); // 1. Check response

    expect(result).toEqual({ ok: true }); // 2. Check that rate limiting was called

    expect(mockRateLimit).toHaveBeenCalledWith('1.2.3.4', 'contact:submit', 5, 600); // 3. Check that sendEmail was called with the correct data

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'support@shareskippy.com',
        subject: '[GENERAL] Test Subject',
        replyTo: 'test@example.com',
      })
    );
  });

  it('should return Zod validation errors for invalid data', async () => {
    const invalidData = {
      ...validFormData,
      email: 'not-an-email', // Invalid email
      message: 'short', // Too short
    };
    const formData = createMockFormData(invalidData);
    const result = await sendContact(formData); // 1. Check response

    expect(result.ok).toBe(false);
    expect(result.errors).toBeDefined(); // 2. Check that rate limit and email were NOT called

    expect(mockRateLimit).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('should silently succeed for bots (honeypot filled)', async () => {
    const botData = {
      ...validFormData,
      hp: 'i-am-a-bot', // Honeypot field is filled
    };
    const formData = createMockFormData(botData);
    const result = await sendContact(formData); // 1. Check response

    expect(result).toEqual({ ok: true }); // 2. Check that rate limit and email were NOT called

    expect(mockRateLimit).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('should return a rate limit error if rate limit is exceeded', async () => {
    // Override default mock to simulate rate limit failure
    mockRateLimit.mockResolvedValue(false);

    const formData = createMockFormData(validFormData);
    const result = await sendContact(formData); // 1. Check response

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual({
      _: ['Too many requests. Please try again later.'],
    }); // 2. Check that rate limit was called

    expect(mockRateLimit).toHaveBeenCalledTimes(1); // 3. Check that email was NOT called

    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('should return an error if sending the email fails', async () => {
    const emailError = new Error('Resend failed to send'); // Override default mock to simulate email failure
    mockSendEmail.mockRejectedValue(emailError);

    const formData = createMockFormData(validFormData);
    const result = await sendContact(formData);

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual({
      _: [
        'Failed to send message. Please try again or contact support directly at support@shareskippy.com.',
      ],
    });
  });
});
