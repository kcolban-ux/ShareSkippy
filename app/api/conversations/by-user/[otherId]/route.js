import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';

export async function GET(request, { params }) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { otherId } = params;

    if (!otherId) {
      return NextResponse.json({ error: 'Other user ID required' }, { status: 400 });
    }

    // Normalize participant order (canonical: p1 < p2)
    const p1_id = user.id < otherId ? user.id : otherId;
    const p2_id = user.id < otherId ? otherId : user.id;

    // Find conversation between these two users
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('id')
      .eq('participant1_id', p1_id)
      .eq('participant2_id', p2_id)
      .is('availability_id', null)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching conversation:', error);
      return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
    }

    return NextResponse.json({ 
      conversationId: conversation?.id || null 
    });

  } catch (error) {
    console.error('Error in by-user endpoint:', error);
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}

