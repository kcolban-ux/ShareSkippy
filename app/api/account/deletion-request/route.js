import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';

// POST /api/account/deletion-request - Request account deletion
export async function POST(request) {
  try {
    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Check authentication
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reason } = body;

    // Check if user already has a pending deletion request
    const { data: existingRequest, error: checkError } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      throw checkError;
    }

    if (existingRequest) {
      return NextResponse.json(
        {
          error: 'You already have a pending account deletion request',
        },
        { status: 400 }
      );
    }

    // Create new deletion request
    const { data: deletionRequest, error: insertError } = await supabase
      .from('account_deletion_requests')
      .insert({
        user_id: user.id,
        reason: reason || null,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      deletionRequest,
      message:
        'Account deletion request submitted. Your account will be deleted in 30 days unless you cancel the request.',
    });
  } catch (error) {
    console.error('Error creating deletion request:', error);
    return NextResponse.json(
      {
        error: 'Failed to submit deletion request. Please try again.',
      },
      { status: 500 }
    );
  }
}

// GET /api/account/deletion-request - Get user's deletion request status
export async function GET() {
  try {
    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Log the authentication attempt for debugging
    // Debug logging removed for production
if (authError || !user) {
      // Debug logging removed for production
return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's deletion request status
    const { data: deletionRequest, error } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      throw error;
    }

    if (!deletionRequest) {
      return NextResponse.json({
        hasPendingRequest: false,
        deletionRequest: null,
      });
    }

    // Calculate days remaining
    const now = new Date();
    const scheduledDate = new Date(deletionRequest.scheduled_deletion_date);
    const daysRemaining = Math.ceil((scheduledDate - now) / (1000 * 60 * 60 * 24));

    return NextResponse.json({
      hasPendingRequest: true,
      deletionRequest: {
        ...deletionRequest,
        daysRemaining: Math.max(0, daysRemaining),
      },
    });
  } catch (error) {
    console.error('Error fetching deletion request:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch deletion request status',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/account/deletion-request - Cancel deletion request
export async function DELETE() {
  const startTime = Date.now();

  try {
    // Debug logging removed for production
const supabase = createClient();

    // Check authentication with timeout
    const authPromise = supabase.auth.getUser();
    const authTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Authentication timeout')), 5000)
    );

    const {
      data: { user },
      error: authError,
    } = await Promise.race([authPromise, authTimeout]);

    if (authError || !user) {
      // Debug logging removed for production
return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Debug logging removed for production
// When cancelling, we need to start a new 30-day countdown
    // So we update the scheduled_deletion_date to 30 days from now
    const newScheduledDate = new Date();
    newScheduledDate.setDate(newScheduledDate.getDate() + 30);

    const { data: updatedRequest, error: updateError } = await supabase
      .from('account_deletion_requests')
      .update({
        scheduled_deletion_date: newScheduledDate.toISOString(),
        processed_at: null, // Reset processed_at since we're starting fresh
      })
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .select()
      .single();

    if (updateError) {
      console.error('Update error details:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
      });

      // Handle specific error cases
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          {
            error: 'No pending deletion request found to cancel',
          },
          { status: 404 }
        );
      }

      if (updateError.code === '23505') {
        // Unique constraint violation
        return NextResponse.json(
          {
            error: 'Database constraint error. Please contact support.',
          },
          { status: 500 }
        );
      }

      throw updateError;
    }

    if (!updatedRequest) {
      return NextResponse.json(
        {
          error: 'No pending deletion request found to cancel',
        },
        { status: 404 }
      );
    }

    const duration = Date.now() - startTime;
    // Debug logging removed for production
return NextResponse.json({
      success: true,
      message:
        'Account deletion request cancelled successfully. A new 30-day countdown has started.',
      duration: duration,
      newScheduledDate: newScheduledDate.toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Error cancelling deletion request:', {
      error: error.message,
      duration: duration,
      stack: error.stack,
    });

    // Return more specific error messages
    if (error.message.includes('timeout')) {
      return NextResponse.json(
        {
          error: 'Request timed out. Please try again.',
        },
        { status: 408 }
      );
    }

    if (error.message.includes('constraint')) {
      return NextResponse.json(
        {
          error: 'Database constraint error. Please contact support.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to cancel deletion request. Please try again.',
      },
      { status: 500 }
    );
  }
}
