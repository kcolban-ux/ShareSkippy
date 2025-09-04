'use client';

import { useState, useEffect } from 'react';

export default function UserReviews({ userId, showAll = false }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ averageRating: 0, reviewCount: 0, ratingDistribution: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (userId) {
      fetchReviews();
      fetchStats();
    }
  }, [userId]);

  const fetchReviews = async () => {
    try {
      const limit = showAll ? 50 : 5;
      const response = await fetch(`/api/reviews?userId=${userId}&limit=${limit}`);
      const data = await response.json();

      if (response.ok) {
        setReviews(data.reviews || []);
      } else {
        setError(data.error || 'Failed to fetch reviews');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setError('Failed to fetch reviews');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/reviews/stats?userId=${userId}`);
      const data = await response.json();

      if (response.ok) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching review stats:', error);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-lg ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-sm">
        {error}
      </div>
    );
  }

  if (stats.reviewCount === 0) {
    return (
      <div className="text-gray-500 text-sm">
        No reviews yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Rating Summary */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-bold text-gray-900">
            {stats.averageRating.toFixed(1)}
          </span>
          {renderStars(Math.round(stats.averageRating))}
        </div>
        <div className="text-sm text-gray-600">
          Based on {stats.reviewCount} review{stats.reviewCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Rating Distribution */}
      {stats.ratingDistribution && (
        <div className="space-y-1">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = stats.ratingDistribution[rating] || 0;
            const percentage = stats.reviewCount > 0 ? (count / stats.reviewCount) * 100 : 0;
            
            return (
              <div key={rating} className="flex items-center space-x-2 text-sm">
                <span className="w-4 text-gray-600">{rating}</span>
                <span className="text-yellow-400">★</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <span className="w-8 text-gray-600 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Individual Reviews */}
      {reviews.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">
            {showAll ? 'All Reviews' : 'Recent Reviews'}
          </h4>
          {reviews.map((review) => (
            <div key={review.id} className="border rounded-lg p-4 bg-white">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {renderStars(review.rating)}
                  <span className="text-sm text-gray-600">
                    {formatDate(review.created_at)}
                  </span>
                </div>
              </div>
              <p className="text-gray-800 mb-2">{review.comment}</p>
              <div className="text-xs text-gray-500">
                Meeting: {review.meeting?.title}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
