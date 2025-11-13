'use client';

// #region Imports

import React, { type ReactElement } from 'react';
import { useUserReviews } from '@/hooks/useReviews';

// #endregion

// #region Type Definitions

/**
 * @description Represents a single user review.
 */
interface Review {
  id: string | number;
  rating: number;
  created_at: string; // ISO date string
  comment: string;
  meeting?: {
    title: string;
  };
}

/**
 * @description Maps a numeric rating (e.g., 5) to the count of reviews with that rating.
 */
interface RatingDistribution {
  [key: number]: number;
}

/**
 * @description Holds the aggregated statistics for a user's reviews.
 */
interface ReviewStats {
  averageRating: number;
  reviewCount: number;
  ratingDistribution: RatingDistribution;
}

/**
 * @description The shape of the data object returned from the `useUserReviews` hook.
 */
interface UserReviewsData {
  reviews: Review[];
  stats: ReviewStats;
}

/**
 * @description Defines the props accepted by the UserReviews component.
 */
interface UserReviewsProps {
  /**
   * @description The ID of the profile to fetch reviews for.
   */
  profileId: string;
  /**
   * @description Flag to determine whether to show all reviews or a summary.
   * @default false
   */
  showAll?: boolean;
}

// #endregion

// #region Helper Functions

/**
 * @description Renders a 5-star rating display.
 * @param {number} rating - The rating number (1-5).
 * @returns {ReactElement} The JSX for the stars.
 */
const renderStars = (rating: number): ReactElement => {
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star: number) => (
        <span
          key={star}
          className={`text-lg ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
        >
          ★
        </span>
      ))}
    </div>
  );
};

/**
 * @description Formats a date string into a short, readable format.
 * @param {string} dateString - The ISO date string.
 * @returns {string} The formatted date.
 */
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// #endregion

// #region Component

/**
 * @description Renders the reviews and rating summary for a user.
 * @param {UserReviewsProps} props - Component props.
 * @returns {ReactElement} The rendered component.
 */
const UserReviews = React.memo(({ profileId, showAll = false }: UserReviewsProps): ReactElement => {
  // #region Data Fetching

  // Assume the hook returns data matching our defined types
  const { data, isLoading, error } = useUserReviews(profileId, showAll) as {
    data: UserReviewsData | undefined;
    isLoading: boolean;
    error: string | null;
  };

  // #endregion

  // #region Render Logic: Loading

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded-sm w-1/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded-sm w-1/2 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i: number) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded-sm w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded-sm w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded-sm w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // #endregion

  // #region Render Logic: Error

  if (error) {
    return <div className="text-red-600 text-sm">{error}</div>;
  }

  // #endregion

  // #region Data Preparation

  const reviews: Review[] = data?.reviews || [];
  const stats: ReviewStats = data?.stats || {
    averageRating: 0,
    reviewCount: 0,
    ratingDistribution: {},
  };

  // #endregion

  // #region Render Logic: No Reviews

  if (reviews.length === 0 && stats.reviewCount === 0) {
    return <div className="text-gray-500 text-sm">No reviews yet</div>;
  }

  // #endregion

  // #region Render Logic: Main

  return (
    <div className="space-y-4">
      {/* Rating Summary */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-bold text-gray-900">{stats.averageRating.toFixed(1)}</span>
          {renderStars(Math.round(stats.averageRating))}
        </div>
        <div className="text-sm text-gray-600">
          Based on {stats.reviewCount} review
          {stats.reviewCount === 1 ? '' : 's'}
        </div>
      </div>

      {/* Rating Distribution */}
      {stats.ratingDistribution && (
        <div className="space-y-1">
          {[5, 4, 3, 2, 1].map((rating: number) => {
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
          {reviews.map((review: Review) => (
            <div key={review.id} className="border rounded-lg p-4 bg-white">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {renderStars(review.rating)}
                  <span className="text-sm text-gray-600">{formatDate(review.created_at)}</span>
                </div>
              </div>
              <p className="text-gray-800 mb-2">{review.comment}</p>
              <div className="text-xs text-gray-500">
                {/* Use optional chaining in case meeting is null */}
                Meeting: {review.meeting?.title}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // #endregion
});

UserReviews.displayName = 'UserReviews';

export default UserReviews;

// #endregion
