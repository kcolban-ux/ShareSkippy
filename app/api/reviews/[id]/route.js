import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/reviews/[id] - Get a specific review
export async function GET(request, { params }) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const { data: review, error } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(name, avatar_url),
        reviewee:profiles!reviews_reviewee_id_fkey(name, avatar_url),
        meeting:meetings(title, start_datetime, end_datetime)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return NextResponse.json({ review });
  } catch (error) {
    console.error('Error fetching review:', error);
    return NextResponse.json({ error: 'Failed to fetch review' }, { status: 500 });
  }
}

// PATCH /api/reviews/[id] - Update a review
export async function PATCH(request, { params }) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { rating, comment } = await request.json();

    // Validate input
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    if (comment !== undefined && comment.trim().length < 5) {
      return NextResponse.json({ error: 'Comment must be at least 5 words' }, { status: 400 });
    }

    // Get current review to check ownership
    const { data: currentReview, error: fetchError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Check if user owns this review
    if (currentReview.reviewer_id !== user.id) {
      return NextResponse.json({ error: 'You can only update your own reviews' }, { status: 403 });
    }

    // Prepare update data
    const updateData = {};
    if (rating !== undefined) updateData.rating = rating;
    if (comment !== undefined) updateData.comment = comment.trim();

    // Update the review
    const { data: review, error: updateError } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(name, avatar_url),
        reviewee:profiles!reviews_reviewee_id_fkey(name, avatar_url),
        meeting:meetings(title, start_datetime, end_datetime)
      `)
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ review });
  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

// DELETE /api/reviews/[id] - Delete a review
export async function DELETE(request, { params }) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Get current review to check ownership
    const { data: currentReview, error: fetchError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Check if user owns this review
    if (currentReview.reviewer_id !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own reviews' }, { status: 403 });
    }

    // Delete the review
    const { error: deleteError } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}
