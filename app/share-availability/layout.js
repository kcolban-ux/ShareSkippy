import { redirect } from 'next/navigation';
import { createClient } from '@/libs/supabase/server';
import config from '@/config';

export default async function ShareAvailabilityLayout({ children }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(config.auth.loginUrl);
  }

  return <>{children}</>;
}
