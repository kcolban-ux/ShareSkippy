import { createClient } from '@/libs/supabase/server';

export async function POST(request) {
  try {
    const supabase = createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Test inserting a simple availability record
    const testData = {
      owner_id: user.id,
      post_type: 'petpal_available',
      title: 'Test Availability',
      start_date: '2024-01-01',
      end_date: '2024-01-31',
      enabled_days: ['monday', 'tuesday'],
      day_schedules: {
        monday: { enabled: true, timeSlots: [{ start: '09:00', end: '17:00' }] }
      }
    };

    const { data, error } = await supabase
      .from('availability')
      .insert(testData)
      .select();

    if (error) {
      console.error('Database error:', error);
      return Response.json({ 
        error: 'Database error', 
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 });
    }

    // Clean up test data
    await supabase
      .from('availability')
      .delete()
      .eq('id', data[0].id);

    return Response.json({ 
      success: true, 
      message: 'Availability table is working correctly',
      testData: data[0]
    });

  } catch (error) {
    console.error('API error:', error);
    return Response.json({ 
      error: 'API error', 
      details: error.message 
    }, { status: 500 });
  }
}
