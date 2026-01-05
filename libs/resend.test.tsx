/**
 * @file Email module test suite.
 * @description Comprehensive testing for the Resend integration, covering rate limiting,
 * content validation, and error handling.
 */

// #region 1. External Mocks & Environment Setup
/**
 * Mock external dependencies.
 * @note Jest hoists jest.mock calls to the top of the file.
 */
jest.mock('resend');

/**
 * Mock configuration module.
 * @description Ensures ESM/CJS interop and provides static values for assertions.
 */
jest.mock('../config', () => ({
  __esModule: true,
  default: {
    resend: {
      fromAdmin: 'admin@testdomain.com',
      supportEmail: 'support@testdomain.com',
    },
  },
}));

/**
 * @env RESEND_API_KEY
 * Required for the module's top-level initialization.
 */
process.env.RESEND_API_KEY = 'mock_api_key';
// #endregion

// #region 2. Type Definitions
/**
 * @typedef {typeof import('./resend')} ResendModule
 * Represents the dynamically loaded module under test.
 */
type ResendModule = typeof import('./resend');

/**
 * @interface ConfigType
 * Defines the shape of the application's email configuration.
 */
interface ConfigType {
  resend: {
    fromAdmin: string;
    supportEmail: string;
  };
}
// #endregion

// #region 3. Global Test State & Spies
let resendModule: ResendModule;
let Resend: jest.Mocked<typeof import('resend').Resend>;
let config: ConfigType;

const mockResendSend = jest.fn();
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
// #endregion

describe('sendEmail', () => {
  const mockParams = {
    to: 'user@example.com',
    subject: 'Welcome to our service',
    text: 'Welcome!',
    html: '<h1>Welcome!</h1>',
  };

  // #region 4. Lifecycle & Dependency Injection
  beforeEach(async () => {
    /**
     * Reset module registry and fake timers to ensure test isolation.
     * Prevents internal state (like rate limiting timestamps) from leaking between tests.
     */
    jest.resetModules();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T10:00:00Z'));

    mockResendSend.mockClear();
    consoleWarnSpy.mockClear();
    consoleErrorSpy.mockClear();

    /**
     * Dynamic Module Loading.
     * Re-imports the mocked Resend class and the module under test after resetting the registry.
     */
    const resendModuleImport = await import('resend');
    Resend = resendModuleImport.Resend as unknown as jest.Mocked<typeof import('resend').Resend>;

    /**
     * Constructor Mocking.
     * Defines the structure of the Resend client returned by the constructor.
     */
    (Resend as jest.Mock).mockImplementation(() => ({
      emails: {
        send: mockResendSend,
      },
    }));

    mockResendSend.mockResolvedValue({ data: { id: 'email-id-123' }, error: null });

    const configModule = await import('../config.js');
    config = configModule.default as unknown as ConfigType;
    resendModule = await import('./resend.js');
  });

  afterAll(() => {
    jest.useRealTimers();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
  // #endregion

  // #region 5. Core Functionality
  describe('Core Sending', () => {
    it('should successfully call resend.emails.send with correct data', async () => {
      await resendModule.sendEmail(mockParams);

      expect(mockResendSend).toHaveBeenCalledTimes(1);
      const emailData = mockResendSend.mock.calls[0][0];

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
        text: '',
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
  // #endregion

  // #region 6. Error Handling
  describe('Error Handling', () => {
    it('should throw an error and log the message on Resend failure', async () => {
      const resendError = new Error('Invalid API Key');
      mockResendSend.mockResolvedValue({ data: null, error: resendError });

      await expect(resendModule.sendEmail(mockParams)).rejects.toThrow(resendError);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error sending email:', resendError.message);
    });
  });
  // #endregion

  // #region 7. Deliverability & Content Validation
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
  // #endregion

  // #region 8. Rate Limiting Logic
  describe('Rate Limiting (waitForRateLimit)', () => {
    it('should execute the first email immediately', async () => {
      await resendModule.sendEmail(mockParams);
      expect(mockResendSend).toHaveBeenCalledTimes(1);
    });

    it('should wait 400ms when called 100ms after the first email (500ms min interval)', async () => {
      await resendModule.sendEmail(mockParams); // T=0ms
      jest.advanceTimersByTime(100); // T=100ms

      const secondEmailPromise = resendModule.sendEmail(mockParams);

      expect(mockResendSend).toHaveBeenCalledTimes(1); // Pending execution

      jest.advanceTimersByTime(399); // T=499ms
      expect(mockResendSend).toHaveBeenCalledTimes(1); // Still pending

      jest.advanceTimersByTime(1); // T=500ms

      await secondEmailPromise;
      expect(mockResendSend).toHaveBeenCalledTimes(2);
    });

    it('should execute immediately if more than MIN_EMAIL_INTERVAL has passed', async () => {
      await resendModule.sendEmail(mockParams); // T=0ms
      jest.advanceTimersByTime(600); // T=600ms
      await resendModule.sendEmail(mockParams);

      expect(mockResendSend).toHaveBeenCalledTimes(2);
    });
  });
  // #endregion
});
