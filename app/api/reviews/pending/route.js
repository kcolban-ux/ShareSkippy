import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/reviews/pending - Get pending reviews for the current user
export async function GET(request) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use the database function to get pending reviews
    const { data: pendingReviews, error } = await supabase
      .rpc('get_pending_reviews_for_user', { user_id: user.id });

    if (error) throw error;

    return NextResponse.json({ pendingReviews });
  } catch (error) {
    console.error('Error fetching pending reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch pending reviews' }, { status: 500 });
  }
}
