import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import config from "@/config";

export const dynamic = "force-dynamic";

// This route is called after a successful login. It exchanges the code for a session and redirects to the callback URL (see config.js).
export async function GET(req) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // URL to redirect to after sign in process completes
  // Automatically detect environment and use appropriate domain
  const host = requestUrl.host;
  let origin;
  
  if (host.includes('localhost') || host.includes('127.0.0.1') || host.includes('192.168.')) {
    // Development environment - use current origin (including network IP)
    origin = requestUrl.origin;
  } else {
    // Production environment - use config domain
    origin = `https://${config.domainName}`;
  }
  
  return NextResponse.redirect(origin + config.auth.callbackUrl);
}
