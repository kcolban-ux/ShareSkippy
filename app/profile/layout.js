import { redirect } from 'next/navigation';
import { createClient } from '@/libs/supabase/server';
import config from '@/config';

// This is a server-side component to ensure the user is logged in.
// If not, it will redirect to the login page.
export default async function ProfileLayout({ children }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(config.auth.loginUrl);
  }

  return <>{children}</>;
}
