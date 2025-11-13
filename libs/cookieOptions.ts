/**
 * Gets the correct cookie options based on the environment.
 *
 * - 'production': Sets a root domain (e.g., .shareskippy.com) to allow
 * cookies to be shared between 'www' and the root domain.
 *
 * - 'preview'/'development': Returns 'undefined' for the domain. This forces
 * the browser to set the cookie on the *exact* host (e.g.,
 * 'my-branch.vercel.app' or 'localhost'), which is required for
 * Vercel previews and local testing to work.
 */
export const getCookieOptions = () => {
  const isProduction = process.env.VERCEL_ENV === "production";

  // Check if the site URL is HTTPS (Vercel previews are)
  // This is safer for localhost http testing
  const isSecure = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost")
    .startsWith("https");

  if (isProduction) {
    return {
      domain: ".shareskippy.com",
      path: "/",
      sameSite: "lax",
      secure: true,
    };
  }

  // For Vercel previews and local development
  return {
    domain: undefined,
    path: "/",
    sameSite: "lax",
    secure: isSecure,
  };
};
