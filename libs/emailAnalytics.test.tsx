jest.mock('./supabase/server');

import { createClient } from './supabase/server';
import { EmailAnalytics } from './emailAnalytics';

// Mock the external dependency
const mockSupabaseChain = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn(), // Not used directly, but good practice
};

const mockFrom = jest.fn(() => mockSupabaseChain);

const mockedCreateServiceClient = createClient as jest.Mock;

mockedCreateServiceClient.mockImplementation(() => ({
  from: mockFrom,
}));

// Test data
const testEmailId = 'resend-msg-123';
const testUserId = 'user-abc-456';
const testRecipient = 'user@example.com';
const testError = { message: 'DB write failed' };

// Mock console for error tracking
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('EmailAnalytics', () => {
  let analytics: EmailAnalytics;

  beforeEach(() => {
    // Reset mocks for each test
    jest.clearAllMocks();
    analytics = new EmailAnalytics();

    // Reset chainable mocks to return 'this' for chaining
    mockSupabaseChain.select.mockReturnThis();
    mockSupabaseChain.insert.mockReturnThis();
    mockSupabaseChain.eq.mockReturnThis();
    mockSupabaseChain.gte.mockReturnThis();
    mockSupabaseChain.lte.mockReturnThis();
    mockSupabaseChain.order.mockReturnThis();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  // --- Tracking Methods ---
  describe('Tracking Methods (track... )', () => {
    it('should correctly track an email sent event', async () => {
      // Mock the final insert call's resolution
      mockSupabaseChain.insert.mockResolvedValue({ error: null });

      await analytics.trackEmailSent({
        emailType: 'welcome',
        userId: testUserId,
        trigger: 'signup',
        emailId: testEmailId,
        recipientEmail: testRecipient,
      });

      expect(mockFrom).toHaveBeenCalledWith('email_events');
      expect(mockSupabaseChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          email_type: 'welcome',
          user_id: testUserId,
          event_type: 'sent',
          email_id: testEmailId,
          recipient_email: testRecipient,
          timestamp: expect.any(String),
        })
      );
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should correctly track an email opened event', async () => {
      mockSupabaseChain.insert.mockResolvedValue({ error: null });

      await analytics.trackEmailOpened(testEmailId);

      expect(mockFrom).toHaveBeenCalledWith('email_events');
      expect(mockSupabaseChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          email_id: testEmailId,
          event_type: 'opened',
        })
      );
    });

    it('should correctly track an email clicked event', async () => {
      mockSupabaseChain.insert.mockResolvedValue({ error: null });
      const linkUrl = 'https://example.com/link';

      await analytics.trackEmailClicked(testEmailId, linkUrl);

      expect(mockSupabaseChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          email_id: testEmailId,
          event_type: 'clicked',
          link_url: linkUrl,
        })
      );
    });

    it('should correctly track an email bounced event', async () => {
      mockSupabaseChain.insert.mockResolvedValue({ error: null });

      await analytics.trackEmailBounced(testEmailId, 'hard', 'Permanent failure');

      expect(mockSupabaseChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          email_id: testEmailId,
          event_type: 'bounced',
          bounce_type: 'hard',
          bounce_reason: 'Permanent failure',
        })
      );
    });

    it('should correctly track an email complained event', async () => {
      mockSupabaseChain.insert.mockResolvedValue({ error: null });

      await analytics.trackEmailComplained(testEmailId);

      expect(mockSupabaseChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          email_id: testEmailId,
          event_type: 'complained',
        })
      );
    });

    it('should log an error if tracking fails due to DB error', async () => {
      mockSupabaseChain.insert.mockResolvedValue({ error: testError });

      await analytics.trackEmailOpened(testEmailId);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error tracking email opened:', testError);
    });

    it('should catch and log errors during tracking (network/runtime)', async () => {
      const runtimeError = new Error('Network timeout');
      mockSupabaseChain.insert.mockRejectedValue(runtimeError);

      await analytics.trackEmailOpened(testEmailId);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error tracking email opened:', runtimeError);
    });
  });

  // --- Data Retrieval Methods ---
  describe('Data Retrieval Methods', () => {
    it('should retrieve user email history and order by timestamp', async () => {
      const mockHistory = [{ id: 1, event_type: 'sent' }];
      // Mock the final query execution
      mockSupabaseChain.order.mockResolvedValue({
        data: mockHistory,
        error: null,
      });

      const result = await analytics.getUserEmailHistory(testUserId);

      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('user_id', testUserId);
      expect(mockSupabaseChain.order).toHaveBeenCalledWith('timestamp', {
        ascending: false,
      });
      expect(result).toEqual(mockHistory);
    });

    it('should return null and log error if history retrieval fails', async () => {
      mockSupabaseChain.order.mockResolvedValue({
        data: null,
        error: testError,
      });

      const result = await analytics.getUserEmailHistory(testUserId);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  // --- Metrics Calculation ---
  describe('getEmailMetrics', () => {
    const mockData = [
      { event_type: 'sent' },
      { event_type: 'sent' },
      { event_type: 'sent' }, // Total Sent: 3
      { event_type: 'opened' },
      { event_type: 'opened' }, // Total Opened: 2
      { event_type: 'clicked' }, // Total Clicked: 1
      { event_type: 'bounced' }, // Total Bounced: 1
      { event_type: 'complained' }, // Total Complained: 1
    ];

    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-01-31');

    it('should correctly calculate metrics for all email types', async () => {
      // Mock the final query execution
      mockSupabaseChain.lte.mockResolvedValue({ data: mockData, error: null });

      const metrics = await analytics.getEmailMetrics(startDate, endDate);

      // Verify the query chain
      expect(mockSupabaseChain.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseChain.gte).toHaveBeenCalledWith('timestamp', startDate.toISOString());
      expect(mockSupabaseChain.lte).toHaveBeenCalledWith('timestamp', endDate.toISOString());
      // Ensure emailType filter was NOT applied
      expect(mockSupabaseChain.eq).not.toHaveBeenCalledWith('email_type', expect.anything());

      // Verify calculated results
      expect(metrics).toEqual({
        totalSent: 3,
        totalOpened: 2,
        totalClicked: 1,
        totalBounced: 1,
        totalComplained: 1,
        // (Opened 2 / Sent 3) * 100 = 66.666...
        openRate: 66.66666666666666,
        // (Clicked 1 / Sent 3) * 100 = 33.333...
        clickRate: 33.33333333333333,
        // (Bounced 1 / Sent 3) * 100 = 33.333...
        bounceRate: 33.33333333333333,
        // (Complained 1 / Sent 3) * 100 = 33.333...
        complaintRate: 33.33333333333333,
      });
    });

    it('should filter the query when emailType is provided', async () => {
      mockSupabaseChain.eq.mockResolvedValue({ data: mockData, error: null });

      await analytics.getEmailMetrics(startDate, endDate, 'welcome');

      // Verify .eq() was called
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('email_type', 'welcome');
      // Verify the rest of the chain was also called
      expect(mockSupabaseChain.gte).toHaveBeenCalled();
      expect(mockSupabaseChain.lte).toHaveBeenCalled();
    });

    it('should return 0 rates when totalSent is 0', async () => {
      const noSentData = [{ event_type: 'opened' }, { event_type: 'clicked' }];
      mockSupabaseChain.lte.mockResolvedValue({ data: noSentData, error: null });

      const metrics = await analytics.getEmailMetrics(startDate, endDate);

      expect(metrics).toEqual({
        totalSent: 0,
        totalOpened: 1,
        totalClicked: 1,
        totalBounced: 0,
        totalComplained: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
        complaintRate: 0,
      });
    });

    it('should return null and log error if metric retrieval fails', async () => {
      mockSupabaseChain.lte.mockResolvedValue({ data: null, error: testError });

      const result = await analytics.getEmailMetrics(startDate, endDate);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should catch and log errors during metric retrieval (runtime)', async () => {
      const runtimeError = new Error('Database server offline');
      mockSupabaseChain.lte.mockRejectedValue(runtimeError);

      const result = await analytics.getEmailMetrics(startDate, endDate);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error getting email metrics:', runtimeError);
      expect(result).toBeNull();
    });
  });
});
