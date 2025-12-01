'use client';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/libs/supabase/client';
import Image from 'next/image';

export default function UserRatingsEnhanced({ userId, userRole }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;
    loadReviews();
  }, [userId, loadReviews]);

  const loadReviews = useCallback(async () => {
    try {
      const supabase = createClient();

      // Load reviews based on user role
      let query = supabase.from('reviews').select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(first_name, last_name, email, profile_photo_url),
          reviewee:profiles!reviews_reviewee_id_fkey(first_name, last_name, email, profile_photo_url)
        `);

      if (userRole === 'owner') {
        // For dog owners, show reviews they've received
        query = query.eq('reviewee_id', userId);
      } else if (userRole === 'sitter') {
        // For dog sitters, show reviews they've received
        query = query.eq('reviewee_id', userId);
      } else {
        // For other roles, show all reviews
        query = query.or(`reviewer_id.eq.${userId},reviewee_id.eq.${userId}`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      setReviews(data || []);
    } catch (err) {
      console.error('Error loading reviews:', err);
      setError('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [userId, userRole]);

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-300'}>
        ★
      </span>
    ));
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-sm text-gray-600">Loading reviews...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={loadReviews} className="mt-2 text-sm text-blue-600 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-6 bg-gray-50 rounded-lg">
        <div className="text-gray-400 text-4xl mb-2">⭐</div>
        <p className="text-gray-600 text-sm">
          {userRole === 'owner' || userRole === 'sitter'
            ? 'No reviews yet. Start connecting with the community to receive reviews!'
            : 'No reviews yet.'}
        </p>
      </div>
    );
  }

  // Calculate average rating
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-800">
              {reviews.length} review{reviews.length !== 1 ? 's' : ''}
            </h4>
            <div className="flex items-center mt-1">
              <div className="flex mr-2">{renderStars(Math.round(averageRating))}</div>
              <span className="text-sm text-gray-600">{averageRating.toFixed(1)} average</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{averageRating.toFixed(1)}</div>
            <div className="text-xs text-gray-500">out of 5</div>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {reviews.map((review) => (
          <div key={review.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center">
                {review.reviewer?.profile_photo_url && (
                  <Image
                    src={review.reviewer.profile_photo_url}
                    alt="Reviewer"
                    className="w-8 h-8 rounded-full mr-3 object-cover"
                    unoptimized
                  />
                )}
                <div>
                  <p className="font-medium text-gray-800">
                    {review.reviewer?.full_name || 'Anonymous'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex">{renderStars(review.rating)}</div>
            </div>

            {review.comment && (
              <p className="text-gray-700 text-sm leading-relaxed">
                &ldquo;{review.comment}&rdquo;
              </p>
            )}

            {review.review_type && (
              <div className="mt-2">
                <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded-sm text-xs">
                  {review.review_type === 'dog_sitting' && '🐕 Dog Sitting'}
                  {review.review_type === 'dog_walking' && '🚶 Dog Walking'}
                  {review.review_type === 'dog_boarding' && '🏠 Dog Boarding'}
                  {review.review_type === 'other' && '🤝 Other'}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
