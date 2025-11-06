import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import { validateRequestBody, meetingValidationSchema } from '@/libs/validation';
import { apiRateLimit } from '@/libs/rateLimit';

export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch meetings where the user is either requester or recipient
    const { data: meetings, error } = await supabase
      .from('meetings')
      .select(
        `
        *,
        requester:profiles!meetings_requester_id_fkey (
          id,
          first_name,
          last_name,
          profile_photo_url
        ),
        recipient:profiles!meetings_recipient_id_fkey (
          id,
          first_name,
          last_name,
          profile_photo_url
        ),
        availability:availability!meetings_availability_id_fkey (
          id,
          title,
          post_type
        )
      `
      )
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('start_datetime', { ascending: true });

    if (error) throw error;

    // Check which meetings the user has already reviewed
    const meetingIds = meetings.map((m) => m.id);
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('meeting_id')
      .eq('reviewer_id', user.id)
      .in('meeting_id', meetingIds);

    if (reviewsError) throw reviewsError;

    const reviewedMeetingIds = new Set(reviews.map((r) => r.meeting_id));

    // Add review status to each meeting
    const meetingsWithReviewStatus = meetings.map((meeting) => ({
      ...meeting,
      has_reviewed: reviewedMeetingIds.has(meeting.id),
    }));

    return NextResponse.json({ meetings: meetingsWithReviewStatus });
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = apiRateLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error.message },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.error.retryAfter.toString(),
          },
        }
      );
    }

    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestBody = await request.json();

    // Validate request body
    try {
      validateRequestBody(requestBody, meetingValidationSchema);
    } catch (validationError) {
      return NextResponse.json({ error: validationError.message }, { status: 400 });
    }

    const {
      recipient_id,
      availability_id,
      conversation_id,
      title,
      description,
      meeting_place,
      start_datetime,
      end_datetime,
    } = requestBody;

    // Additional validation for date relationship
    const startDate = new Date(start_datetime);
    const endDate = new Date(end_datetime);

    if (startDate >= endDate) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }

    // Create meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        requester_id: user.id,
        recipient_id,
        availability_id,
        conversation_id,
        title,
        description,
        meeting_place,
        start_datetime: startDate.toISOString(),
        end_datetime: endDate.toISOString(),
        status: 'pending',
      })
      .select(
        `
        *,
        requester:profiles!meetings_requester_id_fkey (
          id,
          first_name,
          last_name,
          profile_photo_url
        ),
        recipient:profiles!meetings_recipient_id_fkey (
          id,
          first_name,
          last_name,
          profile_photo_url
        )
      `
      )
      .single();

    if (meetingError) throw meetingError;

    // Send meeting confirmation emails and schedule reminders for both participants
    try {
      // Send to requester
      await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/emails/meeting-scheduled`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meetingId: meeting.id,
            userId: user.id,
          }),
        }
      );

      // Send to recipient
      await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/emails/meeting-scheduled`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meetingId: meeting.id,
            userId: recipient_id,
          }),
        }
      );

      // Schedule meeting reminders for both participants (1 day before)
      await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/emails/schedule-meeting-reminder`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            meetingId: meeting.id,
            meetingTitle: title,
            startsAt: startDate.toISOString(),
          }),
        }
      );

      await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/emails/schedule-meeting-reminder`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: recipient_id,
            meetingId: meeting.id,
            meetingTitle: title,
            startsAt: startDate.toISOString(),
          }),
        }
      );
    } catch (emailError) {
      console.error(
        'Error sending meeting confirmation emails or scheduling reminders:',
        emailError
      );
      // Don't fail the meeting creation if email fails
    }

    return NextResponse.json({ meeting });
  } catch (error) {
    console.error('Error creating meeting:', error);
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { meetingId, status } = await request.json();

    if (!meetingId || !status) {
      return NextResponse.json(
        {
          error: 'Meeting ID and status are required',
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update meeting status
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .update({ status })
      .eq('id', meetingId)
      .select(
        `
        *,
        requester:profiles!meetings_requester_id_fkey(first_name, last_name, email),
        recipient:profiles!meetings_recipient_id_fkey(first_name, last_name, email)
      `
      )
      .single();

    if (meetingError) {
      return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 });
    }

    // If meeting is confirmed, send confirmation emails
    if (status === 'confirmed') {
      try {
        // Send to requester
        await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/emails/meeting-scheduled`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              meetingId: meeting.id,
              userId: meeting.requester_id,
            }),
          }
        );

        // Send to recipient
        await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/emails/meeting-scheduled`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              meetingId: meeting.id,
              userId: meeting.recipient_id,
            }),
          }
        );
      } catch (emailError) {
        console.error('Error sending meeting confirmation emails:', emailError);
        // Don't fail the status update if email fails
      }
    }

    // If meeting is completed, send review request emails
    if (status === 'completed') {
      try {
        // Send to requester
        await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/emails/review-request`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              meetingId: meeting.id,
              userId: meeting.requester_id,
            }),
          }
        );

        // Send to recipient
        await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/emails/review-request`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              meetingId: meeting.id,
              userId: meeting.recipient_id,
            }),
          }
        );
      } catch (emailError) {
        console.error('Error sending review request emails:', emailError);
        // Don't fail the status update if email fails
      }
    }

    return NextResponse.json({ meeting });
  } catch (error) {
    console.error('Error updating meeting:', error);
    return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 });
  }
}
