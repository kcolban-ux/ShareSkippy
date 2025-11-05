import { sendContact } from './sendContact';
import { rateLimit } from '@/lib/ratelimit';

type TestFormData = {
  name: string;
  email: string;
  category: 'general';
  subject: string;
  message: string;
};

// --- Mock Dependencies ---

// Mock next/headers
const mockHeadersGet = jest.fn();
jest.mock('next/headers', () => ({
  headers: jest.fn(() => ({
    get: mockHeadersGet,
  })),
}));

// Mock rateLimit
jest.mock('@/lib/ratelimit');
const mockRateLimit = rateLimit as jest.Mock;

// Mock resend (dynamically imported)
const mockSendEmail = jest.fn();
jest.mock('@/libs/resend', () => ({
  __esModule: true,
  sendEmail: mockSendEmail,
}));

// --- Helper Functions ---

const createMockFormData = (data: Record<string, string>): FormData => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.append(key, value);
  }
  return formData;
};

// --- Tests ---

describe('sendContact Server Action', () => {
  const validFormData: TestFormData = {
    name: 'Test User',
    email: 'test@example.com',
    category: 'general',
    subject: 'Test Subject',
    message: 'This is a test message that is long enough',
  };

  beforeEach(() => {
    jest.clearAllMocks(); // Reset all mock implementations and call history

    mockHeadersGet.mockReturnValue('1.2.3.4'); // Default IP
    mockRateLimit.mockResolvedValue(true); // Default: Not rate limited
    mockSendEmail.mockResolvedValue({ data: { id: 'email-id' }, error: null }); // Default: Email sends
  });

  it('should successfully send an email with valid data', async () => {
    const formData = createMockFormData(validFormData);
    const result = await sendContact(formData);

    expect(result).toEqual({ ok: true });

    expect(mockRateLimit).toHaveBeenCalledWith('1.2.3.4', 'contact:submit', 5, 600);

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
    const result = await sendContact(formData);

    expect(result.ok).toBe(false);
    expect(result.errors).toBeDefined();

    expect(mockRateLimit).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('should silently succeed for bots (honeypot filled)', async () => {
    const botData = {
      ...validFormData,
      hp: 'i-am-a-bot', // Honeypot field is filled
    };
    const formData = createMockFormData(botData);
    const result = await sendContact(formData);

    expect(result).toEqual({ ok: true });

    expect(mockRateLimit).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('should return a rate limit error if rate limit is exceeded', async () => {
    mockRateLimit.mockResolvedValue(false); // Override default mock to simulate rate limit failure

    const formData = createMockFormData(validFormData);
    const result = await sendContact(formData);

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual({
      _: ['Too many requests. Please try again later.'],
    });

    expect(mockRateLimit).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('should return an error if sending the email fails', async () => {
    const emailError = new Error('Resend failed to send');
    mockSendEmail.mockRejectedValue(emailError); // Override default mock to simulate email failure

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
