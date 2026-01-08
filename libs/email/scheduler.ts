import { createClient } from '@/libs/supabase/server';
import { sendEmail } from './sendEmail';
import { EmailPayload } from './templates';

function sanitizeForLog(value: unknown): string {
  const str = String(value);
  return str.replace(/[\r\n]/g, '');
}

export interface ScheduledEmail {
  id: number;
  user_id: string;
  email_type: string;
  run_after: string;
  payload: EmailPayload;
  picked_at: string | null;
  created_at: string;
}

/**
 * Process scheduled emails that are due to be sent.
 *
 * Picks up due records from `scheduled_emails`, marks them as picked,
 * resolves recipient data, attempts delivery via `sendEmail`, and updates
 * per-event status. Returns a summary of processed count and any errors.
 *
 * @returns An object containing `processed` count and an `errors` array
 * @throws Propagates unexpected errors encountered during processing
 */
export async function processScheduledEmails(): Promise<{
  processed: number;
  errors: Array<{ id: number; error: string }>;
}> {
  const supabase = await createClient();
  const errors: Array<{ id: number; error: string }> = [];
  let processed = 0;

  try {
    // Check if the scheduled_emails table exists
    const { error: tableCheckError } = await supabase
      .from('scheduled_emails')
      .select('id')
      .limit(1);

    if (tableCheckError?.message.includes('Could not find the table')) {
      console.info('Scheduled emails table not found; skipping processing');
      return { processed: 0, errors: [] };
    }
    const { data: scheduledEmails, error: fetchError } = await supabase
      .from('scheduled_emails')
      .select('*')
      .lte('run_after', new Date().toISOString())
      .is('picked_at', null)
      .order('run_after', { ascending: true })
      .limit(100); // Process in batches

    if (fetchError) {
      throw new Error(`Failed to fetch scheduled emails: ${fetchError.message}`);
    }

    if (!scheduledEmails || scheduledEmails.length === 0) {
      console.debug('No scheduled emails to process');
      return { processed: 0, errors: [] };
    }

    console.info('Processing scheduled emails', { count: scheduledEmails.length });

    for (const scheduledEmail of scheduledEmails) {
      try {
        // Mark as picked to prevent duplicate processing
        const { error: pickupError } = await supabase
          .from('scheduled_emails')
          .update({ picked_at: new Date().toISOString() })
          .eq('id', scheduledEmail.id);

        if (pickupError) {
          console.error('Failed to mark scheduled email as picked', {
            eventId: scheduledEmail.id,
            error: pickupError instanceof Error ? pickupError.message : String(pickupError),
          });
          errors.push({ id: scheduledEmail.id, error: pickupError?.message ?? 'Pickup failed' });
          continue;
        }

        // Resolve recipient
        const { data: user, error: userError } = await supabase
          .from('profiles')
          .select('email, first_name')
          .eq('id', scheduledEmail.user_id)
          .single();

        if (userError || !user) {
          console.error('User not found for scheduled email', {
            eventId: scheduledEmail.id,
            error: userError instanceof Error ? userError.message : String(userError),
          });
          errors.push({ id: scheduledEmail.id, error: 'User not found' });
          continue;
        }

        // Deliver
        await sendEmail({
          userId: scheduledEmail.user_id,
          to: user.email,
          emailType: scheduledEmail.email_type,
          payload: scheduledEmail.payload,
        });

        processed++;
        console.info('Processed scheduled email', {
          eventId: scheduledEmail.id,
          emailType: scheduledEmail.email_type,
        });
      } catch (error) {
        console.error('Error processing scheduled email', {
          eventId: scheduledEmail.id,
          error: error instanceof Error ? error.message : String(error),
        });
        errors.push({
          id: scheduledEmail.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { processed, errors };
  } catch (error) {
    console.error(
      'Error in processScheduledEmails',
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

/**
 * Schedule a meeting reminder email to be sent one day before `startsAt`.
 *
 * @param params.userId - Recipient user id
 * @param params.meetingId - Meeting identifier
 * @param params.meetingTitle - Meeting title for the email payload
 * @param params.startsAt - Meeting start timestamp
 * @param params.payload - Optional extra payload merged into the email payload
 * @throws When the DB insert fails
 */
export async function scheduleMeetingReminder({
  userId,
  meetingId,
  meetingTitle,
  startsAt,
  payload = {},
}: {
  userId: string;
  meetingId: string;
  meetingTitle: string;
  startsAt: Date;
  payload?: EmailPayload;
}): Promise<void> {
  const reminderTime = new Date(startsAt);
  reminderTime.setDate(reminderTime.getDate() - 1);

  const supabase = await createClient();
  const { error } = await supabase.from('scheduled_emails').insert({
    user_id: userId,
    email_type: 'meeting_reminder',
    run_after: reminderTime.toISOString(),
    payload: {
      meetingId,
      meetingTitle,
      startsAt: startsAt.toISOString(),
      ...payload,
    },
  });

  if (error) throw new Error(`Failed to schedule meeting reminder: ${error.message}`);

  const safeUserId = String(userId).replace(/[\r\n]/g, '');
  console.log(`Meeting reminder scheduled for user ${safeUserId} at ${reminderTime.toISOString()}`);
}

/**
 * Schedule a nurture email to be sent 3 days after scheduling.
 *
 * @param userId - Recipient user id
 * @throws When the DB insert fails
 */
export async function scheduleNurtureEmail(userId: string): Promise<void> {
  const nurtureTime = new Date();
  nurtureTime.setDate(nurtureTime.getDate() + 3);

  const supabase = await createClient();
  const { error } = await supabase.from('scheduled_emails').insert({
    user_id: userId,
    email_type: 'nurture_day3',
    run_after: nurtureTime.toISOString(),
    payload: {},
  });

  if (error) throw new Error(`Failed to schedule nurture email: ${error.message}`);

  const safeUserId = sanitizeForLog(userId);
  console.info('Scheduled nurture email', {
    userId: safeUserId,
    runAfter: nurtureTime.toISOString(),
  });
}

/**
 * Retrieve scheduled emails for a user ordered by run time.
 *
 * @param userId - User identifier
 * @returns Array of scheduled email records (may be empty)
 * @throws When the DB query fails
 */
export async function getUserScheduledEmails(userId: string): Promise<ScheduledEmail[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('scheduled_emails')
    .select('*')
    .eq('user_id', userId)
    .order('run_after', { ascending: true });

  if (error) throw new Error(`Failed to get scheduled emails: ${error.message}`);

  return data || [];
}

/**
 * Cancel scheduled emails for a user
 */
export async function cancelUserScheduledEmails(userId: string, emailType?: string): Promise<void> {
  const supabase = await createClient();

  let query = supabase.from('scheduled_emails').delete().eq('user_id', userId);

  if (emailType) {
    query = query.eq('email_type', emailType);
  }

  const { error } = await query;

  if (error) throw new Error(`Failed to cancel scheduled emails: ${error.message}`);

  const safeUserId = sanitizeForLog(userId);
  const safeEmailType = emailType !== undefined ? sanitizeForLog(emailType) : '';

  console.log(
    `Cancelled scheduled emails for user ${safeUserId}${emailType ? ` (${safeEmailType})` : ''}`
  );
}
