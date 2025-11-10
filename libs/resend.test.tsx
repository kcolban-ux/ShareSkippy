// 1. Mock external dependencies (Jest hoisting)
jest.mock('resend');
// Mock the 'default' export for ESM/CJS interop
jest.mock('@/config', () => ({
  __esModule: true,
  default: {
    resend: {
      fromAdmin: 'admin@testdomain.com',
      supportEmail: 'support@testdomain.com',
    },
  },
}));

// Set environment variable required by the module's top level
process.env.RESEND_API_KEY = 'mock_api_key';

// These will be assigned in beforeEach after modules are reset
// Note: We keep the type import here, but the value is loaded dynamically.
let resendModule: typeof import('./resend');
let Resend: jest.Mocked<typeof import('resend').Resend>; // Use typed mock
let config: { resend: { fromAdmin: string; supportEmail: string } };

// Mock utilities
const mockResendSend = jest.fn();
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('sendEmail', () => {
  const mockParams = {
    to: 'user@example.com',
    subject: 'Welcome to our service',
    text: 'Welcome!',
    html: '<h1>Welcome!</h1>',
  };

  beforeEach(async () => {
    // ⬅️ Must be async to use await import()
    // 1. Reset module cache to clear state (like lastEmailTime)
    jest.resetModules();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T10:00:00Z'));

    // 2. Clear mock call history from previous tests
    mockResendSend.mockClear();
    consoleWarnSpy.mockClear();
    consoleErrorSpy.mockClear();

    // 3. Re-import the mocked Resend class using dynamic import()
    const resendModuleImport = await import('resend');
    Resend = resendModuleImport.Resend as jest.Mocked<typeof import('resend').Resend>;

    // 4. Re-apply the mock implementation for the class constructor
    // This must happen *after* resetModules but *before* the module under test is imported.
    (Resend as jest.Mock).mockImplementation(() => ({
      emails: {
        send: mockResendSend,
      },
    }));

    // 5. Set default success response for tests
    mockResendSend.mockResolvedValue({ data: { id: 'email-id-123' }, error: null });

    // 6. Now, re-import the module under test and its config.
    // Use dynamic import() for both, accessing the default export for config.
    const configModule = await import('@/config');
    config = configModule.default;
    resendModule = await import('./resend');
  });

  afterAll(() => {
    jest.useRealTimers();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // --- Core Functionality ---
  describe('Core Sending', () => {
    it('should successfully call resend.emails.send with correct data', async () => {
      await resendModule.sendEmail(mockParams);

      expect(mockResendSend).toHaveBeenCalledTimes(1);
      const emailData = mockResendSend.mock.calls[0][0];

      // This comparison now works because 'config' is correctly loaded
      expect(emailData.from).toBe(config.resend.fromAdmin);
      expect(emailData.to).toBe(mockParams.to);
      expect(emailData.subject).toBe(mockParams.subject);
      expect(emailData.text).toBe(mockParams.text);
      expect(emailData.html).toBe(mockParams.html);

      expect(emailData.headers).toBeDefined();
      expect(emailData.headers['List-Unsubscribe']).toContain(config.resend.supportEmail);
      expect(emailData.headers['X-Entity-Ref-ID']).toBeDefined();
    });

    it('should strip HTML tags to create text content if text is missing', async () => {
      const emailWithMissingText = {
        ...mockParams,
        text: undefined,
        html: '<h1>Hello, World!</h1> <p>This is **bold** text.</p>',
      };

      await resendModule.sendEmail(emailWithMissingText);

      const emailData = mockResendSend.mock.calls[0][0];
      expect(emailData.text).toBe('Hello, World! This is **bold** text.');
      expect(emailData.html).toBe(emailWithMissingText.html);
    });

    it('should include replyTo header when provided', async () => {
      const replyToEmail = 'noreply@testdomain.com';
      await resendModule.sendEmail({ ...mockParams, replyTo: replyToEmail });

      const emailData = mockResendSend.mock.calls[0][0];
      expect(emailData.replyTo).toBe(replyToEmail);
    });
  });

  // --- Error Handling ---
  describe('Error Handling', () => {
    it('should throw an error and log the message on Resend failure', async () => {
      const resendError = new Error('Invalid API Key');
      mockResendSend.mockResolvedValue({ data: null, error: resendError });

      await expect(resendModule.sendEmail(mockParams)).rejects.toThrow(resendError);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error sending email:', resendError.message);
    });
  });

  // --- Deliverability/Validation ---
  describe('Content Validation (validateEmailContent)', () => {
    it('should warn for subject line being too long (>50 chars)', async () => {
      const longSubject = 'A very long subject line that exceeds fifty characters by a wide margin';
      await resendModule.sendEmail({ ...mockParams, subject: longSubject });

      expect(consoleWarnSpy).toHaveBeenCalledWith('Email deliverability warnings:', [
        'Subject line is too long (>50 chars)',
      ]);
    });

    it('should warn for subject line being all caps', async () => {
      await resendModule.sendEmail({ ...mockParams, subject: 'URGENT FREE ALERT' });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Email deliverability warnings:',
        expect.arrayContaining([
          'Subject is all caps',
          'Subject contains potential spam trigger words',
        ])
      );
    });

    it.each([
      ['free cash', 'Subject contains potential spam trigger words'],
      ['limited time offer', 'Subject contains potential spam trigger words'],
      ['click here to start', 'Subject contains potential spam trigger words'],
    ])('should warn for spam triggers in subject: %s', async (subject, expectedWarning) => {
      await resendModule.sendEmail({ ...mockParams, subject });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Email deliverability warnings:',
        expect.arrayContaining([expectedWarning])
      );
    });

    it('should warn for spam triggers in HTML content', async () => {
      await resendModule.sendEmail({
        ...mockParams,
        subject: 'Regular subject',
        html: '<div>This is a FREE offer! Click Here.</div>',
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith('Email deliverability warnings:', [
        'Email content contains potential spam trigger words',
      ]);
    });
  });

  // --- Rate Limiting ---
  describe('Rate Limiting (waitForRateLimit)', () => {
    it('should execute the first email immediately', async () => {
      await resendModule.sendEmail(mockParams);
      expect(mockResendSend).toHaveBeenCalledTimes(1);
    });

    it('should wait 400ms when called 100ms after the first email (500ms min interval)', async () => {
      await resendModule.sendEmail(mockParams); // T=0ms
      jest.advanceTimersByTime(100); // T=100ms

      const secondEmailPromise = resendModule.sendEmail(mockParams);

      expect(mockResendSend).toHaveBeenCalledTimes(1); // Still waiting

      // Advance to just before the timer fires
      jest.advanceTimersByTime(399); // T=499ms
      expect(mockResendSend).toHaveBeenCalledTimes(1); // Still waiting

      // Advance past the timer
      jest.advanceTimersByTime(1); // T=500ms

      await secondEmailPromise;
      expect(mockResendSend).toHaveBeenCalledTimes(2);
    });

    it('should execute immediately if more than MIN_EMAIL_INTERVAL has passed', async () => {
      await resendModule.sendEmail(mockParams); // T=0ms

      jest.advanceTimersByTime(600); // T=600ms

      await resendModule.sendEmail(mockParams); // Should run immediately

      expect(mockResendSend).toHaveBeenCalledTimes(2);
    });
  });
});
