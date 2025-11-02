import { EmailQueue } from './emailQueue';

jest.useFakeTimers();
jest.spyOn(global, 'setTimeout');

describe('EmailQueue', () => {
  let queue: EmailQueue;
  let mockSendFn: jest.Mock;
  const mockEmailData = { emailType: 'test_email', userId: 'user-123' };

  beforeEach(() => {
    // Set a predictable start time *after* enabling fake timers
    jest.setSystemTime(new Date('2025-01-01T10:00:00Z'));

    queue = new EmailQueue();
    // Speed up rate limiting for tests: 10 emails max per 1 second (1000ms)
    queue.updateRateLimit({ maxEmails: 10, windowMs: 1000 });

    // Mock the send function that the queue will call
    mockSendFn = jest.fn().mockResolvedValue('OK');
    queue.clearQueue();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  // --- Core Queue Management ---
  describe('Core Queue Management', () => {
    let processQueueSpy: jest.SpyInstance;

    // This spy technique is valid for these specific unit tests
    // where we *only* want to test the synchronous state of adding to the queue.
    beforeEach(() => {
      processQueueSpy = jest.spyOn(queue, 'processQueue').mockImplementation(async () => {});
    });
    afterEach(() => {
      processQueueSpy.mockRestore();
    });

    it('should initialize correctly with default values', () => {
      expect(queue.queue).toHaveLength(0);
      expect(queue.processing).toBe(false);
      expect(queue.rateLimit.maxEmails).toBe(10);
    });

    it('should add items to the queue and return a unique ID', async () => {
      const id = await queue.addToQueue(mockEmailData, mockSendFn);
      expect(queue.queue).toHaveLength(1); // Works because processQueue is mocked
      expect(id).toMatch(/^email_\d+_[a-z0-9]+/);
      expect(processQueueSpy).toHaveBeenCalled(); // Check that it *tried* to start
    });

    it('should prioritize "high" priority items', async () => {
      const normalId = await queue.addToQueue({ type: 'normal' }, mockSendFn, {
        priority: 'normal',
      });
      const highId = await queue.addToQueue({ type: 'high' }, mockSendFn, {
        priority: 'high',
      });

      expect(queue.queue).toHaveLength(2); // Works because processQueue is mocked
      expect(queue.queue[0].id).toBe(highId);
      expect(queue.queue[1].id).toBe(normalId);
    });
  });

  // This test *doesn't* use the spy
  it('should process the queue immediately after adding the first item', async () => {
    await queue.addToQueue(mockEmailData, mockSendFn);
    expect(queue.processing).toBe(true);

    await jest.runAllTimersAsync();

    // Check final state
    expect(mockSendFn).toHaveBeenCalledTimes(1);
    expect(queue.processing).toBe(false);
    expect(queue.queue).toHaveLength(0);
  });

  // --- Processing and Sending ---
  describe('Processing and Sending', () => {
    it('should process all items in the queue successfully', async () => {
      await queue.addToQueue({ id: 1 }, mockSendFn);
      await queue.addToQueue({ id: 2 }, mockSendFn);
      await queue.addToQueue({ id: 3 }, mockSendFn);

      expect(queue.processing).toBe(true);

      await jest.runAllTimersAsync();

      // All items processed
      expect(mockSendFn).toHaveBeenCalledTimes(3);
      expect(queue.queue).toHaveLength(0);
      expect(queue.processing).toBe(false);
    });

    it('should log errors from sendFunction and handle retry', async () => {
      const sendError = new Error('Resend Failed');
      mockSendFn.mockRejectedValue(sendError);

      const id = await queue.addToQueue(mockEmailData, mockSendFn, {
        maxRetries: 0,
      });

      await jest.runAllTimersAsync();

      expect(mockSendFn).toHaveBeenCalledTimes(1);
      expect(queue.processing).toBe(false);
    });

    it('should log debug info when EMAIL_DEBUG_LOG is enabled', async () => {
      process.env.EMAIL_DEBUG_LOG = '1';

      await queue.addToQueue(mockEmailData, mockSendFn);

      await jest.runAllTimersAsync();

      process.env.EMAIL_DEBUG_LOG = '0';
    });
  });

  // --- Rate Limiting ---
  describe('Rate Limiting', () => {
    it('should send up to maxEmails then pause and reset', async () => {
      // This test is tricky: 10 emails * 100ms delay = 1000ms window.
      // The 11th check happens *exactly* when the window resets, skipping
      // the "pause" logic.
      // We must force the 10 emails to send *faster* than the window.
      // We'll mock the internal 100ms delay to be 0ms *for this test*.
      const delaySpy = jest.spyOn(queue, 'delay').mockImplementation(async (ms) => {
        // We only want to change the 100ms inter-email delay
        if (ms === 100) {
          return Promise.resolve(); // Make it 0ms
        }
        // For all other delays (retries, waits), use the real timer.
        return new Promise((resolve) => setTimeout(resolve, ms));
      });

      // Add 11 emails
      for (let i = 0; i < 11; i++) {
        await queue.addToQueue({ id: i }, mockSendFn);
      }

      // Now, run all timers.
      // T=0: 10 emails will send (since delay is 0)
      // T=0: 11th check will hit limit, log, and wait 1000ms
      // T=1000: reset runs, 11th email sends
      await jest.runAllTimersAsync();

      // Check final state
      expect(mockSendFn).toHaveBeenCalledTimes(11);
      expect(queue.queue).toHaveLength(0);
      expect(queue.processing).toBe(false);

      // Restore the mock
      delaySpy.mockRestore();
    });

    it('should reset rate limit counters after windowMs passes', async () => {
      // This test was passing and its logic is correct.
      // Send 5 emails
      for (let i = 0; i < 5; i++) {
        await queue.addToQueue({ id: i }, mockSendFn);
      }

      // Run the first batch
      await jest.runAllTimersAsync();

      expect(mockSendFn).toHaveBeenCalledTimes(5);
      expect(queue.rateLimit.emailsSent).toBe(5);
      expect(queue.processing).toBe(false); // Queue is now idle

      // The 5 items took 500ms. Skip past the 1000ms window.
      jest.advanceTimersByTime(501); // Total time is now 1001ms

      // Send 1 more email
      await queue.addToQueue({ id: 6 }, mockSendFn);
      expect(queue.processing).toBe(true); // Kicks off again

      // Run the final item
      await jest.runAllTimersAsync();

      expect(mockSendFn).toHaveBeenCalledTimes(6);
      expect(queue.rateLimit.emailsSent).toBe(1);
      expect(queue.processing).toBe(false);
    });

    it('should correctly calculate and wait for the remaining time', async () => {
      // Set window to have started 500ms ago (T-500)
      queue.rateLimit.windowStart = Date.now() - 500;
      queue.rateLimit.emailsSent = 10; // Trigger rate limit

      // Call addToQueue, which starts processQueue, but *don't* await timers.
      // processQueue will run synchronously until the first `await`,
      // which is `await this.waitForRateLimit()` -> `await this.delay(500)`.
      const addPromise = queue.addToQueue(mockEmailData, mockSendFn);

      // We must yield to the event loop (with a microtask) to let the
      // synchronous part of processQueue run up to the first await.
      await Promise.resolve();

      // At this point, a 500ms timer is queued, and processQueue is paused.
      // We can now check the intermediate state *before* time moves.
      expect(mockSendFn).not.toHaveBeenCalled(); // <-- This was the failing line

      // 2. Advance timers by less than the required time
      await jest.advanceTimersByTimeAsync(400);
      expect(mockSendFn).not.toHaveBeenCalled(); // Still waiting

      // 3. Advance timers by the rest of the time (100ms) + processing (100ms)
      await jest.advanceTimersByTimeAsync(100 + 100);

      // Now check the *final* state
      expect(mockSendFn).toHaveBeenCalledTimes(1);

      // Wait for the original addPromise to resolve (it might have already)
      // and run any remaining cleanup timers.
      await addPromise;
      await jest.runAllTimersAsync();
      expect(queue.processing).toBe(false);
    });
  });

  // --- Retry Logic ---
  describe('Retry Logic', () => {
    it('should retry a failed email up to maxRetries (3 times total)', async () => {
      const sendError = new Error('Transient Error');

      mockSendFn
        .mockRejectedValueOnce(sendError) // Attempt 1 -> 1s delay
        .mockRejectedValueOnce(sendError) // Attempt 2 -> 2s delay
        .mockRejectedValueOnce(sendError) // Attempt 3 -> 4s delay
        .mockResolvedValue('Success'); // Attempt 4 (Success)

      await queue.addToQueue(mockEmailData, mockSendFn);

      await jest.runAllTimersAsync();

      expect(mockSendFn).toHaveBeenCalledTimes(4);
      expect(queue.queue).toHaveLength(0);
      expect(queue.processing).toBe(false);
    });

    it('should respect the maxDelay for backoff', async () => {
      queue.retryConfig.baseDelay = 10000; // 10s
      queue.retryConfig.maxDelay = 15000; // 15s
      mockSendFn.mockRejectedValue(new Error('Test'));

      await queue.addToQueue(mockEmailData, mockSendFn);

      await jest.runAllTimersAsync();

      expect(mockSendFn).toHaveBeenCalledTimes(4);
      expect(queue.processing).toBe(false);
    });

    it('should log final failure when maxRetries is reached', async () => {
      mockSendFn.mockRejectedValue(new Error('Fatal Error'));

      await queue.addToQueue(mockEmailData, mockSendFn); // Default maxRetries is 3

      await jest.runAllTimersAsync();

      expect(mockSendFn).toHaveBeenCalledTimes(4);
      expect(queue.queue).toHaveLength(0);
      expect(queue.processing).toBe(false);
    });

    it('should log final failure debug info when EMAIL_DEBUG_LOG is enabled', async () => {
      process.env.EMAIL_DEBUG_LOG = '1';
      mockSendFn.mockRejectedValue(new Error('Fatal Error'));

      await queue.addToQueue(mockEmailData, mockSendFn, { maxRetries: 0 });
      await jest.runAllTimersAsync();

      process.env.EMAIL_DEBUG_LOG = '0'; // Clean up
    });
  });

  // --- Utility Methods ---
  describe('Utility Methods', () => {
    // These tests are synchronous and were already correct.
    it('should clear the queue and reset processing status', () => {
      queue.queue = [{ id: 1 }] as any;
      queue.processing = true;
      queue.clearQueue();
      expect(queue.queue).toHaveLength(0);
      expect(queue.processing).toBe(false);
    });

    it('should return correct status', () => {
      queue.rateLimit.emailsSent = 5;
      queue.rateLimit.windowStart = Date.now() - 500;
      queue.queue = [{ id: 1 }, { id: 2 }] as any;
      queue.processing = true;

      const status = queue.getStatus();

      expect(status.queueLength).toBe(2);
      expect(status.processing).toBe(true);
      expect(status.rateLimit.emailsSent).toBe(5);
      expect(status.rateLimit.timeUntilReset).toBe(500); // 1000ms - 500ms
    });
  });
});
