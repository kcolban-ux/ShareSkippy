/**
 * @jest-environment jsdom
 */

// #region Imports
import {
  processScheduledEmails,
  scheduleMeetingReminder,
  scheduleNurtureEmail,
  getUserScheduledEmails,
  cancelUserScheduledEmails,
  ScheduledEmail,
} from './scheduler';
import { sendEmail } from './sendEmail';
// #endregion Imports

// #region Mocks
/**
 * Mock the core sendEmail function to prevent actual email sends
 * and allow for spying on its calls.
 */
jest.mock('./sendEmail', () => ({
  sendEmail: jest.fn(),
}));

/**
 * Create a deep, chainable mock for the Supabase client.
 */
type SupabaseMock = {
  from: jest.Mock;
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  lte: jest.Mock;
  is: jest.Mock;
  limit: jest.Mock;
  order: jest.Mock;
  single: jest.Mock;
};

const mockSupabase: SupabaseMock = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  delete: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  lte: jest.fn(() => mockSupabase),
  is: jest.fn(() => mockSupabase),
  limit: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  single: jest.fn(() => mockSupabase),
};

/**
 * Mock the Supabase server client factory to return our chainable mock.
 */
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

/**
 * Silence console.error during tests to keep test output clean,
 * especially for intentionally thrown errors.
 */
jest.spyOn(console, 'error').mockImplementation(() => {});

/**
 * Create a typed reference to the mocked sendEmail function.
 */
const mockedSendEmail = sendEmail as jest.Mock;
// #endregion Mocks

// #region Test Constants
/**
 * A fixed system time for deterministic date-based calculations.
 */
const MOCK_DATE = '2025-11-01T10:00:00.000Z';
// #endregion Test Constants

