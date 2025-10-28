# Review System Implementation

## Overview

A comprehensive review system has been implemented for meetings between users. Users can leave 1-5 star reviews with comments (minimum 5 words) for completed meetings, and these reviews are displayed publicly on user profiles.

## Features Implemented

### 1. Database Schema

- **File**: `reviews_migration.sql`
- **Features**:
  - `reviews` table with proper relationships to meetings and profiles
  - RLS policies for public viewing and secure creation/editing
  - Database functions for calculating average ratings and pending reviews
  - Automatic timestamp updates
  - Unique constraints to prevent duplicate reviews

### 2. API Endpoints

- **Files**:
  - `app/api/reviews/route.js` (GET, POST)
  - `app/api/reviews/[id]/route.js` (GET, PATCH, DELETE)
  - `app/api/reviews/pending/route.js` (GET)
  - `app/api/reviews/stats/route.js` (GET)
- **Features**:
  - Create reviews for completed meetings (immediately after end)
  - Fetch reviews for specific users or all reviews
  - Update/delete own reviews
  - Get pending reviews for current user
  - Get review statistics (average rating, count, distribution)

### 3. UI Components

- **Files**:
  - `components/ReviewModal.js` - Modal for leaving reviews
  - `components/ReviewBanner.js` - Banner notification for pending reviews
  - `components/UserReviews.js` - Display user reviews and ratings
- **Features**:
  - Star rating system (1-5 stars)
  - Comment validation (minimum 5 words)
  - Responsive design with white backgrounds for input fields
  - Rating distribution visualization
  - Anonymous review display

### 4. Integration

- **Files**:
  - `components/AppLayout.js` - Global review banner and modal
  - `app/profile/page.js` - User's own reviews
  - `app/community/availability/[id]/page.js` - Other users' reviews
- **Features**:
  - Banner appears for logged-in users with pending reviews
  - Reviews shown on user profiles (own and others')
  - Automatic refresh after review submission

## Setup Instructions

### 1. Database Setup

Run the SQL migration in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of reviews_migration.sql
```

### 2. Meeting Status Automation

The system automatically marks meetings as "completed" when their end time passes. This is handled by existing functions in the meetings system.

### 3. Review Flow

1. Meeting occurs and status changes to "completed"
2. Immediately after meeting ends, users can leave reviews
3. Banner notification appears when users open the app
4. Users can click to leave reviews via modal
5. Reviews are displayed publicly on profiles

## Key Features

### Review Requirements

- Only completed meetings can be reviewed
- Reviews can be left immediately after meeting ends
- 1-5 star rating required
- Comment with minimum 5 words required
- One review per user per meeting

### Privacy & Security

- Reviews are public (RLS allows anyone to view)
- Users can only create reviews for meetings they participated in
- Users can only edit/delete their own reviews
- Anonymous display (reviewer names not shown in public reviews)

### User Experience

- Persistent banner reminders for pending reviews
- Dismissible notifications
- Star rating with visual feedback
- Word count indicator for comments
- Responsive design for all screen sizes

## API Usage Examples

### Get Pending Reviews

```javascript
const response = await fetch('/api/reviews/pending');
const { pendingReviews } = await response.json();
```

### Create Review

```javascript
const response = await fetch('/api/reviews', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    meetingId: 'meeting-uuid',
    rating: 5,
    comment: 'Great meeting, very helpful and friendly person',
  }),
});
```

### Get User Reviews

```javascript
const response = await fetch('/api/reviews?userId=user-uuid&limit=10');
const { reviews } = await response.json();
```

### Get Review Statistics

```javascript
const response = await fetch('/api/reviews/stats?userId=user-uuid');
const { averageRating, reviewCount, ratingDistribution } = await response.json();
```

## Database Functions

### `get_pending_reviews_for_user(user_id)`

Returns meetings that need reviews from the specified user.

### `get_user_average_rating(user_id)`

Returns the average rating for a user (rounded to 2 decimal places).

### `get_user_review_count(user_id)`

Returns the total number of reviews received by a user.

## Security Considerations

- All API endpoints require authentication
- RLS policies ensure users can only review their own meetings
- Input validation on both client and server
- SQL injection protection through parameterized queries
- XSS protection through proper data sanitization

## Future Enhancements

Potential improvements that could be added:

- Review moderation system
- Review response feature
- Review categories (helpfulness, communication, etc.)
- Email notifications for new reviews
- Review analytics dashboard
- Bulk review management

## Testing

To test the system:

1. Create a meeting between two users
2. Mark the meeting as completed
3. Wait 24 hours (or manually adjust the database)
4. Check for pending review banner
5. Submit a review
6. Verify review appears on user profiles

The review system is now fully functional and ready for use!
