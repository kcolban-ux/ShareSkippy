import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import config from "@/config";

export default async function CommunityLayout({ children }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Temporarily allow unauthenticated access for testing
  // if (!user) {
  //   redirect(config.auth.loginUrl);
  // }

  return <>{children}</>;
}
