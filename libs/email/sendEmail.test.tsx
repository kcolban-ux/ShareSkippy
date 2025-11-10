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

// Mock external dependencies
jest.mock('@/libs/resend', () => ({
  sendEmail: jest.fn(),
}));

jest.mock('./templates', () => ({
  loadEmailTemplate: jest.fn(),
}));

// Mock the Supabase client chain
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

const mockFrom = jest.fn(() => mockSupabaseChain);
const mockCreateServiceClient = jest.fn(() => ({ from: mockFrom }));

jest.mock('@/libs/supabase/server', () => ({
  createServiceClient: () => mockCreateServiceClient(),
}));

// Type-safe mock functions
const mockedResendSendEmail = resendSendEmail as jest.Mock;
const mockedLoadEmailTemplate = loadEmailTemplate as jest.Mock;

// Silence console output during tests
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

// Test data
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

describe('Email Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

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

  // ----------------------------------------
  // sendEmail
  // ----------------------------------------
  describe('sendEmail', () => {
    it('should send an email using a template', async () => {
      // 1. Mock idempotency check (select.eq.eq.single)
      // FIX: The correct function is .mockImplementationOnce()
      mockSupabaseChain.eq.mockImplementationOnce(() => mockSupabaseChain); // for .eq('user_id', ...)
      mockSupabaseChain.eq.mockImplementationOnce(() => mockSupabaseChain); // for .eq('email_type', ...)
      mockSupabaseChain.single.mockResolvedValueOnce({ data: null, error: null }); // for .single()

      // 2. Mock template loading
      mockedLoadEmailTemplate.mockResolvedValue({
        subject: 'Welcome!',
        html: '<p>Welcome</p>',
        text: 'Welcome',
      });

      // 3. Mock DB event creation (insert.select.single)
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: mockEmailEvent,
        error: null,
      }); // for .single()

      // 4. Mock Resend success
      mockedResendSendEmail.mockResolvedValue({ id: 'resend-id-123' });

      // 5. Mock DB event update (success) (update.eq)
      mockSupabaseChain.eq.mockResolvedValueOnce({ error: null }); // for .eq('id', ...)

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

      // 1. Mock DB event creation
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: {
          ...mockEmailEvent,
          email_type: 'new_message',
          subject: 'New Message',
        },
        error: null,
      });
      // 2. Mock Resend
      mockedResendSendEmail.mockResolvedValue({ id: 'resend-id-456' });
      // 3. Mock DB update
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

      // 1. Mock idempotency check (finds existing)
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: existingEvent,
        error: null,
      });
      // 2. Mock fetch full event to return
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

      // 1. Mock idempotency check (select.eq.eq.single)
      // FIX: The correct function is .mockImplementationOnce()
      mockSupabaseChain.eq.mockImplementationOnce(() => mockSupabaseChain); // for .eq('user_id', ...)
      mockSupabaseChain.eq.mockImplementationOnce(() => mockSupabaseChain); // for .eq('email_type', ...)
      mockSupabaseChain.single.mockResolvedValueOnce({ data: null, error: null }); // for .single()

      // 2. Mock template
      mockedLoadEmailTemplate.mockResolvedValue({
        subject: 'Welcome!',
        html: '<p>Welcome</p>',
        text: 'Welcome',
      });

      // 3. Mock event creation (insert.select.single)
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: mockEmailEvent,
        error: null,
      }); // for .single()

      // 4. Mock Resend failure
      mockedResendSendEmail.mockRejectedValue(sendError);

      // 5. Mock DB update (failure) (update.eq)
      mockSupabaseChain.eq.mockResolvedValueOnce({ error: null }); // for .eq('id', ...)

      await expect(sendEmail(baseEmailParams)).rejects.toThrow('Resend API failed');

      expect(mockSupabaseChain.update).toHaveBeenCalledWith({
        status: 'failed',
        error: 'Resend API failed',
      });
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', mockEmailEvent.id);
    });

    it('should throw if subject is missing', async () => {
      // 1. Mock idempotency check (no existing email)
      mockSupabaseChain.single.mockResolvedValueOnce({ data: null, error: null });

      // 2. Mock template
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
      // 1. Mock idempotency check (no existing email)
      mockSupabaseChain.single.mockResolvedValueOnce({ data: null, error: null });

      // 2. Mock template
      mockedLoadEmailTemplate.mockResolvedValue({
        subject: 'Welcome!',
        html: '<p>Hi</p>',
        text: 'Hi',
      });

      // 3. Mock DB insert failure
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: null,
        error: new Error('DB insert error'),
      });

      await expect(sendEmail(baseEmailParams)).rejects.toThrow(
        'Failed to create email event: DB insert error'
      );
    });
  });

  // ----------------------------------------
  // scheduleEmail
  // ----------------------------------------
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

  // ----------------------------------------
  // recordUserActivity
  // ----------------------------------------
  describe('recordUserActivity', () => {
    it('should insert a user activity record', async () => {
      mockSupabaseChain.insert.mockResolvedValue({ error: null });

      await recordUserActivity({
        userId: testUserId,
        event: 'login',
        metadata: { ip: '1.1.1.1' },
      });

      expect(mockFrom).toHaveBeenCalledWith('user_activity');
      // FIX: Corrected typo in expectation
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

  // ----------------------------------------
  // getUserLastActivity
  // ----------------------------------------
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

  // ----------------------------------------
  // shouldSendReengageEmail
  // ----------------------------------------
  describe('shouldSendReengageEmail', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2025-10-31T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return true if inactive for 7+ days and no recent re-engage', async () => {
      const lastLogin = '2025-10-20T12:00:00Z';
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
});
