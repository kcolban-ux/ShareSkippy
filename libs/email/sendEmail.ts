import { createClient } from '@/lib/supabase/server';
import { sendEmail as resendSendEmail } from '@/libs/resend';
import { EmailPayload, loadEmailTemplate, ResendSendResult } from './templates';

export interface SendEmailParams {
  userId: string;
  to: string;
  emailType:
    | 'welcome'
    | 'nurture_day3'
    | 'meeting_reminder'
    | 'meeting_scheduled'
    | 'reengage'
    | 'new_message';
  subject?: string;
  html?: string;
  text?: string;
  payload?: EmailPayload;
}

export interface EmailEvent {
  id: number;
  user_id: string;
  email_type: string;
  status: 'queued' | 'sent' | 'failed' | 'skipped';
  external_message_id?: string;
  error?: string;
  to_email: string;
  subject?: string;
  payload: EmailPayload;
  created_at: string;
}

/**
 * Send an email with idempotency and event tracking.
 *
 * Creates an `email_events` row, attempts delivery via Resend, updates the
 * event status, and returns the event record. For single-shot types (e.g.
 * `welcome`) the function checks for an existing event to avoid duplicates.
 *
 * @param params - Parameters for sending the email
 * @returns The persisted `EmailEvent`
 */
export async function sendEmail({
  userId,
  to,
  emailType,
  subject,
  html,
  text,
  payload = {},
}: SendEmailParams): Promise<EmailEvent> {
  const supabase = await createClient();

  try {
    if (['welcome', 'nurture_day3'].includes(emailType)) {
      const { data: existingEvent } = await supabase
        .from('email_events')
        .select('id, status')
        .eq('user_id', userId)
        .eq('email_type', emailType)
        .single();

      if (existingEvent) {
        const safeEmailType = String(emailType).replace(/[\r\n]/g, '');
        const safeUserId = String(userId).replace(/[\r\n]/g, '');
        console.log(`Email ${safeEmailType} already sent to user ${safeUserId}, skipping`);

        // Return the existing event
        const { data: event } = await supabase
          .from('email_events')
          .select('*')
          .eq('id', existingEvent.id)
          .single();

        return event as EmailEvent;
      }
    }

    let finalSubject = subject;
    let finalHtml = html;
    let finalText = text;

    if (!html && !text) {
      const template = await loadEmailTemplate(emailType, payload);
      finalSubject = template.subject;
      finalHtml = template.html;
      finalText = template.text;
    }

    if (!finalSubject) {
      throw new Error(`Subject is required for email type: ${emailType}`);
    }
    if (!finalHtml && !finalText) {
      throw new Error(`HTML or text content is required for email type: ${emailType}`);
    }

    if (!finalHtml) {
      finalHtml = finalText || '';
    }
    if (!finalText) {
      finalText = finalHtml || '';
    }
    const { data: emailEvent, error: eventError } = await supabase
      .from('email_events')
      .insert({
        user_id: userId,
        email_type: emailType,
        status: 'queued',
        to_email: to,
        subject: finalSubject,
        payload: payload,
      })
      .select()
      .single();

    if (eventError) throw new Error(`Failed to create email event: ${eventError.message}`);

    try {
      const resendResult = await resendSendEmail({
        to,
        subject: finalSubject,
        html: finalHtml,
        text: finalText,
      });

      const resendData = resendResult as ResendSendResult;
      const externalMessageId = resendData.id;

      const { error: updateError } = await supabase
        .from('email_events')
        .update({
          status: 'sent',
          external_message_id: externalMessageId,
        })
        .eq('id', emailEvent.id);

      if (updateError) console.error('Failed to update email event:', updateError);

      return {
        ...emailEvent,
        status: 'sent',
        external_message_id: externalMessageId,
      } as EmailEvent;
    } catch (sendError) {
      // Update event with failure
      const { error: updateError } = await supabase
        .from('email_events')
        .update({
          status: 'failed',
          error: sendError instanceof Error ? sendError.message : 'Unknown error',
        })
        .eq('id', emailEvent.id);

      if (updateError) console.error('Failed to update email event with error:', updateError);

      console.error('Email send failed', {
        eventId: emailEvent?.id ?? null,
        emailType,
        error: sendError instanceof Error ? sendError.message : 'Unknown error',
      });

      throw sendError;
    }
  } catch (error) {
    console.error('Error in sendEmail:', error);
    throw error;
  }
}

/**
 * Schedule an email to be sent at a specific time.
 *
 * @param params.userId - Recipient user id
 * @param params.emailType - One of the supported email types
 * @param params.runAfter - When to run the job
 * @param params.payload - Optional template payload
 */
export async function scheduleEmail({
  userId,
  emailType,
  runAfter,
  payload = {},
}: {
  userId: string;
  emailType:
    | 'welcome'
    | 'nurture_day3'
    | 'meeting_reminder'
    | 'meeting_scheduled'
    | 'reengage'
    | 'new_message';
  runAfter: Date;
  payload?: EmailPayload;
}): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('scheduled_emails').insert({
    user_id: userId,
    email_type: emailType,
    run_after: runAfter.toISOString(),
    payload,
  });

  if (error) throw new Error(`Failed to schedule email: ${error.message}`);

  console.info(`Scheduled ${emailType} for user ${userId} at ${runAfter.toISOString()}`);
}

/**
 * Record a user activity event used by engagement logic.
 *
 * Non-critical: failures are logged but do not throw.
 */
export async function recordUserActivity({
  userId,
  event,
  metadata = {},
}: {
  userId: string;
  event: string;
  metadata?: EmailPayload;
}): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('user_activity').insert({
    user_id: userId,
    event,
    metadata,
  });

  if (error) console.error('Failed to record user activity:', error);
}

/**
 * Return the user's most recent timestamp for a named activity event, or null.
 *
 * @param userId - User identifier
 * @param event - Activity name
 * @returns Date of last activity or null
 */
export async function getUserLastActivity(userId: string, event: string): Promise<Date | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('user_activity')
    .select('at')
    .eq('user_id', userId)
    .eq('event', event)
    .order('at', { ascending: false })
    .limit(1)
    .single();

  return data?.at ? new Date(data.at) : null;
}

/**
 * Determine whether a re-engagement email should be sent to the user.
 *
 * Rules:
 * - User must have been inactive >= 7 days
 * - No reengage email sent in the previous 21 days
 *
 * @param userId - User identifier
 * @returns True when a reengage email should be sent
 */
export async function shouldSendReengageEmail(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const lastLogin = await getUserLastActivity(userId, 'login');
  if (!lastLogin) return false;

  const daysSinceLogin = Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceLogin < 7) return false;

  const { data: recentReengage } = await supabase
    .from('email_events')
    .select('created_at')
    .eq('user_id', userId)
    .eq('email_type', 'reengage')
    .eq('status', 'sent')
    .gte('created_at', new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString())
    .single();

  return !recentReengage;
}
