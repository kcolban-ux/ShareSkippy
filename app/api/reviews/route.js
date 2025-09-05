import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/reviews - Get reviews for a specific user or all reviews
export async function GET(request) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;

    let query = supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(first_name, last_name, email, profile_photo_url),
        reviewee:profiles!reviews_reviewee_id_fkey(first_name, last_name, email, profile_photo_url),
        meeting:meetings(title, start_datetime, end_datetime)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // If userId is provided, filter by reviewee_id
    if (userId) {
      query = query.eq('reviewee_id', userId);
    }

    const { data: reviews, error } = await query;

    if (error) throw error;

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

// POST /api/reviews - Create a new review
export async function POST(request) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meetingId, rating, comment } = await request.json();

    // Validate input
    if (!meetingId || !rating || !comment) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    const wordCount = comment.trim().split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount < 5) {
      return NextResponse.json({ error: 'Comment must be at least 5 words' }, { status: 400 });
    }

    // Get meeting details to validate
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();

    if (meetingError) throw meetingError;

    // Validate that user is part of the meeting
    if (meeting.requester_id !== user.id && meeting.recipient_id !== user.id) {
      return NextResponse.json({ error: 'You can only review meetings you participated in' }, { status: 403 });
    }

    // Validate that meeting is completed
    if (meeting.status !== 'completed') {
      return NextResponse.json({ error: 'You can only review completed meetings' }, { status: 400 });
    }

    // Validate that meeting has ended
    const meetingEndTime = new Date(meeting.end_datetime);
    const now = new Date();
    
    if (now < meetingEndTime) {
      return NextResponse.json({ error: 'You can only review meetings that have ended' }, { status: 400 });
    }

    // Determine reviewee (the other participant) and roles
    const isRequester = meeting.requester_id === user.id;
    const revieweeId = isRequester ? meeting.recipient_id : meeting.requester_id;
    const reviewerRole = isRequester ? 'requester' : 'recipient';
    const reviewedRole = isRequester ? 'recipient' : 'requester';

    // Debug logging
    console.log('Review submission debug:', {
      meetingId,
      userId: user.id,
      meetingRequesterId: meeting.requester_id,
      meetingRecipientId: meeting.recipient_id,
      isRequester,
      revieweeId,
      reviewerRole,
      reviewedRole
    });

    // Validate roles
    if (!['requester', 'recipient'].includes(reviewerRole)) {
      return NextResponse.json({ error: `Invalid reviewer role: ${reviewerRole}` }, { status: 400 });
    }
    if (!['requester', 'recipient'].includes(reviewedRole)) {
      return NextResponse.json({ error: `Invalid reviewed role: ${reviewedRole}` }, { status: 400 });
    }

    // Check if user has already reviewed this meeting
    const { data: existingReviews, error: existingError } = await supabase
      .from('reviews')
      .select('id')
      .eq('meeting_id', meetingId)
      .eq('reviewer_id', user.id);

    if (existingError) throw existingError;

    if (existingReviews && existingReviews.length > 0) {
      return NextResponse.json({ error: 'You have already reviewed this meeting' }, { status: 400 });
    }

    // Create the review
    const reviewData = {
      meeting_id: meetingId,
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      reviewer_role: reviewerRole,
      reviewed_role: reviewedRole,
      rating,
      comment: comment.trim()
    };

    console.log('Inserting review data:', reviewData);

    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert(reviewData)
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(first_name, last_name, email, profile_photo_url),
        reviewee:profiles!reviews_reviewee_id_fkey(first_name, last_name, email, profile_photo_url),
        meeting:meetings(title, start_datetime, end_datetime)
      `)
      .single();

    if (reviewError) {
      console.error('Review insert error:', reviewError);
      throw reviewError;
    }

    return NextResponse.json({ review });
  } catch (error) {
    console.error('Error creating review:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    return NextResponse.json({ 
      error: 'Failed to create review', 
      details: error.message,
      code: error.code 
    }, { status: 500 });
  }
}
