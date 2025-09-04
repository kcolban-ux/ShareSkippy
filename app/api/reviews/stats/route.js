import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/reviews/stats - Get review statistics for a user
export async function GET(request) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || user.id;

    // Get average rating and review count using database functions
    const { data: avgRating, error: avgError } = await supabase
      .rpc('get_user_average_rating', { user_id: userId });

    if (avgError) throw avgError;

    const { data: reviewCount, error: countError } = await supabase
      .rpc('get_user_review_count', { user_id: userId });

    if (countError) throw countError;

    // Get rating distribution
    const { data: ratingDistribution, error: distError } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', userId);

    if (distError) throw distError;

    // Calculate rating distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingDistribution.forEach(review => {
      distribution[review.rating]++;
    });

    return NextResponse.json({
      averageRating: avgRating || 0,
      reviewCount: reviewCount || 0,
      ratingDistribution: distribution
    });
  } catch (error) {
    console.error('Error fetching review stats:', error);
    return NextResponse.json({ error: 'Failed to fetch review stats' }, { status: 500 });
  }
}
