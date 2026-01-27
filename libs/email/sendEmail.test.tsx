// #region Imports
import {
  sendEmail,
  scheduleEmail,
  recordUserActivity,
  getUserLastActivity,
  shouldSendReengageEmail,
  type EmailEvent,
  type SendEmailParams,
} from './sendEmail'; // Adjust path if your test file is elsewhere
import { sendEmail as resendSendEmail } from '@/libs/resend';
import { loadEmailTemplate } from './templates';
// #endregion Imports

// #region Mocks
/**
 * Mock the Resend email sending library.
 */
jest.mock('@/libs/resend', () => ({
  sendEmail: jest.fn(),
}));

/**
 * Mock the email template loading utility.
 */
jest.mock('./templates', () => ({
  loadEmailTemplate: jest.fn(),
}));

/**
 * Create a chainable mock object for the Supabase client query builder.
 * Each method returns `this` to allow chaining (e.g., .select().eq()...).
 */
const mockSupabaseChain = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn(),
};

/**
 * Mock the Supabase client's `.from()` method.
 */
const mockFrom = jest.fn(() => mockSupabaseChain);

/**
 * Mock the service client factory.
 */
const mockCreateServiceClient = jest.fn(() => ({ from: mockFrom }));

/**
 * Mock the server-side Supabase client module.
 */
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateServiceClient(),
}));

/**
 * Create typed references to the mocked functions for type-safe usage.
 */
const mockedResendSendEmail = resendSendEmail as jest.Mock;
const mockedLoadEmailTemplate = loadEmailTemplate as jest.Mock;

/**
 * Silence console logs and errors during tests to keep test output clean.
 */
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});
// #endregion Mocks

// #region Test Data
const testUserId = 'user-123-abc';
const testEmail = 'test@example.com';

const baseEmailParams: SendEmailParams = {
  userId: testUserId,
  to: testEmail,
  emailType: 'welcome',
};

const mockEmailEvent: EmailEvent = {
  id: 1,
  user_id: testUserId,
  email_type: 'welcome',
  status: 'queued',
  to_email: testEmail,
  subject: 'Test Subject',
  payload: {},
  created_at: new Date().toISOString(),
};
// #endregion Test Data

