import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Unable to sign out on server:', error.message);
    return NextResponse.json({ error: error.message || 'Server logout failed.' }, { status: 500 });
  }

  return NextResponse.json({ error: null });
}
