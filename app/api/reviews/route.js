import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/reviews - Get reviews for a specific user or all reviews
export async function GET(request) {
  try {
    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;

    let query = supabase
      .from('reviews')
      .select(
        `
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(first_name, last_name, email, profile_photo_url),
        reviewee:profiles!reviews_reviewee_id_fkey(first_name, last_name, email, profile_photo_url),
        meeting:meetings(title, start_datetime, end_datetime)
      `
      )
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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
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

    const wordCount = comment
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
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
      return NextResponse.json(
        { error: 'You can only review meetings you participated in' },
        { status: 403 }
      );
    }

    // Validate that meeting is completed
    if (meeting.status !== 'completed') {
      return NextResponse.json(
        { error: 'You can only review completed meetings' },
        { status: 400 }
      );
    }

    // Validate that meeting has ended
    const meetingEndTime = new Date(meeting.end_datetime);
    const now = new Date();

    if (now < meetingEndTime) {
      return NextResponse.json(
        { error: 'You can only review meetings that have ended' },
        { status: 400 }
      );
    }

    // Get the availability post to determine post type and roles
    const { data: availability, error: availabilityError } = await supabase
      .from('availability')
      .select('post_type, owner_id')
      .eq('id', meeting.availability_id)
      .single();

    if (availabilityError) throw availabilityError;

    // Determine reviewee (the other participant) and roles based on post type
    const isRequester = meeting.requester_id === user.id;
    const revieweeId = isRequester ? meeting.recipient_id : meeting.requester_id;

    // Determine roles based on post type and who posted it
    let reviewerRole, reviewedRole;

    if (availability.post_type === 'dog_available') {
      // For dog_available posts: poster is owner, other person is walker
      if (isRequester) {
        // User is requester, check if they are the poster (owner)
        if (meeting.requester_id === availability.owner_id) {
          reviewerRole = 'owner';
          reviewedRole = 'walker';
        } else {
          reviewerRole = 'walker';
          reviewedRole = 'owner';
        }
      } else {
        // User is recipient, check if they are the poster (owner)
        if (meeting.recipient_id === availability.owner_id) {
          reviewerRole = 'owner';
          reviewedRole = 'walker';
        } else {
          reviewerRole = 'walker';
          reviewedRole = 'owner';
        }
      }
    } else if (availability.post_type === 'petpal_available') {
      // For petpal_available posts: poster is walker, other person is owner
      if (isRequester) {
        // User is requester, check if they are the poster (walker)
        if (meeting.requester_id === availability.owner_id) {
          reviewerRole = 'walker';
          reviewedRole = 'owner';
        } else {
          reviewerRole = 'owner';
          reviewedRole = 'walker';
        }
      } else {
        // User is recipient, check if they are the poster (walker)
        if (meeting.recipient_id === availability.owner_id) {
          reviewerRole = 'walker';
          reviewedRole = 'owner';
        } else {
          reviewerRole = 'owner';
          reviewedRole = 'walker';
        }
      }
    } else {
      return NextResponse.json({ error: 'Invalid post type for review' }, { status: 400 });
    }

    // Debug logging
    // Debug logging removed for production
// Validate roles
    if (!['owner', 'walker'].includes(reviewerRole)) {
      return NextResponse.json(
        { error: `Invalid reviewer role: ${reviewerRole}` },
        { status: 400 }
      );
    }
    if (!['owner', 'walker'].includes(reviewedRole)) {
      return NextResponse.json(
        { error: `Invalid reviewed role: ${reviewedRole}` },
        { status: 400 }
      );
    }

    // Check if user has already reviewed this meeting
    const { data: existingReviews, error: existingError } = await supabase
      .from('reviews')
      .select('id')
      .eq('meeting_id', meetingId)
      .eq('reviewer_id', user.id);

    if (existingError) throw existingError;

    if (existingReviews && existingReviews.length > 0) {
      return NextResponse.json(
        { error: 'You have already reviewed this meeting' },
        { status: 400 }
      );
    }

    // Create the review
    const reviewData = {
      meeting_id: meetingId,
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      reviewer_role: reviewerRole,
      reviewed_role: reviewedRole,
      rating,
      comment: comment.trim(),
    };

    // Debug logging removed for production
const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert(reviewData)
      .select(
        `
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(first_name, last_name, email, profile_photo_url),
        reviewee:profiles!reviews_reviewee_id_fkey(first_name, last_name, email, profile_photo_url),
        meeting:meetings(title, start_datetime, end_datetime)
      `
      )
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
      hint: error.hint,
    });
    return NextResponse.json(
      {
        error: 'Failed to create review',
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}