describe('Email Service', () => {
  // #region Test Lifecycle
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all mock chain methods and their implementations
    mockSupabaseChain.select.mockClear().mockReturnThis();
    mockSupabaseChain.insert.mockClear().mockReturnThis();
    mockSupabaseChain.update.mockClear().mockReturnThis();
    mockSupabaseChain.eq.mockClear().mockReturnThis();
    mockSupabaseChain.gte.mockClear().mockReturnThis();
    mockSupabaseChain.order.mockClear().mockReturnThis();
    mockSupabaseChain.limit.mockClear().mockReturnThis();
    mockSupabaseChain.single.mockReset();

    mockFrom.mockClear().mockReturnValue(mockSupabaseChain);
    mockCreateServiceClient.mockClear().mockReturnValue({ from: mockFrom });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });
  // #endregion Test Lifecycle

  // #region Test Cases
  describe('sendEmail', () => {
    it('should send an email using a template', async () => {
      /**
       * Mock the database flow for a new email:
       * 1. Idempotency check: .single() resolves to { data: null } (no existing email).
       * 2. Template loading: mockedLoadEmailTemplate resolves with content.
       * 3. Event creation: .single() resolves with the new event object.
       * 4. Resend call: mockedResendSendEmail resolves with a Resend ID.
       * 5. Event update: .eq() (for the update) resolves successfully.
       */
      mockSupabaseChain.eq.mockImplementationOnce(() => mockSupabaseChain);
      mockSupabaseChain.eq.mockImplementationOnce(() => mockSupabaseChain);
      mockSupabaseChain.single.mockResolvedValueOnce({ data: null, error: null });

      mockedLoadEmailTemplate.mockResolvedValue({
        subject: 'Welcome!',
        html: '<p>Welcome</p>',
        text: 'Welcome',
      });

      mockSupabaseChain.single.mockResolvedValueOnce({
        data: mockEmailEvent,
        error: null,
      });

      mockedResendSendEmail.mockResolvedValue({ id: 'resend-id-123' });

      mockSupabaseChain.eq.mockResolvedValueOnce({ error: null });

      const result = await sendEmail(baseEmailParams);

      expect(mockedLoadEmailTemplate).toHaveBeenCalledWith('welcome', {});
      expect(mockSupabaseChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: testUserId,
          email_type: 'welcome',
        })
      );
      expect(mockedResendSendEmail).toHaveBeenCalledWith({
        to: testEmail,
        subject: 'Welcome!',
        html: '<p>Welcome</p>',
        text: 'Welcome',
      });
      expect(mockSupabaseChain.update).toHaveBeenCalledWith({
        status: 'sent',
        external_message_id: 'resend-id-123',
      });
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', mockEmailEvent.id);

      expect(result).toEqual(
        expect.objectContaining({
          id: 1,
          status: 'sent',
          external_message_id: 'resend-id-123',
        })
      );
    });

    it('should send an email with explicit content', async () => {
      const explicitParams: SendEmailParams = {
        ...baseEmailParams,
        emailType: 'new_message',
        subject: 'New Message',
        html: '<h1>Hi</h1>',
        text: 'Hi',
      };

      /**
       * Mock the flow for an explicit email (no idempotency check):
       * 1. Event creation: .single() resolves with the new event.
       * 2. Resend call: mockedResendSendEmail resolves.
       * 3. Event update: .eq() resolves.
       */
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: {
          ...mockEmailEvent,
          email_type: 'new_message',
          subject: 'New Message',
        },
        error: null,
      });
      mockedResendSendEmail.mockResolvedValue({ id: 'resend-id-456' });
      mockSupabaseChain.eq.mockResolvedValueOnce({ error: null });

      await sendEmail(explicitParams);

      expect(mockedLoadEmailTemplate).not.toHaveBeenCalled();
      expect(mockedResendSendEmail).toHaveBeenCalledWith({
        to: testEmail,
        subject: 'New Message',
        html: '<h1>Hi</h1>',
        text: 'Hi',
      });
      expect(mockSupabaseChain.select).not.toHaveBeenCalledWith('id, status');
    });

    it('should skip sending if an idempotent email already exists', async () => {
      const existingEvent = { id: 99, status: 'sent' };
      const fullExistingEvent = { ...mockEmailEvent, id: 99, status: 'sent' };

      /**
       * Mock the idempotency check finding an existing event:
       * 1. Check: .single() resolves with the existing event stub.
       * 2. Fetch full event: .single() resolves with the full event.
       */
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: existingEvent,
        error: null,
      });
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: fullExistingEvent,
        error: null,
      });

      const result = await sendEmail(baseEmailParams);

      expect(mockSupabaseChain.select).toHaveBeenCalledWith('id, status');
      expect(mockedResendSendEmail).not.toHaveBeenCalled();
      expect(result).toEqual(fullExistingEvent);
    });

    it('should handle Resend failure and update event status', async () => {
      const sendError = new Error('Resend API failed');

      /**
       * Mock the flow for a failed Resend API call:
       * 1. Idempotency check: .single() resolves { data: null }.
       * 2. Template loading: Resolves successfully.
       * 3. Event creation: .single() resolves with the new event.
       * 4. Resend call: mockedResendSendEmail REJECTS with an error.
       * 5. Event update (failure): .eq() resolves successfully.
       */
      mockSupabaseChain.eq.mockImplementationOnce(() => mockSupabaseChain);
      mockSupabaseChain.eq.mockImplementationOnce(() => mockSupabaseChain);
      mockSupabaseChain.single.mockResolvedValueOnce({ data: null, error: null });

      mockedLoadEmailTemplate.mockResolvedValue({
        subject: 'Welcome!',
        html: '<p>Welcome</p>',
        text: 'Welcome',
      });

      mockSupabaseChain.single.mockResolvedValueOnce({
        data: mockEmailEvent,
        error: null,
      });

      mockedResendSendEmail.mockRejectedValue(sendError);

      mockSupabaseChain.eq.mockResolvedValueOnce({ error: null });

      await expect(sendEmail(baseEmailParams)).rejects.toThrow('Resend API failed');

      expect(mockSupabaseChain.update).toHaveBeenCalledWith({
        status: 'failed',
        error: 'Resend API failed',
      });
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', mockEmailEvent.id);
    });

    it('should throw if subject is missing', async () => {
      mockSupabaseChain.single.mockResolvedValueOnce({ data: null, error: null });

      mockedLoadEmailTemplate.mockResolvedValue({
        subject: null,
        html: '<p>Hi</p>',
        text: 'Hi',
      });

      await expect(sendEmail(baseEmailParams)).rejects.toThrow(
        'Subject is required for email type: welcome'
      );
    });

    it('should throw if event creation fails', async () => {
      mockSupabaseChain.single.mockResolvedValueOnce({ data: null, error: null });

      mockedLoadEmailTemplate.mockResolvedValue({
        subject: 'Welcome!',
        html: '<p>Hi</p>',
        text: 'Hi',
      });

      mockSupabaseChain.single.mockResolvedValueOnce({
        data: null,
        error: new Error('DB insert error'),
      });

      await expect(sendEmail(baseEmailParams)).rejects.toThrow(
        'Failed to create email event: DB insert error'
      );
    });
  });

  describe('scheduleEmail', () => {
    it('should insert a scheduled email record', async () => {
      const runAfter = new Date('2025-12-01T10:00:00Z');
      mockSupabaseChain.insert.mockResolvedValue({ error: null });

      await scheduleEmail({
        userId: testUserId,
        emailType: 'nurture_day3',
        runAfter,
        payload: { name: 'Test' },
      });

      expect(mockFrom).toHaveBeenCalledWith('scheduled_emails');
      expect(mockSupabaseChain.insert).toHaveBeenCalledWith({
        user_id: testUserId,
        email_type: 'nurture_day3',
        run_after: runAfter.toISOString(),
        payload: { name: 'Test' },
      });
    });

    it('should throw if scheduling fails', async () => {
      mockSupabaseChain.insert.mockResolvedValue({
        error: new Error('DB schedule error'),
      });

      await expect(
        scheduleEmail({
          userId: testUserId,
          emailType: 'nurture_day3',
          runAfter: new Date(),
        })
      ).rejects.toThrow('Failed to schedule email: DB schedule error');
    });
  });

  describe('recordUserActivity', () => {
    it('should insert a user activity record', async () => {
      mockSupabaseChain.insert.mockResolvedValue({ error: null });

      await recordUserActivity({
        userId: testUserId,
        event: 'login',
        metadata: { ip: '1.1.1.1' },
      });

      expect(mockFrom).toHaveBeenCalledWith('user_activity');
      expect(mockSupabaseChain.insert).toHaveBeenCalledWith({
        user_id: testUserId,
        event: 'login',
        metadata: { ip: '1.1.1.1' },
      });
    });

    it('should not throw on failure, but should log error', async () => {
      mockSupabaseChain.insert.mockResolvedValue({
        error: new Error('DB activity error'),
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        recordUserActivity({ userId: testUserId, event: 'login' })
      ).resolves.not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to record user activity:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getUserLastActivity', () => {
    it('should return the last activity date if found', async () => {
      const activityDate = '2025-10-20T12:00:00Z';
      mockSupabaseChain.single.mockResolvedValue({
        data: { at: activityDate },
        error: null,
      });

      const result = await getUserLastActivity(testUserId, 'login');

      expect(mockFrom).toHaveBeenCalledWith('user_activity');
      expect(mockSupabaseChain.select).toHaveBeenCalledWith('at');
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('user_id', testUserId);
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('event', 'login');
      expect(mockSupabaseChain.order).toHaveBeenCalledWith('at', {
        ascending: false,
      });
      expect(mockSupabaseChain.limit).toHaveBeenCalledWith(1);
      expect(result).toEqual(new Date(activityDate));
    });

    it('should return null if no activity is found', async () => {
      mockSupabaseChain.single.mockResolvedValue({ data: null, error: null });

      const result = await getUserLastActivity(testUserId, 'login');

      expect(result).toBeNull();
    });
  });

  describe('shouldSendReengageEmail', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2025-10-31T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return true if inactive for 7+ days and no recent re-engage', async () => {
      const lastLogin = '2025-10-20T12:00:00Z';
      /**
       * Mock:
       * 1. Get last login: .single() resolves with an old date.
       * 2. Check for recent re-engage: .single() resolves { data: null }.
       */
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: { at: lastLogin },
        error: null,
      });
      mockSupabaseChain.single.mockResolvedValueOnce({ data: null, error: null });

      const result = await shouldSendReengageEmail(testUserId);

      expect(result).toBe(true);
      expect(mockFrom).toHaveBeenNthCalledWith(1, 'user_activity');
      expect(mockFrom).toHaveBeenNthCalledWith(2, 'email_events');
      expect(mockSupabaseChain.gte).toHaveBeenCalledWith('created_at', '2025-10-10T12:00:00.000Z');
    });

    it('should return false if active (login < 7 days ago)', async () => {
      const lastLogin = '2025-10-28T12:00:00Z';
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: { at: lastLogin },
        error: null,
      });

      const result = await shouldSendReengageEmail(testUserId);

      expect(result).toBe(false);
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it('should return false if inactive but already re-engaged recently', async () => {
      const lastLogin = '2025-10-20T12:00:00Z';
      /**
       * Mock:
       * 1. Get last login: .single() resolves with an old date.
       * 2. Check for recent re-engage: .single() resolves with a recent email.
       */
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: { at: lastLogin },
        error: null,
      });
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: { created_at: '2025-10-25T12:00:00Z' },
        error: null,
      });

      const result = await shouldSendReengageEmail(testUserId);

      expect(result).toBe(false);
      expect(mockFrom).toHaveBeenCalledTimes(2);
    });

    it('should return false if user has no login activity', async () => {
      mockSupabaseChain.single.mockResolvedValueOnce({ data: null, error: null });

      const result = await shouldSendReengageEmail(testUserId);

      expect(result).toBe(false);
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });
  });
  // #endregion Test Cases
});
