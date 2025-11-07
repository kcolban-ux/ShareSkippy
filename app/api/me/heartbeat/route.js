import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';

export async function POST(request) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Throttle: Only update if last update was more than 5 minutes ago
    // This prevents excessive database writes
    const { data: profile } = await supabase
      .from('profiles')
      .select('last_active_at')
      .eq('id', user.id)
      .single();

    if (profile?.last_active_at) {
      const lastUpdate = new Date(profile.last_active_at);
      const now = new Date();
      const minutesSinceUpdate = (now - lastUpdate) / (1000 * 60);
      
      // Only update if more than 5 minutes have passed
      if (minutesSinceUpdate < 5) {
        return NextResponse.json({ 
          success: true, 
          throttled: true,
          message: 'Update throttled' 
        });
      }
    }

    // Update last_active_at
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ last_active_at: now })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating heartbeat:', updateError);
      return NextResponse.json({ error: 'Failed to update heartbeat' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      last_active_at: now
    });

  } catch (error) {
    console.error('Error in heartbeat endpoint:', error);
    return NextResponse.json({ error: 'Failed to update heartbeat' }, { status: 500 });
  }
}

