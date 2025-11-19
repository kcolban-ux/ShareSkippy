import { Resend } from 'resend';
import config from '@/config';

let resendClient;

const getResendClient = () => {
  if (resendClient) {
    return resendClient;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }

  resendClient = new Resend(apiKey);
  return resendClient;
};

/**
 * Validates email content to improve deliverability
 */
const validateEmailContent = (subject, text, html) => {
  const spamTriggers = [
    /free/gi,
    /urgent/gi,
    /act now/gi,
    /limited time/gi,
    /click here/gi,
    /guarantee/gi,
    /no obligation/gi,
    /winner/gi,
    /congratulations/gi,
    /earn money/gi,
  ];

  let warnings = [];

  // Check subject line
  if (subject.length > 50) {
    warnings.push('Subject line is too long (>50 chars)');
  }

  if (spamTriggers.some((trigger) => trigger.test(subject))) {
    warnings.push('Subject contains potential spam trigger words');
  }

  // Check for excessive caps
  if (subject.toUpperCase() === subject && subject.length > 5) {
    warnings.push('Subject is all caps');
  }

  // Check content
  if (html && spamTriggers.some((trigger) => trigger.test(html))) {
    warnings.push('Email content contains potential spam trigger words');
  }

  if (warnings.length > 0) {
    console.warn('Email deliverability warnings:', warnings);
  }

  return warnings;
};

// Rate limiting for Resend API (2 requests per second limit)
let lastEmailTime = 0;
const MIN_EMAIL_INTERVAL = 500; // 500ms = 2 requests per second

/**
 * Waits to respect Resend's rate limit of 2 requests per second
 */
const waitForRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastEmail = now - lastEmailTime;

  if (timeSinceLastEmail < MIN_EMAIL_INTERVAL) {
    const waitTime = MIN_EMAIL_INTERVAL - timeSinceLastEmail;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastEmailTime = Date.now();
};

/**
 * Sends an email using the provided parameters with deliverability best practices.
 *
 * @async
 * @param {Object} params - The parameters for sending the email.
 * @param {string | string[]} params.to - The recipient's email address or an array of email addresses.
 * @param {string} params.subject - The subject of the email.
 * @param {string} params.text - The plain text content of the email.
 * @param {string} params.html - The HTML content of the email.
 * @param {string} [params.replyTo] - The email address to set as the "Reply-To" address.
 * @returns {Promise<Object>} A Promise that resolves with the email sending result data.
 */
export const sendEmail = async ({ to, subject, text, html, replyTo }) => {
  // Wait to respect rate limit
  await waitForRateLimit();
  // Validate content for deliverability
  validateEmailContent(subject, text, html);

  // Ensure we have both text and HTML versions for better deliverability
  if (!text && html) {
    // Strip HTML tags for text version if not provided
    text = html
      .replaceAll(/<[^>]*>/g, '')
      .replaceAll(/\s+/g, ' ')
      .trim();
  }

  const emailData = {
    from: config.resend.fromAdmin,
    to,
    subject,
    text,
    html,
    ...(replyTo && { replyTo }),
    // Add headers to improve deliverability
    headers: {
      'X-Entity-Ref-ID': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      'List-Unsubscribe': `<mailto:${config.resend.supportEmail}?subject=Unsubscribe>`,
    },
  };

  const { data, error } = await getResendClient().emails.send(emailData);

  if (error) {
    console.error('Error sending email:', error.message);
    throw error;
  }

  return data;
};
