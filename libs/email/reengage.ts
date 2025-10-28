import { createServiceClient } from "@/libs/supabase/server";
import { sendEmail } from "./sendEmail";
import { scheduleEmail } from "./sendEmail";

export interface ReengageResult {
  processed: number;
  sent: number;
  skipped: number;
  errors: Array<{ userId: string; error: string }>;
}

/**
 * Process re-engagement emails for inactive users
 */
export async function processReengageEmails(): Promise<ReengageResult> {
  const supabase = createServiceClient();
  const errors: Array<{ userId: string; error: string }> = [];
  let sent = 0;
  let skipped = 0;

  try {
    // Check if the user_activity table exists
    const { error: tableCheckError } = await supabase
      .from("user_activity")
      .select("id")
      .limit(1);

    if (
      tableCheckError &&
      tableCheckError.message.includes("Could not find the table")
    ) {
      console.log(
        "User activity table does not exist yet. Skipping re-engagement processing.",
      );
      return { processed: 0, sent: 0, skipped: 0, errors: [] };
    }
    // Get users who haven't logged in for 7+ days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: inactiveUsers, error: usersError } = await supabase
      .from("profiles")
      .select(`
        id, email, first_name, last_name, created_at,
        user_activity!inner(at)
      `)
      .lt("user_activity.at", sevenDaysAgo.toISOString())
      .eq("user_activity.event", "login")
      .not("email", "is", null)
      .not("email", "eq", "");

    if (usersError) {
      throw new Error(`Failed to fetch inactive users: ${usersError.message}`);
    }

    if (!inactiveUsers || inactiveUsers.length === 0) {
      console.log("No inactive users found for re-engagement");
      return { processed: 0, sent: 0, skipped: 0, errors: [] };
    }

    console.log(`Found ${inactiveUsers.length} inactive users`);

    // Process each inactive user
    for (const user of inactiveUsers) {
      try {
        // Check if user should receive re-engagement email
        const shouldSend = await shouldSendReengageEmail(user.id);

        if (!shouldSend) {
          skipped++;
          console.log(
            `Skipping re-engagement email for user ${user.id} - already sent recently`,
          );
          continue;
        }

        // Send re-engagement email
        await sendEmail({
          userId: user.id,
          to: user.email,
          emailType: "reengage",
          payload: {
            userName: user.first_name || "",
            userEmail: user.email,
          },
        });

        sent++;
        console.log(`Sent re-engagement email to ${user.email}`);
      } catch (error) {
        console.error(
          `Error processing re-engagement for user ${user.id}:`,
          error,
        );
        errors.push({
          userId: user.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      processed: inactiveUsers.length,
      sent,
      skipped,
      errors,
    };
  } catch (error) {
    console.error("Error in processReengageEmails:", error);
    throw error;
  }
}

/**
 * Check if user should receive re-engagement email
 */
async function shouldSendReengageEmail(userId: string): Promise<boolean> {
  const supabase = createServiceClient();

  // Check if re-engagement email was sent in the last 21 days
  const twentyOneDaysAgo = new Date();
  twentyOneDaysAgo.setDate(twentyOneDaysAgo.getDate() - 21);

  const { data: recentReengage } = await supabase
    .from("email_events")
    .select("id")
    .eq("user_id", userId)
    .eq("email_type", "reengage")
    .eq("status", "sent")
    .gte("created_at", twentyOneDaysAgo.toISOString())
    .single();

  return !recentReengage;
}

/**
 * Get users who are candidates for re-engagement emails
 */
export async function getReengageCandidates(): Promise<
  Array<{
    id: string;
    email: string;
    first_name: string | null;
    last_login: string | null;
    days_since_login: number;
  }>
> {
  const supabase = createServiceClient();

  // Get users with their last login activity
  const { data: users, error } = await supabase
    .from("profiles")
    .select(`
      id, email, first_name, last_name,
      user_activity!inner(at)
    `)
    .eq("user_activity.event", "login")
    .not("email", "is", null)
    .not("email", "eq", "")
    .order("user_activity.at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch re-engage candidates: ${error.message}`);
  }

  if (!users) return [];

  // Group by user and get most recent login
  const userMap = new Map();
  for (const user of users) {
    if (!userMap.has(user.id)) {
      // user.user_activity is an array from the join, get the most recent
      const mostRecentActivity = Array.isArray(user.user_activity)
        ? user.user_activity[0]
        : user.user_activity;

      userMap.set(user.id, {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        last_login: mostRecentActivity?.at,
        days_since_login: mostRecentActivity?.at
          ? Math.floor(
            (Date.now() - new Date(mostRecentActivity.at).getTime()) /
              (1000 * 60 * 60 * 24),
          )
          : 999, // If no activity, consider them very inactive
      });
    }
  }

  // Filter for users inactive for 7+ days
  return Array.from(userMap.values()).filter((user) =>
    user.days_since_login >= 7
  );
}

/**
 * Schedule re-engagement emails for inactive users
 */
export async function scheduleReengageEmails(): Promise<{
  scheduled: number;
  errors: Array<{ userId: string; error: string }>;
}> {
  const errors: Array<{ userId: string; error: string }> = [];
  let scheduled = 0;

  try {
    const candidates = await getReengageCandidates();

    for (const user of candidates) {
      try {
        // Check if user should receive re-engagement email
        const shouldSend = await shouldSendReengageEmail(user.id);

        if (!shouldSend) {
          continue;
        }

        // Schedule re-engagement email for immediate sending
        await scheduleEmail({
          userId: user.id,
          emailType: "reengage",
          runAfter: new Date(),
          payload: {
            userName: user.first_name || "",
            userEmail: user.email,
          },
        });

        scheduled++;
        console.log(`Scheduled re-engagement email for user ${user.id}`);
      } catch (error) {
        console.error(
          `Error scheduling re-engagement for user ${user.id}:`,
          error,
        );
        errors.push({
          userId: user.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { scheduled, errors };
  } catch (error) {
    console.error("Error in scheduleReengageEmails:", error);
    throw error;
  }
}
