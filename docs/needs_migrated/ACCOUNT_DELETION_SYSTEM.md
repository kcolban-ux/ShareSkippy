# Account Deletion System with 30-Day Waiting Period

This document describes the implementation of a secure account deletion system that requires a 30-day waiting period to prevent fraud and protect the community.

## Overview

The system replaces immediate account deletion with a request-based approach:

1. Users request account deletion
2. 30-day waiting period begins
3. Users can cancel the request at any time
4. After 30 days, accounts are automatically processed for deletion
5. Admin oversight and monitoring capabilities

## Features

### User Features

- **Request Deletion**: Users can request account deletion with optional reason
- **30-Day Waiting Period**: Prevents immediate deletion to combat fraud
- **Cancel Anytime**: Users can cancel deletion requests before the 30-day period
- **Status Display**: Clear indication of deletion status on profile page
- **Urgency Warnings**: Visual warnings as deletion date approaches
- **Account Recreation Prevention**: Users cannot recreate accounts with the same email after deletion

### Admin Features

- **Manual Processing**: Admin endpoint to process deletion requests
- **Automated Processing**: Cron job for automatic processing after 30 days
- **Monitoring**: Status endpoint to check pending deletions
- **Audit Trail**: Complete history of deletion requests and processing
- **Email Tracking**: Deleted email addresses are tracked to prevent recreation

## Database Schema

### `account_deletion_requests` Table

```sql
CREATE TABLE account_deletion_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  scheduled_deletion_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'cancelled', 'processing', 'completed')),
  reason TEXT,
  admin_notes TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### `deleted_emails` Table

```sql
CREATE TABLE deleted_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  original_user_id UUID,
  deletion_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

### User Endpoints

#### `POST /api/account/deletion-request`

Request account deletion

- **Body**: `{ "reason": "optional reason" }`
- **Response**: Confirmation with scheduled deletion date

#### `GET /api/account/deletion-request`

Get user's deletion request status

- **Response**: Current deletion status and days remaining

#### `DELETE /api/account/deletion-request`

Cancel deletion request

- **Response**: Confirmation of cancellation

### Admin Endpoints

#### `POST /api/admin/process-deletions`

Manually process deletion requests (admin only)

- **Response**: Processing results and statistics

#### `GET /api/admin/process-deletions`

View pending deletion requests (admin only)

- **Response**: List of pending requests with user details

### Cron Endpoint

#### `POST /api/cron/process-deletions`

Automated processing endpoint (requires CRON_SECRET_TOKEN)

- **Headers**: `Authorization: Bearer <CRON_SECRET_TOKEN>`
- **Response**: Processing results and statistics

#### `GET /api/cron/process-deletions`

Health check and status monitoring

- **Response**: System status and pending deletion counts

## Components

### `DeleteAccountModal`

Updated modal that:

- Explains the 30-day waiting period
- Collects optional deletion reason
- Submits deletion request instead of immediate deletion
- Shows success confirmation

### `DeletionRequestStatus`

Profile component that:

- Displays current deletion status
- Shows days remaining with color-coded urgency
- Provides cancel deletion button
- Shows deletion reason if provided

## Setup Instructions

### 1. Database Migration

Run the migration to create the `account_deletion_requests` table:

```bash
# Apply the migration
supabase db push
```

### 2. Environment Variables

Add to your `.env.local`:

```bash
CRON_SECRET_TOKEN=your_secure_random_token_here
```

Generate a secure token:

```bash
openssl rand -hex 32
```

### 3. Cron Job Setup

#### Option A: Vercel Cron Jobs (Recommended)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-deletions",
      "schedule": "0 2 * * *"
    }
  ]
}
```

#### Option B: GitHub Actions

Create `.github/workflows/process-deletions.yml`:

```yaml
name: Process Account Deletions
on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM UTC
jobs:
  process-deletions:
    runs-on: ubuntu-latest
    steps:
      - name: Process Deletions
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET_TOKEN }}" \
            "${{ secrets.APP_URL }}/api/cron/process-deletions"
```

#### Option C: External Cron Service

Use services like cron-job.org:

- **URL**: `https://your-domain.com/api/cron/process-deletions`
- **Method**: POST
- **Headers**: `Authorization: Bearer <your_token>`
- **Schedule**: Daily at 2 AM

