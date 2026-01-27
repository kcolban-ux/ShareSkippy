import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Number.parseInt(searchParams.get('limit') || '50');
    const emailType = searchParams.get('emailType');
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from('email_events')
      .select(
        `
        id, user_id, email_type, status, external_message_id, error,
        to_email, subject, payload, created_at,
        profiles!inner(first_name, last_name, email)
      `
      )
      .order('created_at', { ascending: false });

    // Apply filters
    if (emailType) {
      query = query.eq('email_type', emailType);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: events, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch email events: ${error.message}`);
    }

    // Get total count for pagination
    let countQuery = supabase.from('email_events').select('id', { count: 'exact', head: true });

    if (emailType) {
      countQuery = countQuery.eq('email_type', emailType);
    }
    if (status) {
      countQuery = countQuery.eq('status', status);
    }
    if (userId) {
      countQuery = countQuery.eq('user_id', userId);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error getting count:', countError);
    }

    return Response.json({
      success: true,
      data: events || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching email events:', error);
    return Response.json({ error: 'Failed to fetch email events' }, { status: 500 });
  }
}
