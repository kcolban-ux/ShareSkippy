/**
 * Email queue management with rate limiting and retry logic
 */

export class EmailQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.rateLimit = {
      maxEmails: 100, // Max emails per hour
      windowMs: 60 * 60 * 1000, // 1 hour in milliseconds
      emailsSent: 0,
      windowStart: Date.now(),
    };
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
    };
  }

  /**
   * Add email to queue
   * @param {Object} emailData - Email data to send
   * @param {Function} sendFunction - Function to send the email
   * @param {Object} options - Queue options
   */
  async addToQueue(emailData, sendFunction, options = {}) {
    const queueItem = {
      id: this.generateId(),
      emailData,
      sendFunction,
      options: {
        priority: options.priority || 'normal',
        retries: 0,
        maxRetries: options.maxRetries || this.retryConfig.maxRetries,
        createdAt: Date.now(),
        ...options,
      },
    };

    // Add to queue based on priority
    if (queueItem.options.priority === 'high') {
      this.queue.unshift(queueItem);
    } else {
      this.queue.push(queueItem);
    }

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    return queueItem.id;
  }

  /**
   * Process the email queue
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      // Check rate limit
      if (!this.checkRateLimit()) {
        console.log('Rate limit reached, pausing queue processing');
        await this.waitForRateLimit();
        continue;
      }

      const queueItem = this.queue.shift();

      try {
        await this.sendEmail(queueItem);
        this.rateLimit.emailsSent++;
      } catch (error) {
        console.error(`Error sending email ${queueItem.id}:`, error);
        await this.handleRetry(queueItem);
      }

      // Small delay between emails to respect rate limits
      await this.delay(100);
    }

    this.processing = false;
  }

  /**
   * Send individual email
   * @param {Object} queueItem - Queue item to process
   */
  async sendEmail(queueItem) {
    const { emailData, sendFunction } = queueItem;

    const result = await sendFunction(emailData);

    // Track successful send
    if (process.env.EMAIL_DEBUG_LOG === '1') {
      console.log(
        JSON.stringify({
          email_key: emailData.emailType || 'unknown',
          user_id: emailData.userId || 'unknown',
          trigger: emailData.trigger || 'unknown',
          timestamp: new Date().toISOString(),
          decision: 'sent',
          reason: 'Email sent successfully',
          queue_id: queueItem.id,
        })
      );
    }

    return result;
  }

  /**
   * Handle retry logic for failed emails
   * @param {Object} queueItem - Queue item that failed
   */
  async handleRetry(queueItem) {
    queueItem.options.retries++;

    if (queueItem.options.retries <= queueItem.options.maxRetries) {
      // Calculate exponential backoff delay
      const delay = Math.min(
        this.retryConfig.baseDelay * Math.pow(2, queueItem.options.retries - 1),
        this.retryConfig.maxDelay
      );

      console.log(
        `Retrying email ${queueItem.id} in ${delay}ms (attempt ${queueItem.options.retries})`
      );

      // Re-add to queue with delay
      setTimeout(() => {
        this.queue.push(queueItem);
        if (!this.processing) {
          this.processQueue();
        }
      }, delay);
    } else {
      console.error(`Email ${queueItem.id} failed after ${queueItem.options.maxRetries} retries`);

      // Track failed email
      if (process.env.EMAIL_DEBUG_LOG === '1') {
        console.log(
          JSON.stringify({
            email_key: queueItem.emailData.emailType || 'unknown',
            user_id: queueItem.emailData.userId || 'unknown',
            trigger: queueItem.emailData.trigger || 'unknown',
            timestamp: new Date().toISOString(),
            decision: 'failed',
            reason: `Failed after ${queueItem.options.maxRetries} retries`,
            queue_id: queueItem.id,
          })
        );
      }
    }
  }

  /**
   * Check if rate limit allows sending more emails
   */
  checkRateLimit() {
    const now = Date.now();

    // Reset window if needed
    if (now - this.rateLimit.windowStart >= this.rateLimit.windowMs) {
      this.rateLimit.emailsSent = 0;
      this.rateLimit.windowStart = now;
    }

    return this.rateLimit.emailsSent < this.rateLimit.maxEmails;
  }

  /**
   * Wait for rate limit window to reset
   */
  async waitForRateLimit() {
    const now = Date.now();
    const timeUntilReset = this.rateLimit.windowMs - (now - this.rateLimit.windowStart);

    if (timeUntilReset > 0) {
      console.log(`Waiting ${timeUntilReset}ms for rate limit reset`);
      await this.delay(timeUntilReset);
    }
  }

  /**
   * Generate unique ID for queue items
   */
  generateId() {
    return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      rateLimit: {
        emailsSent: this.rateLimit.emailsSent,
        maxEmails: this.rateLimit.maxEmails,
        windowStart: this.rateLimit.windowStart,
        timeUntilReset: this.rateLimit.windowMs - (Date.now() - this.rateLimit.windowStart),
      },
    };
  }

  /**
   * Clear the queue
   */
  clearQueue() {
    this.queue = [];
    this.processing = false;
  }

  /**
   * Update rate limit configuration
   * @param {Object} config - New rate limit configuration
   */
  updateRateLimit(config) {
    this.rateLimit = {
      ...this.rateLimit,
      ...config,
    };
  }
}

// Export singleton instance
export const emailQueue = new EmailQueue();
