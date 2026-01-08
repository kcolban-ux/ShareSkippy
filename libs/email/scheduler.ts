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
 * Process scheduled emails that are due to be sent
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
      console.log('Scheduled emails table does not exist yet. Skipping processing.');
      return { processed: 0, errors: [] };
    }
    // Get due scheduled emails that haven't been picked up yet
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
      console.log('No scheduled emails to process');
      return { processed: 0, errors: [] };
    }

    console.log(`Processing ${scheduledEmails.length} scheduled emails`);

    // Process each scheduled email
    for (const scheduledEmail of scheduledEmails) {
      try {
        // Mark as picked up to prevent duplicate processing
        const { error: pickupError } = await supabase
          .from('scheduled_emails')
          .update({ picked_at: new Date().toISOString() })
          .eq('id', scheduledEmail.id);

        if (pickupError) {
          console.error(`Failed to mark email ${scheduledEmail.id} as picked up:`, pickupError);
          errors.push({ id: scheduledEmail.id, error: pickupError.message });
          continue;
        }

        // Get user email
        const { data: user, error: userError } = await supabase
          .from('profiles')
          .select('email, first_name')
          .eq('id', scheduledEmail.user_id)
          .single();

        if (userError || !user) {
          console.error(`User not found for scheduled email ${scheduledEmail.id}:`, userError);
          errors.push({ id: scheduledEmail.id, error: 'User not found' });
          continue;
        }

        // Send the email
        await sendEmail({
          userId: scheduledEmail.user_id,
          to: user.email,
          emailType: scheduledEmail.email_type,
          payload: scheduledEmail.payload,
        });

        processed++;
        console.log(
          `Successfully processed scheduled email ${scheduledEmail.id} (${scheduledEmail.email_type})`
        );
      } catch (error) {
        console.error(`Error processing scheduled email ${scheduledEmail.id}:`, error);
        errors.push({
          id: scheduledEmail.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { processed, errors };
  } catch (error) {
    console.error('Error in processScheduledEmails:', error);
    throw error;
  }
}

/**
 * Schedule a meeting reminder email
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
  reminderTime.setDate(reminderTime.getDate() - 1); // 1 day before

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

  if (error) {
    throw new Error(`Failed to schedule meeting reminder: ${error.message}`);
  }

  console.log(`Meeting reminder scheduled for user ${userId} at ${reminderTime.toISOString()}`);
}

/**
 * Schedule nurture email for 3 days after signup
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

  if (error) {
    throw new Error(`Failed to schedule nurture email: ${error.message}`);
  }

  const safeUserId = sanitizeForLog(userId);

  console.log(`Nurture email scheduled for user ${safeUserId} at ${nurtureTime.toISOString()}`);
}

/**
 * Schedule community growth email for 135 days after signup
 */
export async function scheduleCommunityGrowthEmail(userId: string): Promise<void> {
  const growthEmailTime = new Date();
  growthEmailTime.setDate(growthEmailTime.getDate() + 135);

  const supabase = await createClient();
  const { error } = await supabase.from('scheduled_emails').insert({
    user_id: userId,
    email_type: 'community_growth_day135',
    run_after: growthEmailTime.toISOString(),
    payload: {},
  });

  if (error) {
    throw new Error(`Failed to schedule community growth email: ${error.message}`);
  }

  const safeUserId = sanitizeForLog(userId);

  console.log(
    `Community growth email scheduled for user ${safeUserId} at ${growthEmailTime.toISOString()}`
  );
}

/**
 * Get scheduled emails for a user
 */
export async function getUserScheduledEmails(userId: string): Promise<ScheduledEmail[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('scheduled_emails')
    .select('*')
    .eq('user_id', userId)
    .order('run_after', { ascending: true });

  if (error) {
    throw new Error(`Failed to get scheduled emails: ${error.message}`);
  }

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

  if (error) {
    throw new Error(`Failed to cancel scheduled emails: ${error.message}`);
  }

  const safeUserId = sanitizeForLog(userId);
  const safeEmailType = emailType !== undefined ? sanitizeForLog(emailType) : '';

  console.log(
    `Cancelled scheduled emails for user ${safeUserId}${emailType ? ` (${safeEmailType})` : ''}`
  );
}