### 4. Admin Role Setup

Ensure admin users have `role: 'admin'` in their profile:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'admin@yourdomain.com';
```

## Account Recreation Prevention

### How It Works

When a user's account is deleted, their email address is permanently recorded in the `deleted_emails` table. The system prevents anyone from creating a new account with that same email address, even after the original account is completely removed from Supabase Auth.

### Technical Implementation

1. **Email Recording**: Before account deletion, the user's email is stored in `deleted_emails` table
2. **Database Trigger**: The `handle_new_user()` function checks if an email was previously deleted
3. **Blocking**: If a deleted email is detected, account creation is blocked with an error message
4. **Case Insensitive**: Email matching is case-insensitive and trims whitespace

### User Experience

- **Clear Warnings**: Users see prominent warnings about not being able to recreate accounts
- **Multiple Reminders**: Warnings appear in deletion modal, status display, and success message
- **Error Messages**: Clear error messages if someone tries to recreate with a deleted email

## Security Considerations

### Fraud Prevention

- **30-day waiting period** prevents immediate account deletion
- **Account recreation prevention** stops users from avoiding bad reviews by creating new accounts
- **Audit trail** tracks all deletion requests and processing
- **Admin oversight** allows manual review of suspicious requests

### Data Protection

- **Cascade deletion** ensures all related data is removed
- **Secure processing** with authentication tokens
- **Error handling** prevents partial deletions

### Monitoring

- **Status endpoints** for health monitoring
- **Logging** of all processing activities
- **Error tracking** for failed deletions

## User Experience

### Deletion Request Flow

1. User clicks "Delete Account" button
2. Modal explains 30-day waiting period
3. User can provide optional reason
4. Request is submitted and scheduled
5. User sees confirmation with deletion date

### Status Display

- **Profile page** shows deletion status prominently
- **Color-coded urgency** (yellow → orange → red)
- **Days remaining** countdown
- **Cancel button** always available

### Cancellation Flow

1. User clicks "Cancel Deletion" on profile
2. Confirmation dialog appears
3. Request is cancelled immediately
4. Status updates to show no pending deletion

## Monitoring and Maintenance

### Health Checks

Monitor the cron endpoint:

```bash
curl https://your-domain.com/api/cron/process-deletions
```

### Log Monitoring

Check logs for:

- Failed deletion processing
- Authentication errors
- Database connection issues

### Manual Processing

If automated processing fails, use admin endpoint:

```bash
curl -X POST \
  -H "Authorization: Bearer <admin_token>" \
  https://your-domain.com/api/admin/process-deletions
```

## Testing

### Test Deletion Request

1. Create a test user account
2. Request account deletion
3. Verify 30-day schedule is set
4. Test cancellation functionality
5. Verify status display on profile

### Test Processing

1. Create deletion request with past date
2. Run manual processing endpoint
3. Verify account is deleted
4. Check audit trail

## Troubleshooting

### Common Issues

#### "Failed to delete account" Error

- Check if user already has pending deletion request
- Verify database connection
- Check RLS policies

#### Cron Job Not Running

- Verify CRON_SECRET_TOKEN is set
- Check cron job configuration
- Monitor logs for authentication errors

#### Admin Access Denied

- Ensure user has `role: 'admin'` in profile
- Check authentication status
- Verify admin endpoint permissions

### Debug Commands

```bash
# Check pending deletions
curl https://your-domain.com/api/cron/process-deletions

# Test admin access
curl -H "Authorization: Bearer <token>" \
  https://your-domain.com/api/admin/process-deletions

# Check user deletion status
curl -H "Authorization: Bearer <user_token>" \
  https://your-domain.com/api/account/deletion-request
```

## Future Enhancements

### Potential Improvements

- **Email notifications** for deletion reminders
- **Bulk processing** for multiple deletions
- **Advanced admin dashboard** for deletion management
- **Integration with external fraud detection** services
- **Customizable waiting periods** per user type
- **Data export** before deletion for user requests

### Analytics

- Track deletion request patterns
- Monitor cancellation rates
- Analyze deletion reasons for insights
- Measure fraud prevention effectiveness
