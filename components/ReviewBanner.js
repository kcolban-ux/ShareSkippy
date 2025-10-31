'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/libs/supabase/client';

export default function ReviewBanner({ onReviewClick }) {
  const [pendingReviews, setPendingReviews] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPendingReviews();
  }, []);

  const fetchPendingReviews = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/reviews/pending');
      const data = await response.json();

      if (response.ok) {
        setPendingReviews(data.pendingReviews || []);
        setIsVisible(data.pendingReviews && data.pendingReviews.length > 0);
      }
    } catch (error) {
      console.error('Error fetching pending reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const handleReviewClick = (review) => {
    if (onReviewClick) {
      onReviewClick(review);
    }
  };

  if (isLoading || !isVisible || pendingReviews.length === 0) {
    return null;
  }

  const reviewCount = pendingReviews.length;
  const firstReview = pendingReviews[0];

  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
      <div className="flex items-start">
        <div className="shrink-0">
          <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-800">
                {reviewCount === 1 
                  ? 'You have a pending review'
                  : `You have ${reviewCount} pending reviews`
                }
              </h3>
              <div className="mt-1 text-sm text-blue-700">
                {reviewCount === 1 ? (
                  <p>
                    Please leave a review for your meeting with{' '}
                    <span className="font-medium">{firstReview.other_participant_name}</span>
                  </p>
                ) : (
                  <p>
                    Please leave reviews for your recent meetings
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleReviewClick(firstReview)}
                className="bg-blue-600 text-white px-3 py-1 rounded-sm text-sm font-medium hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {reviewCount === 1 ? 'Leave Review' : 'Review Now'}
              </button>
              <button
                onClick={handleDismiss}
                className="text-blue-400 hover:text-blue-600"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