describe('Scheduled Email Functions', () => {
  // #region Test Lifecycle
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(MOCK_DATE));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    /**
     * Reset all mock implementations to return 'this' for chaining,
     * ensuring test isolation.
     */
    mockSupabase.from.mockImplementation(() => mockSupabase);
    mockSupabase.select.mockImplementation(() => mockSupabase);
    mockSupabase.insert.mockImplementation(() => mockSupabase);
    mockSupabase.update.mockImplementation(() => mockSupabase);
    mockSupabase.delete.mockImplementation(() => mockSupabase);
    mockSupabase.eq.mockImplementation(() => mockSupabase);
    mockSupabase.lte.mockImplementation(() => mockSupabase);
    mockSupabase.is.mockImplementation(() => mockSupabase);
    mockSupabase.limit.mockImplementation(() => mockSupabase);
    mockSupabase.order.mockImplementation(() => mockSupabase);
    mockSupabase.single.mockImplementation(() => mockSupabase);

    mockedSendEmail.mockResolvedValue(undefined);
  });
  // #endregion Test Lifecycle

  // #region Test Cases
  describe('processScheduledEmails', () => {
    const mockEmail: ScheduledEmail = {
      id: 1,
      user_id: 'user-123',
      email_type: 'test_email',
      run_after: '2025-11-01T09:00:00.000Z',
      payload: { subject: 'Test' },
      picked_at: null,
      created_at: '2025-11-01T08:00:00.000Z',
    };
    const mockUser = {
      email: 'test@example.com',
      first_name: 'Test',
    };

    it('should return {0, []} if the table does not exist', async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: null,
        error: { message: 'Could not find the table' },
      });

      const result = await processScheduledEmails();

      expect(result).toEqual({ processed: 0, errors: [] });
      expect(mockSupabase.from).toHaveBeenCalledWith('scheduled_emails');
      expect(mockSupabase.select).toHaveBeenCalledWith('id');
      expect(mockSupabase.limit).toHaveBeenCalledWith(1);
    });

    it('should return {0, []} if no emails are due', async () => {
      mockSupabase.limit.mockResolvedValueOnce({ data: [{}], error: null });
      mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null });

      const result = await processScheduledEmails();

      expect(result).toEqual({ processed: 0, errors: [] });
      expect(mockSupabase.from).toHaveBeenCalledWith('scheduled_emails');
      expect(mockSupabase.lte).toHaveBeenCalledWith('run_after', MOCK_DATE);
      expect(mockSupabase.is).toHaveBeenCalledWith('picked_at', null);
    });

    it('should throw an error if fetching emails fails', async () => {
      mockSupabase.limit.mockResolvedValueOnce({ data: [{}], error: null });

      mockSupabase.limit.mockResolvedValueOnce({
        data: null,
        error: { message: 'Fetch failed' },
      });

      await expect(processScheduledEmails()).rejects.toThrow(
        'Failed to fetch scheduled emails: Fetch failed'
      );
    });

    it('should process a scheduled email successfully', async () => {
      mockSupabase.limit.mockResolvedValueOnce({ data: [{}], error: null });
      mockSupabase.limit.mockResolvedValueOnce({ data: [mockEmail], error: null });
      mockSupabase.eq.mockResolvedValueOnce({ error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: mockUser, error: null });

      const result = await processScheduledEmails();

      expect(result).toEqual({ processed: 1, errors: [] });
      expect(mockSupabase.update).toHaveBeenCalledWith({ picked_at: MOCK_DATE });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', mockEmail.id);

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', mockEmail.user_id);
      expect(mockSupabase.single).toHaveBeenCalled();

      expect(mockedSendEmail).toHaveBeenCalledWith({
        userId: mockEmail.user_id,
        to: mockUser.email,
        emailType: mockEmail.email_type,
        payload: mockEmail.payload,
      });
    });

    it('should log an error if marking as picked up fails', async () => {
      mockSupabase.limit.mockResolvedValueOnce({ data: [{}], error: null });
      mockSupabase.limit.mockResolvedValueOnce({ data: [mockEmail], error: null });
      mockSupabase.eq.mockResolvedValueOnce({
        error: { message: 'Update failed' },
      });

      const result = await processScheduledEmails();

      expect(result.processed).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        id: mockEmail.id,
        error: 'Update failed',
      });
      expect(mockedSendEmail).not.toHaveBeenCalled();
    });

    it('should log an error if user is not found', async () => {
      mockSupabase.limit.mockResolvedValueOnce({ data: [{}], error: null });
      mockSupabase.limit.mockResolvedValueOnce({ data: [mockEmail], error: null });
      mockSupabase.eq.mockResolvedValueOnce({ error: null });
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await processScheduledEmails();

      expect(result.processed).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        id: mockEmail.id,
        error: 'User not found',
      });
      expect(mockedSendEmail).not.toHaveBeenCalled();
    });

    it('should log an error if sendEmail fails', async () => {
      mockedSendEmail.mockRejectedValueOnce(new Error('Email send failed'));

      mockSupabase.limit.mockResolvedValueOnce({ data: [{}], error: null });
      mockSupabase.limit.mockResolvedValueOnce({ data: [mockEmail], error: null });
      mockSupabase.eq.mockResolvedValueOnce({ error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: mockUser, error: null });

      const result = await processScheduledEmails();

      expect(result.processed).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        id: mockEmail.id,
        error: 'Email send failed',
      });
    });
  });

  describe('scheduleMeetingReminder', () => {
    it('should schedule a reminder 1 day before the meeting', async () => {
      const startsAt = new Date('2025-11-10T14:00:00Z');
      const expectedReminderTime = new Date('2025-11-09T14:00:00Z');

      mockSupabase.insert.mockResolvedValueOnce({ error: null });

      await scheduleMeetingReminder({
        userId: 'user-123',
        meetingId: 'meeting-456',
        meetingTitle: 'Test Meeting',
        startsAt: startsAt,
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('scheduled_emails');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        email_type: 'meeting_reminder',
        run_after: expectedReminderTime.toISOString(),
        payload: {
          meetingId: 'meeting-456',
          meetingTitle: 'Test Meeting',
          startsAt: startsAt.toISOString(),
        },
      });
    });

    it('should throw an error if scheduling fails', async () => {
      mockSupabase.insert.mockResolvedValueOnce({
        error: { message: 'Insert failed' },
      });

      await expect(
        scheduleMeetingReminder({
          userId: 'user-123',
          meetingId: 'meeting-456',
          meetingTitle: 'Test Meeting',
          startsAt: new Date(),
        })
      ).rejects.toThrow('Failed to schedule meeting reminder: Insert failed');
    });
  });

  describe('scheduleNurtureEmail', () => {
    it('should schedule a nurture email 3 days from now', async () => {
      const expectedNurtureTime = new Date(MOCK_DATE);
      expectedNurtureTime.setDate(expectedNurtureTime.getDate() + 3);

      mockSupabase.insert.mockResolvedValueOnce({ error: null });

      await scheduleNurtureEmail('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('scheduled_emails');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        email_type: 'nurture_day3',
        run_after: expectedNurtureTime.toISOString(),
        payload: {},
      });
    });

    it('should throw an error if scheduling fails', async () => {
      mockSupabase.insert.mockResolvedValueOnce({
        error: { message: 'Insert failed' },
      });

      await expect(scheduleNurtureEmail('user-123')).rejects.toThrow(
        'Failed to schedule nurture email: Insert failed'
      );
    });
  });

  describe('getUserScheduledEmails', () => {
    it('should return a list of scheduled emails for a user', async () => {
      const mockEmails = [{ id: 1 }, { id: 2 }];
      mockSupabase.order.mockResolvedValueOnce({ data: mockEmails, error: null });

      const result = await getUserScheduledEmails('user-123');

      expect(result).toBe(mockEmails);
      expect(mockSupabase.from).toHaveBeenCalledWith('scheduled_emails');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockSupabase.order).toHaveBeenCalledWith('run_after', {
        ascending: true,
      });
    });

    it('should return an empty array if no emails are found', async () => {
      mockSupabase.order.mockResolvedValueOnce({ data: null, error: null });

      const result = await getUserScheduledEmails('user-123');

      expect(result).toEqual([]);
    });

    it('should throw an error if fetching fails', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: { message: 'Select failed' },
      });

      await expect(getUserScheduledEmails('user-123')).rejects.toThrow(
        'Failed to get scheduled emails: Select failed'
      );
    });
  });

  describe('cancelUserScheduledEmails', () => {
    it('should cancel all emails for a user if no type is provided', async () => {
      mockSupabase.eq.mockResolvedValueOnce({ error: null });

      await cancelUserScheduledEmails('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('scheduled_emails');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledTimes(1);
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('should cancel emails of a specific type for a user', async () => {
      mockSupabase.eq.mockImplementationOnce(() => mockSupabase);
      mockSupabase.eq.mockResolvedValueOnce({ error: null });

      await cancelUserScheduledEmails('user-123', 'meeting_reminder');

      expect(mockSupabase.from).toHaveBeenCalledWith('scheduled_emails');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledTimes(2);
      expect(mockSupabase.eq).toHaveBeenNthCalledWith(1, 'user_id', 'user-123');
      expect(mockSupabase.eq).toHaveBeenNthCalledWith(2, 'email_type', 'meeting_reminder');
    });

    it('should throw an error if deletion fails', async () => {
      mockSupabase.eq.mockResolvedValueOnce({
        error: { message: 'Delete failed' },
      });

      await expect(cancelUserScheduledEmails('user-123')).rejects.toThrow(
        'Failed to cancel scheduled emails: Delete failed'
      );
    });
  });
  // #endregion Test Cases
});
