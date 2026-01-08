import {
  sendEmail,
  scheduleNurtureEmail,
  scheduleCommunityGrowthEmail,
  recordUserActivity,
} from '@/libs/email';
import { createClient } from '@/lib/supabase/server';

export async function POST(request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return Response.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Record user login activity
    await recordUserActivity({
      userId,
      event: 'login',
      metadata: { source: 'welcome_email_trigger' },
    });

    // Send welcome email (idempotent)
    await sendEmail({
      userId,
      to: user.email,
      emailType: 'welcome',
      payload: {
        userName: user.first_name || '',
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://shareskippy.com',
      },
    });

    // Schedule nurture email for 3 days later
    await scheduleNurtureEmail(userId);

    // Schedule community growth email for 135 days later
    await scheduleCommunityGrowthEmail(userId);

    return Response.json({
      success: true,
      message: 'Welcome email sent and follow-up emails scheduled',
    });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return Response.json({ error: 'Failed to send welcome email' }, { status: 500 });
  }
}
