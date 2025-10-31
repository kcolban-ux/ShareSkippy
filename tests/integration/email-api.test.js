import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';

process.env.RESEND_API_KEY = 'mock_key_to_prevent_startup_error';

// --- MOCK DEPENDENCIES ---

jest.mock('next/server', () => {
  return {
    NextRequest: class MockNextRequest {
      constructor(url, options = {}) {
        this.url = url;
        this.method = options.method || 'GET';
        this.headers = new Map(Object.entries(options.headers || {}));
        this.body = options.body;
      }
      async json() {
        return JSON.parse(this.body);
      }
    },
  };
});

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    }),
  },
};

jest.mock('@/libs/supabase/server', () => ({
  createClient: jest.fn().mockReturnValue(mockSupabase),
  createServiceClient: jest.fn().mockReturnValue(mockSupabase),
}));

// --- TEST SUITE ---

describe('Email API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EMAIL_DEBUG_LOG = '1';
  });

  describe.skip('POST /api/emails/welcome', () => {
    it('should send welcome email for valid user', async () => {
      const { default: handler } = await import('@/app/api/emails/send-welcome/route');

      mockSupabase.single.mockResolvedValue({
        data: { email: 'test@example.com', first_name: 'John' },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/emails/send-welcome', {
        method: 'POST',
        body: JSON.stringify({ userId: 'test-user-id' }),
      });

      const response = await handler(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Welcome email sent successfully');
    });

    it('should return 404 for non-existent user', async () => {
      const { default: handler } = await import('@/app/api/emails/send-welcome/route');

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'User not found' },
      });

      const request = new NextRequest('http://localhost:3000/api/emails/send-welcome', {
        method: 'POST',
        body: JSON.stringify({ userId: 'non-existent-user' }),
      });

      const response = await handler(request);
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.error).toBe('User not found');
    });
  });

  describe.skip('POST /api/emails/send-new-message', () => {
    it('should send new message notification', async () => {
      const { default: handler } = await import('@/app/api/emails/send-new-message/route');

      // Uses sequential mocking to simulate multiple database lookups
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { email: 'recipient@example.com', first_name: 'Jane' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { first_name: 'John', last_name: 'Doe' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { email_notifications: true },
          error: null,
        });

      const request = new NextRequest('http://localhost:3000/api/emails/send-new-message', {
        method: 'POST',
        body: JSON.stringify({
          recipientId: 'recipient-id',
          senderId: 'sender-id',
          messagePreview: 'Hello there!',
          messageId: 'message-123',
        }),
      });

      const response = await handler(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
    });

    it('should skip email if notifications disabled', async () => {
      const { default: handler } = await import('@/app/api/emails/send-new-message/route');

      // Mocks the three single lookups sequentially
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { email: 'recipient@example.com', first_name: 'Jane' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { first_name: 'John', last_name: 'Doe' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { email_notifications: false }, // Notifications disabled
          error: null,
        });

      const request = new NextRequest('http://localhost:3000/api/emails/send-new-message', {
        method: 'POST',
        body: JSON.stringify({
          recipientId: 'recipient-id',
          senderId: 'sender-id',
          messagePreview: 'Hello there!',
          messageId: 'message-123',
        }),
      });

      const response = await handler(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.message).toBe('Email notifications disabled for user');
    });
  });

  describe.skip('POST /api/emails/meeting-scheduled', () => {
    it('should send meeting confirmation for confirmed meetings', async () => {
      const { default: handler } = await import('@/app/api/emails/meeting-scheduled/route');

      // Mocks for meeting, profile, and settings lookups
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'meeting-123',
            status: 'confirmed',
            requester_id: 'requester-id',
            recipient_id: 'recipient-id',
            scheduled_date: '2024-01-15T14:00:00Z',
            location: 'Central Park',
            notes: 'Bring treats!',
            requester: { first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
            recipient: { first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' },
            requester_dog: { name: 'Buddy' },
            recipient_dog: { name: 'Max' },
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { email_notifications: true }, // User settings mock
          error: null,
        });

      const request = new NextRequest('http://localhost:3000/api/emails/meeting-scheduled', {
        method: 'POST',
        body: JSON.stringify({
          meetingId: 'meeting-123',
          userId: 'requester-id',
        }),
      });

      const response = await handler(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
    });

    it('should skip email for non-confirmed meetings', async () => {
      const { default: handler } = await import('@/app/api/emails/meeting-scheduled/route');

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'meeting-123',
          status: 'pending', // Non-confirmed status
          requester_id: 'requester-id',
          recipient_id: 'recipient-id',
        },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/emails/meeting-scheduled', {
        method: 'POST',
        body: JSON.stringify({
          meetingId: 'meeting-123',
          userId: 'requester-id',
        }),
      });

      const response = await handler(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.message).toBe('Meeting not confirmed yet, skipping email');
    });
  });

  describe.skip('GET /api/cron/send-email-reminders', () => {
    it("should send meeting reminders for tomorrow's meetings", async () => {
      const { GET } = await import('@/app/api/cron/send-email-reminders/route');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      // Mock the SELECT query to return one confirmed meeting tomorrow
      mockSupabase.select.mockResolvedValue({
        data: [
          {
            id: 'meeting-123',
            status: 'confirmed',
            scheduled_date: tomorrow.toISOString(),
            location: 'Central Park',
            requester_id: 'requester-id',
            recipient_id: 'recipient-id',
            requester: { first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
            recipient: { first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' },
            requester_dog: { name: 'Buddy' },
            recipient_dog: { name: 'Max' },
          },
        ],
        error: null,
      });

      mockSupabase.update.mockResolvedValue({ error: null });

      const response = await GET();
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.emailsSent).toBe(2); // Reminder sent to both requester and recipient
    });
  });

  describe.skip('GET /api/cron/send-follow-up-emails', () => {
    it('should send 1-week follow-up emails', async () => {
      const { GET } = await import('@/app/api/cron/send-follow-up-emails/route');

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      // Mock sequence for profile, settings, dog, and activity lookups
      mockSupabase.select
        .mockResolvedValueOnce({
          data: [
            {
              id: 'user-123',
              email: 'user@example.com',
              first_name: 'John',
              created_at: sevenDaysAgo.toISOString(),
            },
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          data: { email_notifications: true },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { name: 'Buddy' },
          error: null,
        })
        .mockResolvedValueOnce({
          count: 5, // profileViews
          error: null,
        })
        .mockResolvedValueOnce({
          count: 3, // messagesReceived
          error: null,
        })
        .mockResolvedValueOnce({
          count: 1, // meetingsScheduled
          error: null,
        })
        .mockResolvedValueOnce({
          data: [{ sender_id: 'user-456', recipient_id: 'user-123' }], // connectionsMade (using message data)
          error: null,
        });

      mockSupabase.upsert.mockResolvedValue({ error: null });

      const response = await GET();
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.emailsSent).toBe(1);
    });
  });

  describe.skip('GET /api/cron/send-3day-follow-up-emails', () => {
    it('should send 3-day follow-up emails', async () => {
      const { GET } = await import('@/app/api/cron/send-3day-follow-up-emails/route');

      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      threeDaysAgo.setHours(0, 0, 0, 0);

      // Mock sequence for profile and settings lookups
      mockSupabase.select
        .mockResolvedValueOnce({
          data: [
            {
              id: 'user-123',
              email: 'user@example.com',
              first_name: 'John',
              created_at: threeDaysAgo.toISOString(),
            },
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          data: { email_notifications: true, follow_up_3day_sent: false },
          error: null,
        });

      mockSupabase.upsert.mockResolvedValue({ error: null });

      const response = await GET();
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.emailsSent).toBe(1);
    });
  });
});
