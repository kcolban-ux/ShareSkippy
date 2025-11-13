import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();

    // This endpoint can be called by a cron job or scheduled task
    // to automatically update meeting statuses to completed

    // Update meetings that have passed their end time
    const { data: updatedMeetings, error: updateError } = await supabase
      .from('meetings')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('status', 'scheduled')
      .lt('end_datetime', new Date().toISOString())
      .select('*');

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      updatedCount: updatedMeetings?.length || 0,
      updatedMeetings,
    });
  } catch (error) {
    console.error('Error updating meeting statuses:', error);
    return NextResponse.json({ error: 'Failed to update meeting statuses' }, { status: 500 });
  }
}
