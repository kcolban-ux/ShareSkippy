# Availability Table Setup Guide

## Problem

The "My Availability" tab in the Community page is not showing posts because the `availability` table doesn't exist in your database.

## Solution

### Step 1: Create the Availability Table

1. **Go to your Supabase Dashboard**
   - Navigate to your project
   - Go to the SQL Editor

2. **Run the Migration Script**
   Copy and paste the contents of `availability_migration.sql` into the SQL Editor and run it.

   This will:
   - Create the `availability` table with all necessary columns
   - Enable Row Level Security (RLS)
   - Create appropriate policies for data access
   - Verify the table was created successfully

### Step 2: Verify the Setup

After running the migration, you should see output showing all the columns in the availability table.

### Step 3: Test the Functionality

1. **Refresh your application**
2. **Go to the Community page**
3. **Click on the "My Availability" tab**
4. **Create a new availability post** using the "Create New Post" button
5. **Verify your post appears** in the "My Availability" section

## What the Availability Table Includes

The table supports:

- **Post Types**: Dog availability and PetPal availability
- **Location Data**: Profile location or custom meeting location
- **Scheduling**: Day and time availability with JSONB storage
- **Community Support**: Help preferences and support needs
- **Transportation**: Drop-off and pick-up capabilities
- **Status Management**: Active, inactive, or completed posts

## Database Schema

The availability table includes these key fields:

```sql
- id: UUID primary key
- owner_id: References profiles table
- dog_id: References dogs table (for dog availability posts)
- post_type: 'dog_available' or 'petpal_available'
- title: Post title
- description: Post description
- enabled_days: Array of available days
- day_schedules: JSONB with detailed time slots
- status: 'active', 'inactive', or 'completed'
- location fields: Profile or custom location data
- community support fields: Help preferences and needs
```

## Row Level Security Policies

The table includes these RLS policies:

- **View all active posts**: Anyone can view active availability posts
- **View own posts**: Users can view their own posts regardless of status
- **Create own posts**: Users can only create posts for themselves
- **Update own posts**: Users can only update their own posts
- **Delete own posts**: Users can only delete their own posts

## Troubleshooting

If you encounter issues:

1. **Check the browser console** for any error messages
2. **Verify the table exists** by running the verification query in the migration
3. **Check RLS policies** are properly applied
4. **Ensure user authentication** is working correctly

## Next Steps

After setting up the availability table:

1. Users can create availability posts
2. Posts will appear in the "My Availability" tab
3. Posts will also appear in the appropriate community tabs (Dog/PetPal Availability)
4. Users can manage their posts (edit, activate/deactivate, delete)

The availability system is now fully functional and ready for community use!
